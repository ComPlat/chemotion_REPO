# frozen_string_literal: true

# rubocop:disable Metrics/ModuleLength
# Builders for the publication-page faceted search API. All queries are
# restricted to completed publications of element_type Sample or Reaction.
module RepoSearchFacetHelpers
  extend Grape::API::Helpers

  SUPPORTED_ELEMENT_TYPES = %w[Sample Reaction].freeze
  DEFAULT_FACET_VALUE_LIMIT = 10
  MAX_FACET_VALUE_LIMIT = 50

  # Build the base scope for completed Sample/Reaction publications. All
  # facet queries and the results query reuse this so visibility rules stay
  # consistent.
  def base_publication_scope
    Publication.where(state: Publication::STATE_COMPLETED,
                      element_type: SUPPORTED_ELEMENT_TYPES,
                      deleted_at: nil)
  end

  # Apply selected filters to the base scope. Each filter is independent
  # (AND-combined). `structure_sample_ids` is the precomputed Sample id set
  # when a structure query is active; pass nil to skip.
  def apply_filters(scope, filters, structure_sample_ids: nil)
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

  # Embargo bundles are collections nested under a "Published Elements"
  # collection. Reused in the filter/facet/autocomplete queries so the
  # ancestry match stays consistent. The alias `c` must refer to the
  # candidate collection in the surrounding query.
  PUBLISHED_ELEMENTS_ANCESTRY_EXISTS = <<~SQL.squish.freeze
    EXISTS (
      SELECT 1 FROM collections pe
      WHERE pe.label = 'Published Elements'
        AND pe.deleted_at IS NULL
        AND c.ancestry LIKE '%/' || pe.id::text || '/%'
    )
  SQL

  # Element + Scheme-only together form one logical "Element" facet in the UI.
  # Choices inside that group are OR-combined: ticking Sample alongside
  # Scheme-only must yield Samples plus scheme-only Reactions, not the empty
  # intersection.
  #
  # The "Reaction" choice means *full* reactions only — scheme-only reactions
  # are a sibling choice surfaced through the scheme_only flag, so picking
  # Reaction without scheme_only must exclude them (they share element_type
  # 'Reaction', so a bare `element_type = 'Reaction'` would wrongly include
  # them). scheme_only == false keeps the same global AND restriction.
  def filter_by_element_group(scope, types, scheme_only)
    type_list = Array(types).map(&:to_s).select { |t| SUPPORTED_ELEMENT_TYPES.include?(t) }
    return element_or_scheme_scope(scope, type_list) if scheme_only == true

    exclude_scheme = scheme_only == false || type_list.include?('Reaction')
    scope = filter_by_scheme_only(scope, false) if exclude_scheme
    type_list.any? ? scope.where(element_type: type_list) : scope
  end

  SCHEME_ONLY_REACTION_CLAUSE =
    "(publications.element_type = 'Reaction' AND " \
    "COALESCE((publications.taggable_data ->> 'scheme_only')::boolean, FALSE) = TRUE)"

  def element_or_scheme_scope(scope, type_list)
    return scope.where(SCHEME_ONLY_REACTION_CLAUSE) if type_list.empty?

    scope.where("publications.element_type IN (?) OR #{SCHEME_ONLY_REACTION_CLAUSE}", type_list)
  end

  # Free-text search across IUPAC name, InChI, InChIKey, canonical SMILES
  # and sum formula. Same query is applied to Sample publications (via the
  # sample's molecule) and to Reaction publications (via any product/
  # reactant sample's molecule).
  def filter_by_text(scope, query)
    return scope if query.blank?

    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, query.to_s.strip)}%"
    return scope if like.length <= 2

    scope.where(<<~SQL.squish, like, like, like, like, like, like, like, like, like, like)
      (
        (publications.element_type = 'Sample' AND EXISTS (
          SELECT 1 FROM samples s
          INNER JOIN molecules m ON m.id = s.molecule_id
          WHERE s.id = publications.element_id
            AND (m.iupac_name ILIKE ? OR m.inchistring ILIKE ? OR m.inchikey ILIKE ?
                 OR m.cano_smiles ILIKE ? OR m.sum_formular ILIKE ?)
        ))
        OR
        (publications.element_type = 'Reaction' AND EXISTS (
          SELECT 1 FROM reactions_samples rs
          INNER JOIN samples s ON s.id = rs.sample_id
          INNER JOIN molecules m ON m.id = s.molecule_id
          WHERE rs.reaction_id = publications.element_id
            AND (m.iupac_name ILIKE ? OR m.inchistring ILIKE ? OR m.inchikey ILIKE ?
                 OR m.cano_smiles ILIKE ? OR m.sum_formular ILIKE ?)
        ))
      )
    SQL
  end

  def filter_by_scheme_only(scope, flag)
    return scope if flag.nil?

    if flag
      scope.where(scheme_only_clause)
    else
      scope.where(scheme_only_clause(value: false))
    end
  end

  def scheme_only_clause(value: true)
    "COALESCE((publications.taggable_data ->> 'scheme_only')::boolean, FALSE) = #{value ? 'TRUE' : 'FALSE'}"
  end

  def filter_by_years(scope, years)
    return scope if years.blank?

    ints = Array(years).map(&:to_i).reject(&:zero?)
    return scope if ints.empty?

    scope.where('EXTRACT(YEAR FROM published_at)::int IN (?)', ints)
  end

  def filter_by_authors(scope, author_ids)
    return scope if author_ids.blank?

    ids = Array(author_ids).map(&:to_s).compact_blank
    return scope if ids.empty?

    scope.where(<<~SQL.squish, ids)
      EXISTS (
        SELECT 1 FROM publication_authors pa
        WHERE pa.element_type = publications.element_type
          AND pa.element_id = publications.element_id
          AND pa.state = 'completed'
          AND pa.author_id IN (?)
      )
    SQL
  end

  def filter_by_contributors(scope, user_ids)
    return scope if user_ids.blank?

    ids = Array(user_ids).map(&:to_i).reject(&:zero?)
    return scope if ids.empty?

    scope.where(published_by: ids)
  end

  def filter_by_institutions(scope, names)
    return scope if names.blank?

    values = Array(names).map { |n| n.to_s.strip.downcase }.compact_blank
    return scope if values.empty?

    placeholders = values.map { '?' }.join(', ')
    # Affiliations live in taggable_data['affiliations'] as a hash of
    # id => name. Match on any value in that hash for this publication.
    scope.where(<<~SQL.squish, *values)
      EXISTS (
        SELECT 1 FROM jsonb_each_text(
          COALESCE(publications.taggable_data -> 'affiliations', '{}'::jsonb)
        ) AS aff(key, value)
        WHERE LOWER(TRIM(aff.value)) IN (#{placeholders})
      )
    SQL
  end

  # Restrict to Reaction publications whose reactions.rxno matches one of
  # the selected RxnO labels (the rxno column stores the full
  # "RXNO:0000568 | bromo Suzuki-type coupling" string).
  def filter_by_reaction_types(scope, types)
    return scope if types.blank?

    values = Array(types).map(&:to_s).compact_blank
    return scope if values.empty?

    scope.where(<<~SQL.squish, values)
      publications.element_type = 'Reaction' AND EXISTS (
        SELECT 1 FROM reactions r
        WHERE r.id = publications.element_id
          AND r.deleted_at IS NULL
          AND r.rxno IN (?)
      )
    SQL
  end

  # Restrict to publications whose element belongs to an embargo bundle
  # (a collection nested under "Published Elements") with one of the
  # selected labels. Sample bundles live in collections_samples;
  # Reaction bundles live in collections_reactions (which is paranoid).
  def filter_by_embargoes(scope, labels)
    return scope if labels.blank?

    values = Array(labels).map(&:to_s).compact_blank
    return scope if values.empty?

    scope.where(<<~SQL.squish, values, values)
      (
        (publications.element_type = 'Sample' AND EXISTS (
          SELECT 1 FROM collections_samples j
          INNER JOIN collections c
            ON c.id = j.collection_id AND c.deleted_at IS NULL
          WHERE j.sample_id = publications.element_id
            AND c.label IN (?)
            AND #{PUBLISHED_ELEMENTS_ANCESTRY_EXISTS}
        ))
        OR
        (publications.element_type = 'Reaction' AND EXISTS (
          SELECT 1 FROM collections_reactions j
          INNER JOIN collections c
            ON c.id = j.collection_id AND c.deleted_at IS NULL
          WHERE j.reaction_id = publications.element_id
            AND j.deleted_at IS NULL
            AND c.label IN (?)
            AND #{PUBLISHED_ELEMENTS_ANCESTRY_EXISTS}
        ))
      )
    SQL
  end

  def filter_by_ontologies(scope, term_ids)
    return scope if term_ids.blank?

    ids = Array(term_ids).map(&:to_s).compact_blank
    return scope if ids.empty?

    scope.where(<<~SQL.squish, ids)
      EXISTS (
        SELECT 1 FROM publication_ontologies po
        WHERE po.element_type = publications.element_type
          AND po.element_id = publications.element_id
          AND po.term_id IN (?)
      )
    SQL
  end

  def filter_by_structure(scope, sample_ids)
    return scope if sample_ids.nil?
    return scope.none if sample_ids.empty?

    # Match Sample publications directly, and Reaction publications whose
    # samples are among the structure-search hits via reactions_samples.
    scope.where(<<~SQL.squish, sample_ids, sample_ids)
      (
        (publications.element_type = 'Sample' AND publications.element_id IN (?))
        OR (publications.element_type = 'Reaction' AND publications.element_id IN (
          SELECT reaction_id FROM reactions_samples WHERE sample_id IN (?)
        ))
      )
    SQL
  end

  # ------------------------------------------------------------------
  # Facet aggregations
  # ------------------------------------------------------------------

  def facet_years(scope)
    # Order by year DESC (newest first) so the facet reads chronologically
    # — `.group(...).count` against ActiveRecord drops the ORDER BY, hence
    # the explicit raw query.
    sub_sql = scope.unscope(:order).select(:id).to_sql
    sql = <<~SQL.squish
      SELECT EXTRACT(YEAR FROM p.published_at)::int AS year, COUNT(*) AS cnt
      FROM publications p
      WHERE p.id IN (#{sub_sql})
        AND p.published_at IS NOT NULL
      GROUP BY year
      ORDER BY year DESC
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |row|
      { value: row['year'], count: row['cnt'].to_i }
    end
  end

  # The "Reaction" facet option means full reactions only; scheme-only
  # reactions are counted under their own facet, so subtract them from the
  # Reaction tally to keep the badge in step with what selecting Reaction
  # actually returns (see filter_by_element_group).
  def facet_element_types(scope)
    scope = scope.unscope(:order)
    rows = scope.group(:element_type).count
    if rows.key?('Reaction')
      scheme_cnt = scope.where(element_type: 'Reaction').where(scheme_only_clause).count
      rows['Reaction'] = [rows['Reaction'] - scheme_cnt, 0].max
    end
    rows.map { |t, c| { value: t, count: c } }
  end

  def facet_contributors(scope)
    rows = scope.unscope(:order).group(:published_by).count
    user_ids = rows.keys.compact
    return [] if user_ids.empty?

    users = User.where(id: user_ids).index_by(&:id)
    enriched = rows.filter_map do |uid, count|
      u = users[uid]
      next nil unless u

      { value: uid,
        label: "#{u.first_name} #{u.last_name}".strip,
        count: count }
    end
    enriched.sort_by { |r| -r[:count] }
  end

  def facet_authors(scope, limit: 50)
    sub_sql = scope.select(:element_type, :element_id).to_sql
    sql = <<~SQL.squish
      SELECT pa.author_id::int AS uid, COUNT(*) AS cnt
      FROM publication_authors pa
      WHERE pa.state = 'completed'
        AND (pa.element_type, pa.element_id) IN (
          SELECT element_type, element_id FROM (#{sub_sql}) sub
        )
      GROUP BY pa.author_id
      ORDER BY cnt DESC
      LIMIT #{limit.to_i}
    SQL
    rows = ActiveRecord::Base.connection.exec_query(sql).to_a
    user_ids = rows.pluck('uid').compact
    return [] if user_ids.empty?

    users = User.where(id: user_ids).index_by(&:id)
    rows.filter_map do |r|
      u = users[r['uid']]
      next nil unless u

      { value: r['uid'],
        label: "#{u.first_name} #{u.last_name}".strip,
        count: r['cnt'].to_i }
    end
  end

  def facet_reaction_types(scope, limit: 50)
    sub_sql = scope.where(element_type: 'Reaction').select(:element_id).to_sql
    sql = <<~SQL.squish
      SELECT r.rxno AS value, COUNT(*) AS cnt
      FROM reactions r
      WHERE r.id IN (#{sub_sql})
        AND r.deleted_at IS NULL
        AND r.rxno IS NOT NULL AND r.rxno <> ''
      GROUP BY r.rxno
      ORDER BY cnt DESC, r.rxno ASC
      LIMIT #{limit.to_i}
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |row|
      { value: row['value'], label: rxno_label(row['value']), count: row['cnt'].to_i }
    end
  end

  # Return the human-readable part of an rxno string ("RXNO:N | label" -> "label").
  def rxno_label(rxno)
    after_pipe = rxno.to_s.split('|', 2).last.to_s.strip
    after_pipe.presence || rxno.to_s
  end

  def facet_ontologies(scope, limit: 50)
    sub_sql = scope.select(:id, :element_type, :element_id).to_sql
    # Inner join the in-scope publications to publication_ontologies and
    # group on term_id. Counting distinct publication ids gives the
    # expected per-term hit count even when an analysis appears on
    # multiple containers of the same publication.
    sql = <<~SQL.squish
      SELECT po.term_id,
             MIN(po.label) AS label,
             COUNT(DISTINCT p.id) AS cnt
      FROM (#{sub_sql}) p
      INNER JOIN publication_ontologies po
        ON po.element_type = p.element_type
       AND po.element_id = p.element_id
      WHERE po.term_id IS NOT NULL
      GROUP BY po.term_id
      ORDER BY cnt DESC, label ASC
      LIMIT #{limit.to_i}
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |r|
      { value: r['term_id'], label: r['label'], count: r['cnt'].to_i }
    end
  end

  def facet_institutions(scope, limit: 50)
    sub_sql = scope.select(:id).to_sql
    sql = <<~SQL.squish
      SELECT TRIM(aff.value) AS institution, COUNT(DISTINCT p.id) AS cnt
      FROM publications p,
           jsonb_each_text(COALESCE(p.taggable_data -> 'affiliations', '{}'::jsonb)) AS aff(key, value)
      WHERE p.id IN (#{sub_sql})
        AND COALESCE(TRIM(aff.value), '') <> ''
      GROUP BY 1
      ORDER BY cnt DESC, 1 ASC
      LIMIT #{limit.to_i}
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |r|
      { value: r['institution'], count: r['cnt'].to_i }
    end
  end

  def facet_embargoes(scope, limit: 50)
    sub_sql = scope.select(:id, :element_type, :element_id).to_sql
    sql = <<~SQL.squish
      SELECT label, COUNT(DISTINCT pub_id) AS cnt
      FROM (
        SELECT p.id AS pub_id, c.label
        FROM (#{sub_sql}) p
        INNER JOIN collections_samples j ON j.sample_id = p.element_id
        INNER JOIN collections c ON c.id = j.collection_id AND c.deleted_at IS NULL
        WHERE p.element_type = 'Sample'
          AND #{PUBLISHED_ELEMENTS_ANCESTRY_EXISTS}
        UNION ALL
        SELECT p.id AS pub_id, c.label
        FROM (#{sub_sql}) p
        INNER JOIN collections_reactions j
          ON j.reaction_id = p.element_id AND j.deleted_at IS NULL
        INNER JOIN collections c ON c.id = j.collection_id AND c.deleted_at IS NULL
        WHERE p.element_type = 'Reaction'
          AND #{PUBLISHED_ELEMENTS_ANCESTRY_EXISTS}
      ) sub
      WHERE label IS NOT NULL AND label <> ''
      GROUP BY label
      ORDER BY cnt DESC, label ASC
      LIMIT #{limit.to_i}
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |r|
      { value: r['label'], count: r['cnt'].to_i }
    end
  end

  # ------------------------------------------------------------------
  # Facet-value autocomplete (for dropdowns)
  # ------------------------------------------------------------------

  def autocomplete_authors(query, limit: DEFAULT_FACET_VALUE_LIMIT)
    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, query.to_s.downcase)}%"
    sql = ActiveRecord::Base.send(:sanitize_sql_array, [<<~SQL.squish, like, like, like, limit.to_i])
      SELECT u.id AS value,
             (u.first_name || ' ' || u.last_name) AS label
      FROM users u
      WHERE u.deleted_at IS NULL
        AND u.type IN ('Person', 'Group', 'Collaborator')
        AND EXISTS (
          SELECT 1 FROM publication_authors pa
          WHERE pa.author_id = u.id::text AND pa.state = 'completed'
        )
        AND (
          LOWER(u.first_name) ILIKE ?
          OR LOWER(u.last_name) ILIKE ?
          OR LOWER(u.first_name || ' ' || u.last_name) ILIKE ?
        )
      ORDER BY u.last_name, u.first_name
      LIMIT ?
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map(&:symbolize_keys)
  end

  def autocomplete_contributors(query, limit: DEFAULT_FACET_VALUE_LIMIT)
    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, query.to_s.downcase)}%"
    sql = ActiveRecord::Base.send(:sanitize_sql_array, [<<~SQL.squish, like, like, like, limit.to_i])
      SELECT u.id AS value,
             (u.first_name || ' ' || u.last_name) AS label
      FROM users u
      WHERE u.deleted_at IS NULL
        AND u.type = 'Person'
        AND EXISTS (
          SELECT 1 FROM publications p
          WHERE p.published_by = u.id
            AND p.state = 'completed'
            AND p.deleted_at IS NULL
            AND p.element_type IN ('Sample', 'Reaction')
        )
        AND (
          LOWER(u.first_name) ILIKE ?
          OR LOWER(u.last_name) ILIKE ?
          OR LOWER(u.first_name || ' ' || u.last_name) ILIKE ?
        )
      ORDER BY u.last_name, u.first_name
      LIMIT ?
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map(&:symbolize_keys)
  end

  def autocomplete_institutions(query, limit: DEFAULT_FACET_VALUE_LIMIT)
    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, query.to_s.downcase)}%"
    sql = ActiveRecord::Base.send(:sanitize_sql_array, [<<~SQL.squish, like, limit.to_i])
      SELECT institution AS value, institution AS label
      FROM (
        SELECT DISTINCT TRIM(aff.value) AS institution
        FROM publications p,
             jsonb_each_text(COALESCE(p.taggable_data -> 'affiliations', '{}'::jsonb)) AS aff(key, value)
        WHERE p.state = 'completed'
          AND p.deleted_at IS NULL
          AND p.element_type IN ('Sample', 'Reaction')
          AND COALESCE(TRIM(aff.value), '') <> ''
      ) s
      WHERE LOWER(s.institution) ILIKE ?
      ORDER BY s.institution
      LIMIT ?
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map(&:symbolize_keys)
  end

  def autocomplete_reaction_types(query, limit: DEFAULT_FACET_VALUE_LIMIT)
    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, query.to_s.downcase)}%"
    sql = ActiveRecord::Base.send(:sanitize_sql_array, [<<~SQL.squish, like, limit.to_i])
      SELECT r.rxno AS value, COUNT(*) AS cnt
      FROM reactions r
      INNER JOIN publications p
        ON p.element_type = 'Reaction'
       AND p.element_id = r.id
       AND p.state = 'completed'
       AND p.deleted_at IS NULL
      WHERE r.deleted_at IS NULL
        AND r.rxno IS NOT NULL AND r.rxno <> ''
        AND LOWER(r.rxno) ILIKE ?
      GROUP BY r.rxno
      ORDER BY cnt DESC, r.rxno ASC
      LIMIT ?
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |row|
      { value: row['value'], label: rxno_label(row['value']), count: row['cnt'].to_i }
    end
  end

  def autocomplete_ontologies(query, limit: DEFAULT_FACET_VALUE_LIMIT)
    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, query.to_s.downcase)}%"
    sql = ActiveRecord::Base.send(:sanitize_sql_array, [<<~SQL.squish, like, like, limit.to_i])
      SELECT po.term_id AS value, MIN(po.label) AS label, COUNT(DISTINCT (po.element_type, po.element_id)) AS count
      FROM publication_ontologies po
      WHERE LOWER(po.label) ILIKE ? OR LOWER(po.term_id) ILIKE ?
      GROUP BY po.term_id
      ORDER BY count DESC, MIN(po.label) ASC
      LIMIT ?
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map do |r|
      { value: r['value'], label: r['label'], count: r['count'].to_i }
    end
  end

  def autocomplete_embargoes(query, limit: DEFAULT_FACET_VALUE_LIMIT)
    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, query.to_s.downcase)}%"
    sql = ActiveRecord::Base.send(:sanitize_sql_array, [<<~SQL.squish, like, limit.to_i])
      SELECT DISTINCT c.label AS value, c.label AS label
      FROM collections c
      WHERE c.deleted_at IS NULL
        AND c.label IS NOT NULL AND c.label <> ''
        AND LOWER(c.label) ILIKE ?
        AND #{PUBLISHED_ELEMENTS_ANCESTRY_EXISTS}
      ORDER BY c.label
      LIMIT ?
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a.map(&:symbolize_keys)
  end

  def autocomplete_years
    base_publication_scope
      .unscope(:order)
      .group(Arel.sql('EXTRACT(YEAR FROM published_at)::int'))
      .order(Arel.sql('1 DESC'))
      .count
      .reject { |year, _| year.nil? }
      .map { |year, count| { value: year, label: year.to_s, count: count } }
  end

  # ------------------------------------------------------------------
  # Per-result enrichment (single SQL pass each). Keyed by publication.id
  # so the entity layer can do O(1) lookups while rendering.
  # ------------------------------------------------------------------

  EMBARGO_TABLES = {
    'Sample' => { join_table: 'collections_samples', fk: 'sample_id', deleted_at_clause: 'TRUE' },
    'Reaction' => { join_table: 'collections_reactions', fk: 'reaction_id',
                    deleted_at_clause: 'j.deleted_at IS NULL' },
  }.freeze

  # Returns { publication_id => embargo_label_or_nil }. Joins the
  # element-specific collections table for each row and reads the label
  # of any sub-collection of "Published Elements".
  def embargo_labels_by_publication_id(publications)
    return {} if publications.blank?

    rows = collect_embargo_rows(publications)
    by_key = rows.each_with_object({}) do |r, h|
      h[[r['element_type'], r['element_id'].to_i]] = r['label']
    end
    publications.each_with_object({}) do |pub, h|
      h[pub.id] = by_key[[pub.element_type, pub.element_id]] || ''
    end
  end

  def collect_embargo_rows(publications)
    grouped = publications.group_by(&:element_type)
    grouped.flat_map do |element_type, pubs|
      cfg = EMBARGO_TABLES[element_type]
      next [] unless cfg

      ids = pubs.map(&:element_id)
      next [] if ids.blank?

      query_embargo_labels(element_type, cfg, ids)
    end
  end

  def query_embargo_labels(element_type, cfg, ids)
    join_table = cfg[:join_table]
    fk = cfg[:fk]
    deleted_clause = cfg[:deleted_at_clause]
    # The bundle is a descendant of a "Published Elements" collection;
    # ancestry is a slash-separated path like "/209/1164/" so a LIKE
    # match against each PE id surfaces the bundle even when it sits
    # deeper than one level below PE.
    sql = ActiveRecord::Base.send(:sanitize_sql_array, [<<~SQL.squish, element_type, ids])
      SELECT ? AS element_type, j.#{fk} AS element_id, c.label AS label
      FROM #{join_table} j
      INNER JOIN collections c ON c.id = j.collection_id AND c.deleted_at IS NULL
      WHERE j.#{fk} IN (?)
        AND #{deleted_clause}
        AND #{PUBLISHED_ELEMENTS_ANCESTRY_EXISTS}
    SQL
    ActiveRecord::Base.connection.exec_query(sql).to_a
  end

  # Returns { publication_id => "First Last" } for publishers (contributors).
  def contributors_by_publication_id(publications)
    return {} if publications.blank?

    user_ids = publications.filter_map(&:published_by).uniq
    return {} if user_ids.empty?

    users = User.where(id: user_ids).index_by(&:id)
    publications.each_with_object({}) do |pub, h|
      u = users[pub.published_by]
      next unless u

      h[pub.id] = "#{u.first_name} #{u.last_name}".strip
    end
  end

  # Returns { publication_id => "NJ" } — the contributor's stored
  # name_abbreviation from their user profile. One batched pluck.
  def contributor_abbreviations_by_publication_id(publications)
    return {} if publications.blank?

    user_ids = publications.filter_map(&:published_by).uniq
    return {} if user_ids.empty?

    abbrs = User.where(id: user_ids).pluck(:id, :name_abbreviation).to_h
    publications.each_with_object({}) do |pub, h|
      abbr = abbrs[pub.published_by]
      h[pub.id] = abbr if abbr.present?
    end
  end

  # Returns { publication_id => "Group, Department, Organization, Country" } for
  # each contributor (publisher). One batched query over the contributor users'
  # current affiliations, most-recent first, keeping the newest per user.
  def contributor_affiliations_by_publication_id(publications)
    return {} if publications.blank?

    user_ids = publications.filter_map(&:published_by).uniq
    return {} if user_ids.empty?

    aff_by_user = affiliation_string_by_user_id(user_ids)
    publications.each_with_object({}) do |pub, h|
      aff = aff_by_user[pub.published_by]
      h[pub.id] = aff if aff.present?
    end
  end

  # { user_id => affiliation string } for the current (non-expired) affiliation
  # of each user. Ordered so the most recent is seen first and wins per user.
  def affiliation_string_by_user_id(user_ids)
    Affiliation
      .joins('INNER JOIN user_affiliations ua ON ua.affiliation_id = affiliations.id')
      .where('ua.user_id IN (?) AND ua.deleted_at IS NULL AND (ua.to IS NULL OR ua.to > ?)',
             user_ids, Time.zone.now)
      .order(Arel.sql('ua.from DESC NULLS LAST'))
      .select('affiliations.*, ua.user_id AS ua_user_id')
      .each_with_object({}) do |aff, h|
        h[aff.ua_user_id] ||= aff.output_full
      end
  end

  # Returns { publication_id => analysis_count } using publication_ontologies.
  def ana_cnt_by_publication_id(publications)
    return {} if publications.blank?

    rows = collect_ana_cnt_rows(publications)
    by_key = rows.each_with_object({}) do |r, h|
      h[[r['element_type'], r['element_id'].to_i]] = r['cnt'].to_i
    end
    publications.each_with_object({}) do |pub, h|
      h[pub.id] = by_key[[pub.element_type, pub.element_id]] || 0
    end
  end

  def collect_ana_cnt_rows(publications)
    publications.group_by(&:element_type).flat_map do |element_type, pubs|
      ids = pubs.map(&:element_id)
      next [] if ids.blank?

      sql = ActiveRecord::Base.send(:sanitize_sql_array, [<<~SQL.squish, element_type, ids])
        SELECT element_type, element_id, COUNT(*) AS cnt
        FROM publication_ontologies
        WHERE element_type = ? AND element_id IN (?)
        GROUP BY element_type, element_id
      SQL
      ActiveRecord::Base.connection.exec_query(sql).to_a
    end
  end

  # Returns { publication_id => { count: 0|1, com: 0|1 } } for the X-Vial
  # badge on the faceted publication list. `count` flags samples that carry
  # an xvial number tag; `com` flags rows whose molecule appears in the
  # Compound Platform open-data set, but is only populated for users in the
  # configured allow-list (otherwise hidden, matching public_repo_api).
  def xvial_by_publication_id(publications, current_user)
    return {} if publications.blank?

    com_config = Rails.configuration.compound_opendata
    show_com = com_config.present? && com_config.allowed_uids.include?(current_user&.id)
    sets = xvial_id_sets(publications, show_com)

    publications.each_with_object({}) do |pub, h|
      h[pub.id] = xvial_entry_for(pub, sets, show_com)
    end
  end

  def xvial_id_sets(publications, show_com)
    grouped = publications.group_by(&:element_type)
    sample_cnt, sample_com = sample_xvial_ids((grouped['Sample'] || []).map(&:element_id), show_com)
    reaction_cnt, reaction_com = reaction_xvial_ids((grouped['Reaction'] || []).map(&:element_id), show_com)
    {
      'Sample' => [sample_cnt.to_set, sample_com.to_set],
      'Reaction' => [reaction_cnt.to_set, reaction_com.to_set],
    }
  end

  def xvial_entry_for(pub, sets, show_com)
    cnt_set, com_set = sets[pub.element_type] || [Set.new, Set.new]
    eid = pub.element_id
    {
      count: cnt_set.include?(eid) ? 1 : 0,
      com: show_com && com_set.include?(eid) ? 1 : 0,
    }
  end

  def sample_xvial_ids(sample_ids, show_com)
    return [[], []] if sample_ids.blank?

    cnt_join = <<~SQL.squish
      INNER JOIN element_tags e ON e.taggable_type = 'Sample' AND e.taggable_id = samples.id
        AND e.taggable_data -> 'xvial' IS NOT NULL AND e.taggable_data -> 'xvial' ->> 'num' != ''
    SQL
    cnt_ids = Sample.joins(cnt_join).where(id: sample_ids).distinct.pluck(:id)

    com_ids = []
    if show_com
      com_join = <<~SQL.squish
        INNER JOIN molecules m ON m.id = samples.molecule_id
        INNER JOIN com_xvial(true) a ON a.x_inchikey = m.inchikey
      SQL
      com_ids = Sample.joins(com_join).where(id: sample_ids).distinct.pluck(:id)
    end
    [cnt_ids, com_ids]
  end

  def reaction_xvial_ids(reaction_ids, show_com)
    return [[], []] if reaction_ids.blank?

    cnt_join = <<~SQL.squish
      INNER JOIN element_tags e ON e.taggable_type = 'Sample' AND e.taggable_id = reactions_samples.sample_id
        AND e.taggable_data -> 'xvial' IS NOT NULL AND e.taggable_data -> 'xvial' ->> 'num' != ''
    SQL
    cnt_ids = ReactionsSample.joins(cnt_join)
                             .where(type: 'ReactionsProductSample', reaction_id: reaction_ids)
                             .distinct.pluck(:reaction_id)

    com_ids = []
    if show_com
      com_join = <<~SQL.squish
        INNER JOIN samples s ON reactions_samples.sample_id = s.id AND s.deleted_at IS NULL
        INNER JOIN molecules m ON m.id = s.molecule_id
        INNER JOIN com_xvial(true) a ON a.x_inchikey = m.inchikey
      SQL
      com_ids = ReactionsSample.joins(com_join)
                               .where(type: 'ReactionsProductSample', reaction_id: reaction_ids)
                               .distinct.pluck(:reaction_id)
    end
    [cnt_ids, com_ids]
  end
end
# rubocop:enable Metrics/ModuleLength
