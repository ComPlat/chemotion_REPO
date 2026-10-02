# frozen_string_literal: true

# rubocop:disable Metrics/ModuleLength
# Materialized-view-backed counterpart to `RepoSearchFacetHelpers`. Same
# public method names, same return shapes, but every filter and facet
# aggregation runs against `v_publication_search` (snapshot UNION delta)
# instead of joining live publications + samples + molecules + reactions
# on every request.
#
# This module *includes* `RepoSearchFacetHelpers` and overrides each
# method with a runtime flag check: when `RepoSearchConfig.use_mv` is
# true, the MV path runs; otherwise `super` falls through to the live
# implementation. The Grape API only needs `helpers RepoSearchFacetHelpersMv`
# — the live module comes along via `include`.
module RepoSearchFacetHelpersMv
  extend Grape::API::Helpers
  include RepoSearchFacetHelpers

  SUPPORTED_ELEMENT_TYPES = RepoSearchFacetHelpers::SUPPORTED_ELEMENT_TYPES
  DEFAULT_FACET_VALUE_LIMIT = RepoSearchFacetHelpers::DEFAULT_FACET_VALUE_LIMIT
  MAX_FACET_VALUE_LIMIT = RepoSearchFacetHelpers::MAX_FACET_VALUE_LIMIT

  def repo_search_use_mv?
    RepoSearchConfig.use_mv == true
  end

  # ------------------------------------------------------------------
  # Filter scope
  # ------------------------------------------------------------------

  def base_publication_scope
    return super unless repo_search_use_mv?

    VPublicationSearch.where(element_type: SUPPORTED_ELEMENT_TYPES)
  end

  def apply_filters(scope, filters, structure_sample_ids: nil)
    return super unless repo_search_use_mv?

    scope = filter_by_years(scope, filters[:years])
    scope = filter_by_authors(scope, filters[:authors])
    scope = filter_by_contributors(scope, filters[:contributors])
    scope = filter_by_institutions(scope, filters[:institutions])
    scope = filter_by_ontologies(scope, filters[:ontologies])
    scope = filter_by_reaction_types(scope, filters[:reaction_types])
    scope = filter_by_embargoes(scope, filters[:embargoes])
    scope = filter_by_element_group(scope, filters[:element_types], filters[:scheme_only])
    scope = filter_by_text(scope, filters[:q])
    filter_by_structure(scope, structure_sample_ids)
  end

  # See the live impl: "Reaction" means full reactions only; scheme-only
  # reactions are a sibling choice gated by the scheme_only flag, so picking
  # Reaction without scheme_only must exclude them. The MV's scheme_only
  # column is COALESCEd to FALSE, so samples (FALSE) are never dropped.
  def filter_by_element_group(scope, types, scheme_only)
    return super unless repo_search_use_mv?

    mv_filter_by_element_group(scope, types, scheme_only)
  end

  def mv_filter_by_element_group(scope, types, scheme_only)
    type_list = Array(types).map(&:to_s).select { |t| SUPPORTED_ELEMENT_TYPES.include?(t) }
    return mv_element_or_scheme_scope(scope, type_list) if scheme_only == true

    exclude_scheme = scheme_only == false || type_list.include?('Reaction')
    scope = filter_by_scheme_only(scope, false) if exclude_scheme
    type_list.any? ? scope.where(element_type: type_list) : scope
  end

  MV_SCHEME_ONLY_TRUE_CLAUSE = "(element_type = 'Reaction' AND scheme_only = TRUE)"

  def mv_element_or_scheme_scope(scope, type_list)
    return scope.where(MV_SCHEME_ONLY_TRUE_CLAUSE) if type_list.empty?

    scope.where("element_type IN (?) OR #{MV_SCHEME_ONLY_TRUE_CLAUSE}", type_list)
  end

  def filter_by_scheme_only(scope, flag)
    return super unless repo_search_use_mv?
    return scope if flag.nil?

    scope.where(scheme_only: flag ? true : false)
  end

  def scheme_only_clause(value: true)
    return super unless repo_search_use_mv?

    "scheme_only = #{value ? 'TRUE' : 'FALSE'}"
  end

  def filter_by_text(scope, query)
    return super unless repo_search_use_mv?
    return scope if query.blank?

    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, query.to_s.strip)}%"
    return scope if like.length <= 2

    scope.where(<<~SQL.squish, like, like, like, like, like)
      (mol_iupac_name ILIKE ? OR mol_inchistring ILIKE ? OR mol_inchikey ILIKE ?
       OR mol_cano_smiles ILIKE ? OR mol_sum_formular ILIKE ?)
    SQL
  end

  def filter_by_years(scope, years)
    return super unless repo_search_use_mv?

    ints = Array(years).map(&:to_i).reject(&:zero?)
    return scope if ints.empty?

    scope.where(year_published: ints)
  end

  def filter_by_authors(scope, author_ids)
    return super unless repo_search_use_mv?

    ids = Array(author_ids).map(&:to_i).reject(&:zero?)
    return scope if ids.empty?

    scope.where('author_ids && ARRAY[?]::int[]', ids)
  end

  def filter_by_contributors(scope, user_ids)
    return super unless repo_search_use_mv?

    ids = Array(user_ids).map(&:to_i).reject(&:zero?)
    return scope if ids.empty?

    scope.where(published_by: ids)
  end

  def filter_by_institutions(scope, names)
    return super unless repo_search_use_mv?

    values = Array(names).map { |n| n.to_s.strip }.compact_blank
    return scope if values.empty?

    scope.where('institution_names && ARRAY[?]::text[]', values)
  end

  def filter_by_reaction_types(scope, types)
    return super unless repo_search_use_mv?

    values = Array(types).map(&:to_s).compact_blank
    return scope if values.empty?

    scope.where(element_type: 'Reaction', reaction_rxno: values)
  end

  def filter_by_embargoes(scope, labels)
    return super unless repo_search_use_mv?

    values = Array(labels).map(&:to_s).compact_blank
    return scope if values.empty?

    scope.where(embargo_label: values)
  end

  def filter_by_ontologies(scope, term_ids)
    return super unless repo_search_use_mv?

    ids = Array(term_ids).map(&:to_s).compact_blank
    return scope if ids.empty?

    scope.where('ontology_term_ids && ARRAY[?]::text[]', ids)
  end

  def filter_by_structure(scope, sample_ids)
    return super unless repo_search_use_mv?
    return scope if sample_ids.nil?
    return scope.none if sample_ids.empty?

    scope.where(<<~SQL.squish, sample_ids, sample_ids)
      (
        (element_type = 'Sample' AND element_id IN (?))
        OR (element_type = 'Reaction' AND element_id IN (
          SELECT reaction_id FROM reactions_samples WHERE sample_id IN (?)
        ))
      )
    SQL
  end

  # ------------------------------------------------------------------
  # Facet aggregations
  # ------------------------------------------------------------------

  def facet_years(scope)
    return super unless repo_search_use_mv?

    rows = scope.unscope(:order)
                .where.not(year_published: nil)
                .group(:year_published)
                .order(year_published: :desc)
                .count
    rows.map { |year, count| { value: year, count: count } }
  end

  # Reaction badge excludes scheme-only reactions to match the filter; they
  # are surfaced under the separate scheme_only facet. (See live impl.)
  def facet_element_types(scope)
    return super unless repo_search_use_mv?

    scope = scope.unscope(:order)
    rows = scope.group(:element_type).count
    if rows.key?('Reaction')
      scheme_cnt = scope.where(element_type: 'Reaction', scheme_only: true).count
      rows['Reaction'] = [rows['Reaction'] - scheme_cnt, 0].max
    end
    rows.map { |t, c| { value: t, count: c } }
  end

  def facet_contributors(scope)
    return super unless repo_search_use_mv?

    rows = scope.unscope(:order).group(:published_by).count
    user_ids = rows.keys.compact
    return [] if user_ids.empty?

    users = User.where(id: user_ids).index_by(&:id)
    enriched = rows.filter_map do |uid, count|
      u = users[uid]
      next nil unless u

      { value: uid, label: "#{u.first_name} #{u.last_name}".strip, count: count }
    end
    enriched.sort_by { |r| -r[:count] }
  end

  def facet_authors(scope, limit: 50)
    return super unless repo_search_use_mv?

    rows = mv_facet_author_rows(scope, limit)
    user_ids = rows.pluck('uid').compact.map(&:to_i)
    return [] if user_ids.empty?

    users = User.where(id: user_ids).index_by(&:id)
    rows.filter_map do |r|
      u = users[r['uid'].to_i]
      next nil unless u

      { value: r['uid'].to_i, label: "#{u.first_name} #{u.last_name}".strip, count: r['cnt'].to_i }
    end
  end

  def mv_facet_author_rows(scope, limit)
    sub_sql = scope.select(:author_ids).to_sql
    sql = <<~SQL.squish
      SELECT uid, COUNT(*) AS cnt
      FROM (
        SELECT UNNEST(author_ids) AS uid FROM (#{sub_sql}) sub
      ) u
      WHERE uid IS NOT NULL
      GROUP BY uid
      ORDER BY cnt DESC
      LIMIT #{limit.to_i}
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a
  end

  def facet_reaction_types(scope, limit: 50)
    return super unless repo_search_use_mv?

    rows = scope.unscope(:order)
                .where(element_type: 'Reaction')
                .where.not(reaction_rxno: [nil, ''])
                .group(:reaction_rxno)
                .order(Arel.sql('COUNT(*) DESC, reaction_rxno ASC'))
                .limit(limit.to_i)
                .count
    rows.map { |rxno, count| { value: rxno, label: rxno_label(rxno), count: count } }
  end

  def facet_ontologies(scope, limit: 50)
    return super unless repo_search_use_mv?

    sub_sql = scope.select(:ontology_term_ids, :ontology_term_labels).to_sql
    sql = <<~SQL.squish
      SELECT term_id, MIN(label) AS label, COUNT(*) AS cnt
      FROM (
        SELECT UNNEST(ontology_term_ids) AS term_id,
               ontology_term_labels      AS labels
        FROM (#{sub_sql}) sub
      ) u
      LEFT JOIN LATERAL (SELECT u.labels ->> u.term_id AS label) lbl ON TRUE
      WHERE term_id IS NOT NULL
      GROUP BY term_id
      ORDER BY cnt DESC, label ASC NULLS LAST
      LIMIT #{limit.to_i}
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |r|
      { value: r['term_id'], label: r['label'], count: r['cnt'].to_i }
    end
  end

  def facet_institutions(scope, limit: 50)
    return super unless repo_search_use_mv?

    sub_sql = scope.select(:institution_names).to_sql
    sql = <<~SQL.squish
      SELECT name AS institution, COUNT(*) AS cnt
      FROM (
        SELECT UNNEST(institution_names) AS name FROM (#{sub_sql}) sub
      ) u
      WHERE COALESCE(name, '') <> ''
      GROUP BY name
      ORDER BY cnt DESC, name ASC
      LIMIT #{limit.to_i}
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |r|
      { value: r['institution'], count: r['cnt'].to_i }
    end
  end

  def facet_embargoes(scope, limit: 50)
    return super unless repo_search_use_mv?

    rows = scope.unscope(:order)
                .where.not(embargo_label: [nil, ''])
                .group(:embargo_label)
                .order(Arel.sql('COUNT(*) DESC, embargo_label ASC'))
                .limit(limit.to_i)
                .count
    rows.map { |label, count| { value: label, count: count } }
  end

  # ------------------------------------------------------------------
  # autocomplete_* — unchanged, source tables already have indexes;
  # MV doesn't help. Fall through to live impl always.
  # ------------------------------------------------------------------

  def autocomplete_years
    return super unless repo_search_use_mv?

    rows = base_publication_scope.unscope(:order)
                                 .where.not(year_published: nil)
                                 .group(:year_published)
                                 .order(year_published: :desc)
                                 .count
    rows.map { |year, count| { value: year, label: year.to_s, count: count } }
  end

  # ------------------------------------------------------------------
  # Per-result enrichment.
  # `embargo_labels_by_publication_id` and `ana_cnt_by_publication_id` read
  # the precomputed columns off the MV rows in one round-trip.
  # ------------------------------------------------------------------

  def mv_rows_by_publication_id(publications)
    ids = publications.map(&:id)
    VPublicationSearch.where(publication_id: ids).index_by(&:publication_id)
  end

  def embargo_labels_by_publication_id(publications)
    return super unless repo_search_use_mv?
    return {} if publications.blank?

    rows = mv_rows_by_publication_id(publications)
    publications.each_with_object({}) do |pub, h|
      h[pub.id] = rows[pub.id]&.embargo_label.to_s
    end
  end

  def ana_cnt_by_publication_id(publications)
    return super unless repo_search_use_mv?
    return {} if publications.blank?

    rows = mv_rows_by_publication_id(publications)
    publications.each_with_object({}) do |pub, h|
      h[pub.id] = rows[pub.id]&.ana_count.to_i
    end
  end

  # contributors_by_publication_id and xvial_by_publication_id stay on
  # the live path — both already do a single bounded round-trip; the MV
  # buys nothing and (for xvial) the per-user allow-list gating doesn't
  # belong on a shared cache.
end
# rubocop:enable Metrics/ModuleLength
