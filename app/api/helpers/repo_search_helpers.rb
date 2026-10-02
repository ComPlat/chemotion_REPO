# frozen_string_literal: true

# rubocop:disable Metrics/ModuleLength, Style/OptionalBooleanParameter, Naming/MethodParameterName, Layout/LineLength

module RepoSearchHelpers
  extend Grape::API::Helpers
  ELEMENT_TYPES = { 'R' => 'Reaction', 'S' => 'Sample', 'D' => 'Container' }.freeze

  def suggest_pid(qry)
    return [] unless qry =~ /\ACR(R|S|D)-(\d+)\Z/

    typ = Regexp.last_match(1)
    pid = Regexp.last_match(2)
    element_type = ELEMENT_TYPES[typ]
    pids = Publication.where(
      "state = 'completed' and element_type = ? and id = ?", element_type, pid
    ).map do |pub|
      "CR#{typ}-#{pub.id}"
    end
    pids || []
  rescue StandardError => e
    Rails.logger.error("Error suggest_pid: #{e.message}")
  end

  def suggest_embargo(current_user, query)
    cols = Collection.all_embargos(current_user.id).where("label like '#{query}%'").order(:label)
    suggestions = cols.map { |col| { name: col.label, search_by_method: 'embargo' } }
    { suggestions: suggestions }
  rescue StandardError => e
    Rails.logger.error("Error suggest_embargo: #{e.message}")
    { suggestions: [] }
  end

  def repo_search(current_user, sample_ids, reaction_ids, page = 1)
    com_config = Rails.configuration.compound_opendata
    sentities = []
    ttl_mol_size = 0
    ssids = []

    params[:page] = page

    if sample_ids.present?
      sample_join = <<~SQL
        INNER JOIN (
          SELECT molecule_id, published_at max_published_at, sample_svg_file, id as sid
          FROM (
          SELECT samples.*, pub.published_at, rank() OVER (PARTITION BY molecule_id order by pub.published_at desc) as rownum
          FROM samples, publications pub
          WHERE pub.element_type='Sample' and pub.element_id=samples.id  and pub.deleted_at ISNULL
            and samples.id IN (#{sample_ids.join(',')})) s where rownum = 1
        ) s on s.molecule_id = molecules.id
      SQL

      select_sql = <<~SQL
        molecules.*, s.sample_svg_file, s.sid, s.max_published_at
      SQL

      ttl_mol = Molecule.joins(sample_join).order("s.max_published_at desc").select(select_sql)
      ttl_mol_size = ttl_mol.size
      reset_pagination_page(ttl_mol)
      slist = paginate(ttl_mol)
      sentities = Entities::MoleculePublicationListEntity.represent(slist, serializable: true)

      ssids = sentities.map { |e| e[:sid] }.compact.map(&:to_i)

      # Fetch embargo/publication metadata via LATERAL JOINs for paginated sids
      embargo_by_sid = {}
      if ssids.any?
        embargo_rows = ActiveRecord::Base.connection.exec_query(<<~SQL)
          SELECT s.sid,
            COALESCE(ana.ana_cnt, 0) AS ana_cnt,
            emb.label AS embargo,
            pub_meta.publication
          FROM unnest(ARRAY[#{ssids.join(',')}]::bigint[]) AS s(sid)
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
              AND c.ancestry IN (SELECT id::text FROM collections WHERE label = 'Published Elements')
            ORDER BY c.position ASC
            LIMIT 1
          ) emb ON true
          LEFT JOIN LATERAL (
            SELECT json_build_object(
              'id', p.id,
              'published_at', to_char(p.published_at, 'YYYY-MM-DD'),
              'author_name', p.taggable_data -> 'creators' -> 0 ->> 'name'
            ) AS publication
            FROM publications p
            WHERE p.element_type = 'Sample' AND p.element_id = s.sid AND p.deleted_at IS NULL
            LIMIT 1
          ) pub_meta ON true
        SQL
        embargo_by_sid = embargo_rows.each_with_object({}) do |r, h|
          pub = r['publication']
          pub = pub.is_a?(String) ? JSON.parse(pub) : (pub || {})
          h[r['sid'].to_i] = r.merge('publication' => pub)
        end
      end

      xvial_count_ssql = <<~SQL
        inner join element_tags e on e.taggable_id = samples.id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
      SQL
      x_cnt_sids = Sample.joins(xvial_count_ssql).where(id: ssids).distinct.pluck(:id) || []

      xvial_com_ssql = <<~SQL
        inner join molecules m on m.id = samples.molecule_id
        inner join com_xvial(true) a on a.x_inchikey = m.inchikey
      SQL
      x_com_sids = Sample.joins(xvial_com_ssql).where(id: ssids).distinct.pluck(:id) if com_config.present? && com_config.allowed_uids.include?(current_user&.id)

      sentities = sentities.each do |obj|
        sid_i = obj[:sid].to_i
        meta = embargo_by_sid[sid_i]
        obj[:ana_cnt] = meta ? meta['ana_cnt'].to_i : 0
        obj[:embargo] = meta ? (meta['embargo'] || '') : ''
        obj[:publication] = meta ? (meta['publication'].presence || {}) : {}
        obj[:xvial_count] = 1 if x_cnt_sids.include?(obj[:sid])
        obj[:xvial_com] = 1 if com_config.present? && com_config.allowed_uids.include?(current_user&.id) && (x_com_sids || []).include?(obj[:sid])
        obj[:xvial_archive] = get_xdata(obj[:inchikey], obj[:sid], true)
      end
    end

    reaction_entities = []
    ttl_reactions_size = 0
    final_reaction_ids = []

    if reaction_ids.present?
      filter_reactions = Reaction.where(id: reaction_ids)

      reaction_select_sql = <<~SQL
        reactions.id, reactions.name, reactions.reaction_svg_file,
        publications.id as pub_id,
        to_char(publications.published_at, 'YYYY-MM-DD') as published_at,
        publications.taggable_data
      SQL

      ttl_reactions = filter_reactions.joins(:publication).select(reaction_select_sql).order('publications.published_at desc')
      ttl_reactions_size = ttl_reactions.size
      reset_pagination_page(ttl_reactions)
      reaction_list = paginate(ttl_reactions)
      reaction_entities = Entities::ReactionPublicationListEntity.represent(reaction_list, serializable: true)
      final_reaction_ids = reaction_entities.map { |e| e[:id] }.compact.map(&:to_i)

      # Fetch embargo/ana_cnt metadata via LATERAL JOINs for paginated reaction ids
      embargo_by_rid = {}
      if final_reaction_ids.any?
        embargo_rows = ActiveRecord::Base.connection.exec_query(<<~SQL)
          SELECT r.rid,
            COALESCE(ana.ana_cnt, 0) AS ana_cnt,
            emb.label AS embargo
          FROM unnest(ARRAY[#{final_reaction_ids.join(',')}]::bigint[]) AS r(rid)
          LEFT JOIN LATERAL (
            SELECT COUNT(*) AS ana_cnt
            FROM publication_ontologies po
            WHERE po.element_type = 'Reaction' AND po.element_id = r.rid
          ) ana ON true
          LEFT JOIN LATERAL (
            SELECT c.label
            FROM collections c
            INNER JOIN collections_reactions cr ON cr.collection_id = c.id AND cr.reaction_id = r.rid AND cr.deleted_at IS NULL
            WHERE c.deleted_at IS NULL
              AND c.ancestry IN (SELECT id::text FROM collections WHERE label = 'Published Elements')
            ORDER BY c.position ASC
            LIMIT 1
          ) emb ON true
        SQL
        embargo_by_rid = embargo_rows.each_with_object({}) do |r, h|
          h[r['rid'].to_i] = r
        end
      end

      xvial_count_sql = <<~SQL
        inner join element_tags e on e.taggable_id = reactions_samples.sample_id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
      SQL
      reaction_x_cnt_ids = ReactionsSample.joins(xvial_count_sql).where(type: 'ReactionsProductSample', reaction_id: final_reaction_ids).distinct.pluck(:reaction_id) || []

      xvial_com_sql = <<~SQL
        inner join samples s on reactions_samples.sample_id = s.id and s.deleted_at is null
        inner join molecules m on m.id = s.molecule_id
        inner join com_xvial(true) a on a.x_inchikey = m.inchikey
      SQL
      reaction_x_com_ids = ReactionsSample.joins(xvial_com_sql).where(type: 'ReactionsProductSample', reaction_id: final_reaction_ids).distinct.pluck(:reaction_id) if com_config.present? && com_config.allowed_uids.include?(current_user&.id)

      reaction_entities = reaction_entities.each do |obj|
        rid_i = obj[:id].to_i
        meta = embargo_by_rid[rid_i]
        obj[:ana_cnt] = meta ? meta['ana_cnt'].to_i : 0
        obj[:embargo] = meta ? (meta['embargo'] || '') : ''
        obj[:xvial_count] = 1 if reaction_x_cnt_ids.include?(obj[:id])
        obj[:xvial_com] = 1 if com_config.present? && com_config.allowed_uids.include?(current_user&.id) && (reaction_x_com_ids || []).include?(obj[:id])
      end
    end

    {
      publicMolecules: {
        molecules: sentities,
        totalElements: ttl_mol_size,
        page: params[:page] || 1,
        perPage: page_size,
        ids: ssids
      },
      publicReactions: {
        reactions: reaction_entities,
        totalElements: ttl_reactions_size,
        page: params[:page] || 1,
        perPage: page_size,
        ids: final_reaction_ids
      }
    }
  rescue StandardError => e
    Rails.logger.error("Error repo search: #{e.message}")
    { publicMolecules: { molecules: [], totalElements: 0, page: 1, perPage: page_size, ids: [] },
      publicReactions: { reactions: [], totalElements: 0, page: 1, perPage: page_size, ids: [] } }
  end
end
