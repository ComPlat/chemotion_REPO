# frozen_string_literal: true

# rubocop:disable Metrics/ModuleLength
# Materialized-view-backed counterpart to RepoArchiveFacetHelpers. Same
# public method names; runs against `v_molecule_archive` (snapshot UNION
# delta) when `RepoSearchConfig.use_mv` is true, otherwise supers to the
# live SQL path.
#
# MV-eligibility: adv_search modes the MV doesn't carry columns for
# (Authors, Ontologies, Embargo-by-collection-id, Label) fall through
# to the live path. Free-text, structure, year/provider/group/
# has_analyses/embargoes filters and Contributors adv-search are all
# served by the MV.
module RepoArchiveFacetHelpersMv
  extend Grape::API::Helpers
  include RepoArchiveFacetHelpers

  MV_INCOMPATIBLE_ADV_TYPES = %w[Authors Ontologies Embargo Label].freeze

  def repo_search_use_mv?
    RepoSearchConfig.use_mv == true
  end

  def archive_mv_eligible?(input)
    return false unless repo_search_use_mv?
    return false if MV_INCOMPATIBLE_ADV_TYPES.include?(input.adv_type)

    true
  end

  # One structured line to log/molecule_archive_search.log per request.
  # `mode` reflects the path actually taken: REALTIME when the flag is off OR
  # the adv-search type isn't MV-compatible (Authors/Ontologies/Embargo/Label).
  # Logging never breaks a request — failures degrade to a warn.
  def log_archive_search(input:, total_count:, duration_ms:)
    payload = {
      source: 'molecule_archive',
      event: 'molecules',
      mode: archive_mv_eligible?(input) ? 'MV' : 'REALTIME',
      use_mv_flag: RepoSearchConfig.use_mv,
      user_id: input.current_user_id,
      total: total_count,
      sort: input.sort_dir,
      adv_type: input.adv_type,
      text: input.q_term.to_s.length > 2,
      structure: !input.structure_ids.nil?,
      structure_hits: input.structure_ids&.size,
      filters: archive_loggable_filters(input),
      duration_ms: duration_ms,
    }
    RepoSearchConfig.archive_logger.info(RepoSearchConfig.format_payload(payload))
  rescue StandardError => e
    Rails.logger.warn("RepoCompoundSearchAPI logging failed: #{e.message}")
  end

  # Active archive filters collapsed to counts, mirroring the publication
  # search log so the two files read the same way.
  def archive_loggable_filters(input)
    {
      years: input.archive_years,
      providers: input.archive_providers,
      groups: input.archive_groups,
      has_analyses: input.archive_has_analyses,
      embargoes: input.archive_embargoes,
    }.compact_blank.transform_values(&:size)
  end

  # ------------------------------------------------------------------
  # Single-scan base load.
  #
  # `v_molecule_archive` is a UNION view whose delta branch re-evaluates
  # correlated subselects (provider / group / has_analyses / embargo) on
  # every scan, so scanning it once per facet plus the ids and the count costs
  # seconds. Instead we pull the columns the count, ordering and facets need
  # ONE time (the archive is at most a few thousand molecules) and aggregate
  # in Ruby. Text / structure /
  # contributors filters stay in SQL (ILIKE + array overlap); the five
  # toggleable facet filters are applied in memory so each facet can still
  # "drop its own filter".
  # ------------------------------------------------------------------

  MV_BASE_COLUMNS = %i[
    molecule_id year_published provider group_label has_analyses
    embargo_label max_published_at
  ].freeze

  # Memoized on the (request-scoped) helper instance. Text/structure/
  # contributors don't change within a request, so one load serves the
  # result ids, the count, and every facet.
  def mv_base_rows(input)
    @mv_base_rows ||= begin
      scope = VMoleculeArchive.all
      # Molecule Archive = physical samples only. The snapshot carries every
      # molecule with a completed publication (xvial_count is just a column, not
      # a filter), so restrict to xvial_count > 0 to match the live req_xvial
      # result scope — otherwise the facet/total counts overcount against the
      # molecules actually shown.
      scope = scope.where('xvial_count > 0') if input.req_xvial
      scope = mv_filter_text(scope, input.q_term)
      scope = mv_filter_structure(scope, input.structure_ids)
      scope = mv_filter_contributors(scope, input)
      scope.pluck(*MV_BASE_COLUMNS).map { |row| MV_BASE_COLUMNS.zip(row).to_h }
    rescue StandardError => e
      # Degrade to empty (count 0, no facets, empty page) rather than 500 —
      # same posture as the per-facet/count rescues below.
      Rails.logger.warn("RepoArchive[MV] base load failed: #{e.message}")
      []
    end
  end

  def mv_filter_text(scope, q_term)
    return scope if q_term.to_s.length <= 2

    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, q_term)}%"
    scope.where(<<~SQL.squish, like, like, like, like, like)
      (mol_iupac_name ILIKE ? OR mol_inchistring ILIKE ? OR mol_inchikey ILIKE ?
       OR mol_cano_smiles ILIKE ? OR mol_sum_formular ILIKE ?)
    SQL
  end

  def mv_filter_structure(scope, sample_ids)
    return scope if sample_ids.nil?
    return scope.none if sample_ids.empty?

    scope.where('sample_ids && ARRAY[?]::int[]', sample_ids)
  end

  def mv_filter_contributors(scope, input)
    return scope unless input.adv_type == 'Contributors'

    ids = input.params[:adv_val].to_a.map(&:to_i).reject(&:zero?)
    return scope if ids.empty?

    scope.where('contributor_ids && ARRAY[?]::int[]', ids)
  end

  # Apply the five toggleable facet filters to the in-memory base rows.
  # `skip` leaves one facet's own filter off so its other values stay
  # visible and toggleable.
  def mv_filter_rows(rows, input, skip: nil)
    rows = mv_rows_by_years(rows, input.archive_years)              unless skip == :years
    rows = mv_rows_in(rows, :provider, input.archive_providers)     unless skip == :providers
    rows = mv_rows_in(rows, :group_label, input.archive_groups)     unless skip == :groups
    rows = mv_rows_by_has_analyses(rows, input.archive_has_analyses) unless skip == :hasAnalyses
    rows = mv_rows_in(rows, :embargo_label, input.archive_embargoes) unless skip == :embargoes
    rows
  end

  def mv_rows_by_years(rows, years)
    ints = Array(years).map(&:to_i).reject(&:zero?)
    return rows if ints.empty?

    rows.select { |r| ints.include?(r[:year_published]) }
  end

  def mv_rows_in(rows, key, values)
    set = Array(values).map(&:to_s)
    return rows if set.empty?

    rows.select { |r| set.include?(r[key]) }
  end

  def mv_rows_by_has_analyses(rows, flags)
    return rows.select { |r| r[:has_analyses] } if flags.include?('yes') && flags.exclude?('no')
    return rows.reject { |r| r[:has_analyses] } if flags.include?('no') && flags.exclude?('yes')

    rows
  end

  def mv_count_by(rows, key)
    rows.each_with_object(Hash.new(0)) { |r, h| h[r[key]] += 1 }
  end

  # ------------------------------------------------------------------
  # mol_scope — the in-memory base supplies the molecule id set; the live
  # sample-rank join only attaches sid/svg/ordering for the page. The pure
  # sample join skips every filter clause (filtering already happened
  # above) so the inner subquery stays light.
  # ------------------------------------------------------------------

  def archive_mol_scope(input)
    return super unless archive_mv_eligible?(input)

    ids = mv_filter_rows(mv_base_rows(input), input).pluck(:molecule_id)
    return Molecule.none if ids.empty?

    pure_input = mv_pure_sample_input(input)
    sample_join = archive_build_sample_join(pure_input)
    order_sql = input.sort_dir == 'oldest' ? 's.max_published_at ASC' : 's.max_published_at DESC'
    Molecule.where(id: ids)
            .joins(sample_join)
            .order(Arel.sql(order_sql))
            .select('molecules.*, s.sample_svg_file, s.sid, s.max_published_at')
  end

  def archive_total_count(input)
    return super unless archive_mv_eligible?(input)

    mv_filter_rows(mv_base_rows(input), input).size
  rescue StandardError => e
    Rails.logger.warn("RepoArchive[MV] total_count failed: #{e.message}")
    0
  end

  # ------------------------------------------------------------------
  # Facets — each drops its own filter so the others stay toggleable. All
  # aggregate over the single in-memory base; no extra DB round-trips.
  # ------------------------------------------------------------------

  def archive_facets(input, total_count:)
    return super unless archive_mv_eligible?(input)

    base = mv_base_rows(input)
    facets = ARCHIVE_FACETS.index_with { |_| [] }
    archive_facet_years_mv!(facets, base, input)
    archive_facet_providers_mv!(facets, base, input)
    archive_facet_groups_mv!(facets, base, input)
    archive_facet_has_analyses_mv!(facets, base, input)
    archive_facet_embargoes_mv!(facets, base, input)
    archive_facets_post_process!(facets, total_count)
    facets
  end

  def archive_facet_years_mv!(facets, base, input)
    mv_count_by(mv_filter_rows(base, input, skip: :years), :year_published).each do |year, count|
      next if year.nil?

      facets[:years] << { value: year.to_s, label: year.to_s, count: count }
    end
  rescue StandardError => e
    Rails.logger.warn("RepoArchive[MV] facet years failed: #{e.message}")
  end

  def archive_facet_providers_mv!(facets, base, input)
    mv_count_by(mv_filter_rows(base, input, skip: :providers), :provider).each do |v, c|
      facets[:providers] << { value: v, label: v, count: c } if v.present?
    end
  rescue StandardError => e
    Rails.logger.warn("RepoArchive[MV] facet providers failed: #{e.message}")
  end

  def archive_facet_groups_mv!(facets, base, input)
    mv_count_by(mv_filter_rows(base, input, skip: :groups), :group_label).each do |v, c|
      facets[:groups] << { value: v, label: v, count: c } if v.present?
    end
  rescue StandardError => e
    Rails.logger.warn("RepoArchive[MV] facet groups failed: #{e.message}")
  end

  def archive_facet_has_analyses_mv!(facets, base, input)
    mv_count_by(mv_filter_rows(base, input, skip: :hasAnalyses), :has_analyses).each do |flag, count|
      v = flag ? 'yes' : 'no'
      label = flag ? 'With analyses' : 'No analyses'
      facets[:hasAnalyses] << { value: v, label: label, count: count }
    end
  rescue StandardError => e
    Rails.logger.warn("RepoArchive[MV] facet has_analyses failed: #{e.message}")
  end

  def archive_facet_embargoes_mv!(facets, base, input)
    mv_count_by(mv_filter_rows(base, input, skip: :embargoes), :embargo_label)
      .reject { |label, _| label.blank? }
      .sort_by { |label, count| [-count, label] }
      .first(50)
      .each { |v, c| facets[:embargoes] << { value: v, label: v, count: c } }
  rescue StandardError => e
    Rails.logger.warn("RepoArchive[MV] facet embargoes failed: #{e.message}")
  end

  # In MV mode the live sample-rank join only needs to surface sid/svg
  # for the molecules already filtered by the MV. Strip the filter
  # fragments so the inner subquery stays cheap; keep the public-
  # collection / completed-publication invariants (encoded in the
  # constant join structure).
  def mv_pure_sample_input(input)
    pure = input.dup
    pure.text_sql = ''
    pure.structure_sql = ''
    pure.year_clause = ''
    pure.has_analyses_clause = ''
    pure.embargo_clause = ''
    pure.provider_join = ''
    pure.group_join = ''
    pure.adv_sql = ''
    pure.label_sql = ''
    pure
  end
end
# rubocop:enable Metrics/ModuleLength
