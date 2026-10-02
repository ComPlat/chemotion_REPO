# frozen_string_literal: true

# rubocop:disable Metrics/ModuleLength
# Live builders for the Molecule Archive search endpoint
# (RepoCompoundSearchAPI). Extracted from the endpoint so the MV-backed
# overlay (RepoArchiveFacetHelpersMv) can drop in alongside the same
# method names.
#
# Public surface used by the endpoint:
#   build_archive_input(params, public_collection_id, current_user_id)
#   archive_mv_eligible?(input)        # static false here; overlay tightens
#   archive_mol_scope(input)
#   archive_total_count(input)
#   archive_facets(input, total_count:)
#   archive_per_result_meta_by_sid(sids)
module RepoArchiveFacetHelpers
  extend Grape::API::Helpers

  ARCHIVE_FACETS = %i[years providers groups hasAnalyses embargoes].freeze

  ArchiveInput = Struct.new(
    :params, :public_collection_id, :current_user_id, :req_xvial,
    :sort_dir, :q_term,
    :archive_years, :archive_providers, :archive_groups,
    :archive_has_analyses, :archive_embargoes,
    :text_sql, :structure_sql, :structure_ids, :adv_sql, :adv_type, :label_sql,
    :year_clause, :provider_join, :group_join, :has_analyses_clause, :embargo_clause,
    keyword_init: true
  )

  # ------------------------------------------------------------------
  # Input parsing — shared by both paths.
  # ------------------------------------------------------------------

  def build_archive_input(params, public_collection_id, current_user_id)
    input = ArchiveInput.new(
      params: params,
      public_collection_id: public_collection_id,
      current_user_id: current_user_id,
      req_xvial: true,
      sort_dir: params[:sort].to_s,
      q_term: params[:q].to_s.strip,
      archive_years: (params[:archive_years] || []).compact_blank,
      archive_providers: (params[:archive_providers] || []).compact_blank,
      archive_groups: (params[:archive_groups] || []).compact_blank,
      archive_has_analyses: (params[:archive_has_analyses] || []).map(&:to_s),
      archive_embargoes: (params[:archive_embargoes] || []).compact_blank,
      text_sql: '', structure_sql: '', structure_ids: nil,
      adv_sql: '', adv_type: nil, label_sql: '',
      year_clause: '', provider_join: '', group_join: '',
      has_analyses_clause: '', embargo_clause: ''
    )
    archive_apply_text_sql(input)
    archive_apply_structure_sql(input)
    archive_apply_simple_clauses(input)
    archive_apply_adv_search(input)
    archive_apply_label_search(input)
    input
  end

  def archive_apply_text_sql(input)
    return if input.q_term.length <= 2

    like = "%#{ActiveRecord::Base.send(:sanitize_sql_like, input.q_term)}%"
    clause = 'AND (m.iupac_name ILIKE ? OR m.inchistring ILIKE ? OR m.inchikey ILIKE ? ' \
             'OR m.cano_smiles ILIKE ? OR m.sum_formular ILIKE ?)'
    input.text_sql = ActiveRecord::Base.send(:sanitize_sql_array, [clause, like, like, like, like, like])
  end

  def archive_apply_structure_sql(input) # rubocop:disable Metrics/AbcSize,Metrics/PerceivedComplexity
    molfile = input.params[:structure_query].to_s.strip
    return if molfile.empty?

    match = (input.params[:structure_match].presence || 'sub').downcase
    rel = if match == 'sim'
            threshold = (input.params[:tanimoto].presence || 0.7).to_f
            Sample.search_by_fingerprint_sim(molfile, threshold)
          else
            Sample.search_by_fingerprint_sub(molfile)
          end
    ids = rel.pluck(:id)
    input.structure_ids = ids
    input.structure_sql = if ids.empty?
                            'AND 1 = 0'
                          else
                            ActiveRecord::Base.send(:sanitize_sql_array, ['AND samples.id IN (?)', ids])
                          end
  rescue StandardError => e
    Rails.logger.warn("RepoArchive structure_query failed: #{e.message}")
    error!({ error: 'invalid_structure_query', message: e.message }, 400)
  end

  # rubocop:disable Layout/LineLength,Metrics/AbcSize,Metrics/CyclomaticComplexity,Metrics/MethodLength,Metrics/PerceivedComplexity
  def archive_apply_simple_clauses(input)
    if input.archive_years.any?
      input.year_clause = ActiveRecord::Base.send(
        :sanitize_sql_array,
        ['AND EXTRACT(YEAR FROM pub.published_at)::text IN (?)', input.archive_years],
      )
    end

    if input.archive_providers.any?
      input.provider_join = ActiveRecord::Base.send(
        :sanitize_sql_array,
        [
          "INNER JOIN element_tags et_pf ON et_pf.taggable_type = 'Sample' AND et_pf.taggable_id = samples.id " \
          "INNER JOIN compound_open_data_locals cod_pf ON cod_pf.x_data->>'xid' = et_pf.taggable_data->'xvial'->>'num' " \
          "AND cod_pf.x_data->>'provided_by' IN (?)",
          input.archive_providers,
        ],
      )
    end

    if input.archive_groups.any?
      input.group_join = ActiveRecord::Base.send(
        :sanitize_sql_array,
        [
          "INNER JOIN element_tags et_gf ON et_gf.taggable_type = 'Sample' AND et_gf.taggable_id = samples.id " \
          "INNER JOIN compound_open_data_locals cod_gf ON cod_gf.x_data->>'xid' = et_gf.taggable_data->'xvial'->>'num' " \
          "AND cod_gf.x_data->>'group' IN (?)",
          input.archive_groups,
        ],
      )
    end

    if input.archive_has_analyses.include?('yes') && input.archive_has_analyses.exclude?('no')
      input.has_analyses_clause = 'AND EXISTS (SELECT 1 FROM publication_ontologies po_f ' \
                                  "WHERE po_f.element_type = 'Sample' AND po_f.element_id = samples.id)"
    elsif input.archive_has_analyses.include?('no') && input.archive_has_analyses.exclude?('yes')
      input.has_analyses_clause = 'AND NOT EXISTS (SELECT 1 FROM publication_ontologies po_f ' \
                                  "WHERE po_f.element_type = 'Sample' AND po_f.element_id = samples.id)"
    end

    return unless input.archive_embargoes.any?

    input.embargo_clause = ActiveRecord::Base.send(
      :sanitize_sql_array,
      [
        "AND EXISTS (
          SELECT 1 FROM collections_samples csa_emb
          INNER JOIN collections c_emb
            ON c_emb.id = csa_emb.collection_id AND c_emb.deleted_at IS NULL
          WHERE csa_emb.sample_id = samples.id
            AND csa_emb.deleted_at IS NULL
            AND c_emb.label IN (?)
            AND EXISTS (
              SELECT 1 FROM collections pe
              WHERE pe.label = 'Published Elements'
                AND pe.deleted_at IS NULL
                AND c_emb.ancestry LIKE '%/' || pe.id::text || '/%'
            )
        )",
        input.archive_embargoes,
      ],
    )
  end
  # rubocop:enable Layout/LineLength,Metrics/AbcSize,Metrics/CyclomaticComplexity,Metrics/MethodLength,Metrics/PerceivedComplexity

  ADV_AUTHORS_JOIN = "INNER JOIN publication_authors pub_adv ON pub_adv.element_id = samples.id AND pub_adv.element_type = 'Sample' AND pub_adv.state = 'completed' AND pub_adv.author_id IN (?)" # rubocop:disable Layout/LineLength
  ADV_CONTRIBUTORS_JOIN = "INNER JOIN publications pub_adv_c ON pub_adv_c.element_id = samples.id AND pub_adv_c.element_type = 'Sample' AND pub_adv_c.deleted_at IS NULL AND pub_adv_c.state LIKE 'completed%' AND pub_adv_c.published_by IN (?)" # rubocop:disable Layout/LineLength
  ADV_ONTOLOGIES_JOIN = "INNER JOIN publication_ontologies pub_adv ON pub_adv.element_id = samples.id AND pub_adv.element_type = 'Sample' AND pub_adv.term_id IN (?)" # rubocop:disable Layout/LineLength

  def archive_apply_adv_search(input) # rubocop:disable Metrics/AbcSize,Metrics/CyclomaticComplexity,Metrics/PerceivedComplexity
    return unless input.params[:adv_flag] == true && input.params[:adv_type].present? && input.params[:adv_val].present?

    input.adv_type = input.params[:adv_type]
    safe_ids = input.params[:adv_val].map(&:to_i).reject(&:zero?)
    case input.adv_type
    when 'Authors'
      input.adv_sql = ActiveRecord::Base.sanitize_sql_array([ADV_AUTHORS_JOIN, safe_ids.map(&:to_s)])
    when 'Contributors'
      input.adv_sql = ActiveRecord::Base.sanitize_sql_array([ADV_CONTRIBUTORS_JOIN, safe_ids])
    when 'Ontologies'
      term_ids = input.params[:adv_val].grep(/\A[[:alpha:]]+:\d+\z/)
      input.adv_sql = ActiveRecord::Base.sanitize_sql_array([ADV_ONTOLOGIES_JOIN, term_ids]) if term_ids.any?
    when 'Embargo'
      param_sql = ActiveRecord::Base.sanitize_sql_array([' css.collection_id IN (?)', safe_ids])
      input.adv_sql = <<~SQL.squish
        INNER JOIN collections_samples css ON css.sample_id = samples.id AND css.deleted_at IS NULL
        AND #{param_sql}
      SQL
    end
  end

  def archive_apply_label_search(input)
    return unless input.params[:adv_type] == 'Label' && input.params[:label_val].present?

    input.adv_type = 'Label'
    input.label_sql = ActiveRecord::Base.sanitize_sql_array(
      ["AND pub.taggable_data->'user_labels' @> ?", input.params[:label_val].to_s],
    )
  end

  # ------------------------------------------------------------------
  # MV gate. Live module is never MV-eligible. The MV overlay tightens
  # this with the runtime flag check.
  # ------------------------------------------------------------------

  def archive_mv_eligible?(_input)
    false
  end

  # ------------------------------------------------------------------
  # Live SQL path. Each facet aggregation rebuilds the sample-rank
  # subquery while excluding its own filter clause so the facet's
  # other values stay visible and toggleable.
  # ------------------------------------------------------------------

  def archive_build_sample_join(input, skip: nil)
    <<~SQL.squish
      INNER JOIN (
        SELECT molecule_id, published_at AS max_published_at, sample_svg_file, id AS sid
        FROM (
          SELECT samples.id, samples.molecule_id, samples.sample_svg_file,
                 pub.id AS pub_id, pub.published_at,
                 rank() OVER (
                   PARTITION BY CASE WHEN m.inchikey IN ('DECOUPLED', 'DUMMY') THEN samples.id ELSE samples.molecule_id END
                   ORDER BY pub.published_at DESC
                 ) AS rownum
          FROM samples
          INNER JOIN molecules m ON m.id = samples.molecule_id
          INNER JOIN publications pub ON pub.element_type = 'Sample' AND pub.element_id = samples.id AND pub.deleted_at IS NULL #{input.label_sql}
          INNER JOIN collections_samples cs ON cs.collection_id = #{input.public_collection_id} AND cs.sample_id = samples.id AND cs.deleted_at IS NULL
          #{input.adv_sql}
          #{join_xvial_sql(input.req_xvial)}
          #{input.provider_join unless skip == :providers}
          #{input.group_join unless skip == :groups}
          WHERE 1 = 1
          #{input.text_sql}
          #{input.structure_sql}
          #{input.year_clause unless skip == :years}
          #{input.has_analyses_clause unless skip == :hasAnalyses}
          #{input.embargo_clause unless skip == :embargoes}
        ) ranked
        WHERE rownum = 1
      ) s ON s.molecule_id = molecules.id
    SQL
  end

  def archive_mol_scope(input)
    sample_join = archive_build_sample_join(input)
    select_sql = 'molecules.*, s.sample_svg_file, s.sid, s.max_published_at'
    order_sql = input.sort_dir == 'oldest' ? 's.max_published_at ASC' : 's.max_published_at DESC'
    Molecule.joins(sample_join).order(Arel.sql(order_sql)).select(select_sql)
  end

  def archive_total_count(input)
    sample_join = archive_build_sample_join(input)
    sql = "SELECT COUNT(*) AS cnt FROM molecules #{sample_join}"
    ActiveRecord::Base.connection.exec_query(sql).first['cnt'].to_i
  rescue StandardError => e
    Rails.logger.warn("RepoArchive total_count failed: #{e.message}")
    0
  end

  def archive_facets(input, total_count:)
    facets = ARCHIVE_FACETS.index_with { |_| [] }
    archive_facet_years!(facets, input)
    archive_facet_has_analyses!(facets, input)
    archive_facet_provider_group!(facets, input)
    archive_facet_embargoes!(facets, input)
    archive_facets_post_process!(facets, total_count)
    facets
  end

  def archive_facet_years!(facets, input)
    rows = archive_facet_query(input, :years, <<~SQL.squish)
      SELECT EXTRACT(YEAR FROM max_published_at)::text AS value, COUNT(*) AS cnt
      FROM base
      WHERE max_published_at IS NOT NULL
      GROUP BY value
    SQL
    rows.each do |r|
      v = r['value'].to_s
      next if v.empty?

      facets[:years] << { value: v, label: v, count: r['cnt'].to_i }
    end
  rescue StandardError => e
    Rails.logger.warn("RepoArchive facet years failed: #{e.message}")
  end

  def archive_facet_has_analyses!(facets, input)
    rows = archive_facet_query(input, :hasAnalyses, <<~SQL.squish, with_extra: true)
      ana AS (
        SELECT base.sid, COUNT(po.element_id) AS ana_cnt
        FROM base
        LEFT JOIN publication_ontologies po
          ON po.element_type = 'Sample' AND po.element_id = base.sid
        GROUP BY base.sid
      )
      SELECT CASE WHEN ana_cnt > 0 THEN 'yes' ELSE 'no' END AS value,
             COUNT(*) AS cnt
      FROM ana
      GROUP BY 1
    SQL
    rows.each do |r|
      v = r['value'].to_s
      next if v.empty?

      label = v == 'yes' ? 'With analyses' : 'No analyses'
      facets[:hasAnalyses] << { value: v, label: label, count: r['cnt'].to_i }
    end
  rescue StandardError => e
    Rails.logger.warn("RepoArchive facet has_analyses failed: #{e.message}")
  end

  def archive_facet_provider_group!(facets, input)
    conn = ActiveRecord::Base.connection
    return unless conn.table_exists?('compound_open_data_locals')

    [['provided_by', :providers], ['group', :groups]].each do |field, bucket|
      rows = archive_facet_query(input, bucket, <<~SQL.squish)
        SELECT cod.x_data->>'#{field}' AS value,
               COUNT(DISTINCT base.sid) AS cnt
        FROM base
        JOIN element_tags et
          ON et.taggable_type = 'Sample' AND et.taggable_id = base.sid
        JOIN compound_open_data_locals cod
          ON cod.x_data->>'xid' = et.taggable_data->'xvial'->>'num'
        WHERE NULLIF(cod.x_data->>'#{field}', '') IS NOT NULL
        GROUP BY 1
      SQL
      rows.each do |r|
        v = r['value'].to_s
        next if v.empty?

        facets[bucket] << { value: v, label: v, count: r['cnt'].to_i }
      end
    rescue StandardError => e
      Rails.logger.warn("RepoArchive facet #{field} failed: #{e.message}")
    end
  end

  def archive_facet_embargoes!(facets, input)
    rows = archive_facet_query(input, :embargoes, <<~SQL.squish)
      SELECT c.label AS value, COUNT(DISTINCT base.sid) AS cnt
      FROM base
      INNER JOIN collections_samples csa
        ON csa.sample_id = base.sid AND csa.deleted_at IS NULL
      INNER JOIN collections c
        ON c.id = csa.collection_id AND c.deleted_at IS NULL
      WHERE EXISTS (
        SELECT 1 FROM collections pe
        WHERE pe.label = 'Published Elements'
          AND pe.deleted_at IS NULL
          AND c.ancestry LIKE '%/' || pe.id::text || '/%'
      )
      AND c.label IS NOT NULL AND c.label <> ''
      GROUP BY c.label
      ORDER BY cnt DESC, c.label ASC
      LIMIT 50
    SQL
    rows.each do |r|
      v = r['value'].to_s
      next if v.empty?

      facets[:embargoes] << { value: v, label: v, count: r['cnt'].to_i }
    end
  rescue StandardError => e
    Rails.logger.warn("RepoArchive facet embargoes failed: #{e.message}")
  end

  def archive_facet_query(input, skip, body, with_extra: false)
    join = archive_build_sample_join(input, skip: skip)
    cte = "WITH base AS (SELECT s.sid, s.max_published_at FROM molecules #{join})"
    cte += ',' if with_extra
    sql = "#{cte}\n#{body}"
    ActiveRecord::Base.connection.exec_query(sql).to_a
  end

  def archive_facets_post_process!(facets, total_count)
    if facets[:groups].empty? && total_count.positive?
      facets[:groups] << { value: 'Stefan Bräse Group', label: 'Stefan Bräse Group', count: total_count }
    end

    facets[:years] = facets[:years].sort_by { |e| -e[:value].to_i }
    %i[providers groups hasAnalyses embargoes].each do |k|
      facets[k] = facets[k].sort_by { |e| [-e[:count], e[:label].to_s] }
    end
  end

  # ------------------------------------------------------------------
  # Per-page-result enrichment. Stays live in both paths: the page is
  # only ~10 sids and lateral joins are already cheap.
  # ------------------------------------------------------------------

  def archive_per_result_meta_by_sid(sids) # rubocop:disable Metrics/MethodLength
    sids = sids.compact.map(&:to_i).uniq
    return {} if sids.empty?

    rows = ActiveRecord::Base.connection.exec_query(<<~SQL.squish)
      SELECT s.sid,
        COALESCE(ana.ana_cnt, 0) AS ana_cnt,
        emb.label AS embargo,
        pub_meta.publication
      FROM unnest(ARRAY[#{sids.join(',')}]::bigint[]) AS s(sid)
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS ana_cnt
        FROM publication_ontologies po
        WHERE po.element_type = 'Sample' AND po.element_id = s.sid
      ) ana ON true
      LEFT JOIN LATERAL (
        SELECT c.label
        FROM collections c
        INNER JOIN collections_samples cs ON cs.collection_id = c.id AND cs.sample_id = s.sid
        WHERE c.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM collections pe
            WHERE pe.label = 'Published Elements' AND c.ancestry LIKE '%/' || pe.id::text || '/%'
          )
        ORDER BY c.position ASC
        LIMIT 1
      ) emb ON true
      LEFT JOIN LATERAL (
        SELECT json_build_object(
          'id', p.id,
          'published_at', to_char(p.published_at, 'YYYY-MM-DD'),
          'author_name', p.taggable_data -> 'creators' -> 0 ->> 'name',
          'contributor', NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
          'contributor_abbreviation', u.name_abbreviation,
          'contributor_affiliation', aff.output_full,
          'doi', p.taggable_data -> 'doi'
        ) AS publication
        FROM publications p
        LEFT JOIN users u ON u.id = p.published_by
        LEFT JOIN LATERAL (
          SELECT NULLIF(CONCAT_WS(', ',
            NULLIF(a."group", ''),
            NULLIF(a.department, ''),
            NULLIF(a.organization, ''),
            NULLIF(a.country, '')
          ), '') AS output_full
          FROM affiliations a
          INNER JOIN user_affiliations ua ON ua.affiliation_id = a.id
          WHERE ua.user_id = u.id
            AND ua.deleted_at IS NULL
            AND (ua.to IS NULL OR ua.to > NOW())
          ORDER BY ua.from DESC NULLS LAST
          LIMIT 1
        ) aff ON true
        WHERE p.element_type = 'Sample' AND p.element_id = s.sid AND p.deleted_at IS NULL
        LIMIT 1
      ) pub_meta ON true
    SQL
    rows.each_with_object({}) do |r, h|
      pub = r['publication']
      pub = pub.is_a?(String) ? JSON.parse(pub) : (pub || {})
      h[r['sid'].to_i] = r.merge('publication' => pub)
    end
  end
end
# rubocop:enable Metrics/ModuleLength
