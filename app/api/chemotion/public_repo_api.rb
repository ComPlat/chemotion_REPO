# frozen_string_literal: true

# rubocop: disable Metrics/ClassLength


module Chemotion
  class PublicRepoAPI < Grape::API
    include Grape::Kaminari
    helpers CompoundHelpers
    helpers PublicHelpers
    helpers ParamsHelpers

    namespace :public do
      get 'collection' do
        pub_coll = Collection.public_collection
        if current_user
          coll = SyncCollectionsUser.find_by(user_id: current_user.id, collection_id: pub_coll&.id)
          { id: coll&.id, is_sync_to_me: true  }
        else
          { id: nil }
        end
      end

      resource :pid do
        params do
          requires :id, type: Integer
        end
        desc "Query samples, reaction and datasets from publication id"
        post do
          pub = Publication.find(params[:id])
          return "/home" unless pub

          case pub.element_type
          when 'Sample'
            return "/molecules/#{pub.element.molecule_id}" if pub.state&.match(Regexp.union(%w[completed]))
            return "/review/review_sample/#{pub.element_id}" if %w[pending reviewed accepted].include?(pub.state) && pub.ancestry.nil?
            if %w[pending reviewed accepted].include?(pub.state) && !pub.ancestry.nil?
              root = pub.root
              return "/review/review_reaction/#{root.element_id}" if root && %w[pending reviewed accepted].include?(root.state)
            end
          when 'Reaction'
            return "/reactions/#{pub.element_id}" if pub.state&.match(Regexp.union(%w[completed]))
            return "/review/review_reaction/#{pub.element_id}" if %w[pending reviewed accepted].include?(pub.state)
          when 'Container'
            return "/datasets/#{pub.element_id}" if pub.state&.match(Regexp.union(%w[completed]))
            if %w[pending reviewed accepted].include?(pub.state) && !pub.ancestry.nil?
              root = pub.root
              return "/review/review_#{root.element_type=='Reaction'? 'reaction' : 'sample'}/#{root.element_id}" if root && %w[pending reviewed accepted].include?(root.state)
            end
          else
            return "/home"
          end
        end
      end

      namespace :find_adv_values do
        helpers do
          def query_authors(name)
            like = "#{ActiveRecord::Base.send(:sanitize_sql_like, name.to_s.downcase)}%"
            sql = ActiveRecord::Base.send(:sanitize_sql_array, [
              <<~SQL,
                SELECT u.id AS key,
                       u.first_name,
                       u.last_name,
                       u.first_name || chr(32) || u.last_name AS name,
                       u.first_name || chr(32) || u.last_name || chr(32) || '(' || u.name_abbreviation || ')' AS label
                FROM users u
                WHERE u.type IN ('Person', 'Group', 'Collaborator')
                  AND u.deleted_at IS NULL
                  AND u.id IN (
                    SELECT DISTINCT pa.author_id::integer
                    FROM publication_authors pa
                    WHERE pa.state = 'completed'
                  )
                  AND (
                    LOWER(u.first_name) ILIKE ?
                    OR LOWER(u.last_name) ILIKE ?
                    OR LOWER(u.first_name || ' ' || u.last_name) ILIKE ?
                  )
                ORDER BY u.last_name ASC, u.first_name ASC
                LIMIT 10
              SQL
              like, like, like,
            ])
            ActiveRecord::Base.connection.exec_query(sql).to_a
          end
          def query_contributors(name)
            like = "#{ActiveRecord::Base.send(:sanitize_sql_like, name.to_s.downcase)}%"
            sql = ActiveRecord::Base.send(:sanitize_sql_array, [
              <<~SQL,
                SELECT u.id AS key,
                       u.first_name,
                       u.last_name,
                       u.first_name || chr(32) || u.last_name AS name,
                       u.first_name || chr(32) || u.last_name || chr(32) || '(' || u.name_abbreviation || ')' AS label
                FROM users u
                WHERE u.type = 'Person'
                  AND u.deleted_at IS NULL
                  AND u.id IN (
                    SELECT DISTINCT p.published_by
                    FROM publications p
                    WHERE p.published_by IS NOT NULL
                      AND p.state = 'completed'
                      AND p.element_type IN ('Sample', 'Reaction')
                      AND p.deleted_at IS NULL
                  )
                  AND (
                    LOWER(u.first_name) ILIKE ?
                    OR LOWER(u.last_name) ILIKE ?
                    OR LOWER(u.first_name || ' ' || u.last_name) ILIKE ?
                  )
                ORDER BY u.last_name ASC, u.first_name ASC
                LIMIT 10
              SQL
              like, like, like,
            ])
            ActiveRecord::Base.connection.exec_query(sql).to_a
          end
          def query_ontologies(name)
            result = PublicationOntologies.where('LOWER(ontologies) ILIKE ? ',"%#{params[:name]}%").limit(3)
            .select(
              <<~SQL
              term_id as key, label, label as name
              SQL
            ).distinct
          end
          def query_embargo(name)
            Collection.all_embargos(current_user&.id).where("LOWER(label) ILIKE '#{ActiveRecord::Base.send(:sanitize_sql_like, params[:name])}%'").limit(10)
            .select(
              <<~SQL
              id as key, label, label as name
              SQL
            )
          end
        end
        desc 'Find top 3 matched advanced values'
        params do
          requires :name, type: String, allow_blank: false, regexp: /^[\w]+([\w -]*)*$/
          requires :adv_type, type: String, allow_blank: false, desc: 'Type', values: %w[Authors Contributors Ontologies Embargo]
        end
        get do
          result = case params[:adv_type]
                   when 'Authors'
                     query_authors(params[:name])
                   when 'Contributors'
                     query_contributors(params[:name])
                   when 'Ontologies'
                     query_ontologies(params[:name])
                   when 'Embargo'
                     query_embargo(params[:name])
                   else
                     []
                   end
          { result: result }
        end
      end

      resource :inchikey do
        params do
          requires :inchikey, type: String
          optional :type, type: String # value: []
          optional :version, type: String
        end
        desc "Query samples and datasets from inchikey and type"
        post do
          inchikey = params[:inchikey]
          molecule = Molecule.find_by(inchikey: inchikey)
          return "/home" unless molecule

          type = params[:type]
          return "/molecules/#{molecule.id.to_s}" if type.empty?

          version = params[:version] ? params[:version] : ""
          analyses = Collection.public_collection&.samples
            .where("samples.molecule_id = ?", molecule.id.to_s)
            .map(&:analyses).flatten

          analyses_filtered = analyses&.select { |a|
            em = a.extended_metadata
            check = em['kind'].to_s.gsub(/\s/, '') == type
            check = check && (em['analysis_version'] || '1') == version unless version.empty?
            check
          }
          analysis = analyses_filtered.first
          return "/datasets/#{analysis.id.to_s}"
        end
      end

      resource :molecules do
        desc 'Return PUBLIC serialized molecules'
        params do
          optional :page, type: Integer, desc: 'page'
          optional :pages, type: Integer, desc: 'pages'
          optional :per_page, type: Integer, desc: 'per page'
          optional :adv_flag, type: Boolean, desc: 'advanced search?'
          optional :adv_type, type: String, desc: 'advanced search type', values: %w[Authors Contributors Ontologies Embargo Label]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
          optional :label_val, type: Integer, desc: 'label_val'
          optional :req_xvial, type: Boolean, default: false, desc: 'xvial is required or not'
        end
        paginate per_page: 10, offset: 0, max_per_page: 100
        get '/' do
          public_collection_id = Collection.public_collection_id
          adv_search = ''
          req_xvial = params[:req_xvial]
          if params[:adv_flag] == true && params[:adv_type].present? && params[:adv_val].present?
            safe_ids = params[:adv_val].map(&:to_i).reject(&:zero?)
            case params[:adv_type]
            when 'Authors'
              adv_search = ActiveRecord::Base.sanitize_sql_array([
                'INNER JOIN publication_authors pub_adv ON pub_adv.element_id = samples.id AND pub_adv.element_type = \'Sample\' AND pub_adv.state = \'completed\' AND pub_adv.author_id IN (?)',
                safe_ids.map(&:to_s)
              ])
            when 'Contributors'
              adv_search = ActiveRecord::Base.sanitize_sql_array([
                'INNER JOIN publications pub_adv_c ON pub_adv_c.element_id = samples.id AND pub_adv_c.element_type = \'Sample\' AND pub_adv_c.deleted_at IS NULL AND pub_adv_c.state LIKE \'completed%\' AND pub_adv_c.published_by IN (?)',
                safe_ids
              ])
            when 'Ontologies'
              term_ids = params[:adv_val].select { |v| v.match?(/\A[[:alpha:]]+:\d+\z/) }
              adv_search = ActiveRecord::Base.sanitize_sql_array([
                'INNER JOIN publication_ontologies pub_adv ON pub_adv.element_id = samples.id AND pub_adv.element_type = \'Sample\' AND pub_adv.term_id IN (?)',
                term_ids
              ]) if term_ids.any?
            when 'Embargo'
              param_sql = ActiveRecord::Base.sanitize_sql_array([' css.collection_id IN (?)', safe_ids])
              adv_search = <<~SQL
                INNER JOIN collections_samples css ON css.sample_id = samples.id AND css.deleted_at IS NULL
                AND #{param_sql}
              SQL
            end
          end
          label_search = ''
          if params[:adv_type] == 'Label' && params[:label_val].present?
            label_search = ActiveRecord::Base.sanitize_sql_array(
              ["AND pub.taggable_data->'user_labels' @> ?", params[:label_val].to_s]
            )
          end
          sample_join = <<~SQL
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
                INNER JOIN publications pub ON pub.element_type = 'Sample' AND pub.element_id = samples.id AND pub.deleted_at IS NULL #{label_search}
                INNER JOIN collections_samples cs ON cs.collection_id = #{public_collection_id} AND cs.sample_id = samples.id AND cs.deleted_at IS NULL
                #{adv_search}
                #{join_xvial_sql(req_xvial)}
              ) ranked
              WHERE rownum = 1
            ) s ON s.molecule_id = molecules.id
          SQL

          embargo_sql = <<~SQL
            molecules.*,
            s.sample_svg_file,
            s.sid,
            s.max_published_at
          SQL

          # Paginate on a simple scope (no lateral joins) so Kaminari's COUNT works cleanly
          mol_scope = Molecule.joins(sample_join).order('s.max_published_at DESC').select(embargo_sql)
          reset_pagination_page(mol_scope)
          list = paginate(mol_scope)

          entities = Entities::MoleculePublicationListEntity.represent(list, serializable: true)
          sids = entities.map { |e| e[:sid] }.compact.map(&:to_i)

          # Fetch embargo metadata for only this page's ~10 rows using lateral joins
          embargo_by_sid = {}
          if sids.any?
            embargo_rows = ActiveRecord::Base.connection.exec_query(<<~SQL)
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
                  'doi', p.taggable_data -> 'doi'
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

          com_config = Rails.configuration.compound_opendata
          xvial_count_sql = <<~SQL
            INNER JOIN element_tags e ON e.taggable_type = 'Sample' AND e.taggable_id = samples.id
              AND e.taggable_data -> 'xvial' IS NOT NULL AND e.taggable_data -> 'xvial' ->> 'num' != ''
          SQL
          x_cnt_ids = req_xvial ? sids.uniq : (Sample.joins(xvial_count_sql).where(id: sids).distinct.pluck(:id) || [])
          xvial_com_sql = get_xvial_sql(req_xvial)
          x_com_ids = Sample.joins(xvial_com_sql).where(id: sids).distinct.pluck(:id) if com_config.present? && com_config.allowed_uids.include?(current_user&.id)

          x_cnt_set = x_cnt_ids.to_set
          x_com_set = (x_com_ids || []).to_set
          show_xvial_com = com_config.present? && com_config.allowed_uids.include?(current_user&.id)

          entities.each do |obj|
            sid_i = obj[:sid].to_i
            meta = embargo_by_sid[sid_i]
            obj[:ana_cnt] = meta ? meta['ana_cnt'].to_i : 0
            obj[:embargo] = meta ? (meta['embargo'] || '') : ''
            obj[:publication] = meta ? (meta['publication'].presence || {}) : {}
            obj[:xvial_count] = 1 if x_cnt_set.include?(sid_i)
            obj[:xvial_com] = 1 if show_xvial_com && x_com_set.include?(sid_i)
            obj[:xvial_archive] = get_xdata(obj[:inchikey], sid_i, req_xvial)
          end
          { molecules: entities }
        end
      end

      resource :reactions do
        desc 'Return PUBLIC serialized reactions'
        params do
          optional :page, type: Integer, desc: 'page'
          optional :pages, type: Integer, desc: 'pages'
          optional :per_page, type: Integer, desc: 'per page'
          optional :adv_flag, type: Boolean, desc: 'is it advanced search?'
          optional :adv_type, type: String, desc: 'advanced search type', values: %w[Authors Contributors Ontologies Embargo Label]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
          optional :label_val, type: Integer, desc: 'label_val'
          optional :scheme_only, type: Boolean, desc: 'is it a scheme-only reaction?', default: false
        end
        paginate per_page: 10, offset: 0, max_per_page: 100
        get '/' do
          adv_search = ''
          if params[:adv_flag] == true && params[:adv_type].present? && params[:adv_val].present?
            safe_ids = params[:adv_val].map(&:to_i).reject(&:zero?)
            case params[:adv_type]
            when 'Authors'
              adv_search = ActiveRecord::Base.sanitize_sql_array([
                'INNER JOIN publication_authors pub_adv ON pub_adv.element_id = reactions.id AND pub_adv.element_type = \'Reaction\' AND pub_adv.state = \'completed\' AND pub_adv.author_id IN (?)',
                safe_ids.map(&:to_s)
              ])
            when 'Contributors'
              adv_search = ActiveRecord::Base.sanitize_sql_array([
                'INNER JOIN publications pub_adv_c ON pub_adv_c.element_id = reactions.id AND pub_adv_c.element_type = \'Reaction\' AND pub_adv_c.deleted_at IS NULL AND pub_adv_c.state LIKE \'completed%\' AND pub_adv_c.published_by IN (?)',
                safe_ids
              ])
            when 'Ontologies'
              term_ids = params[:adv_val].select { |v| v.match?(/\A[[:alpha:]]+:\d+\z/) }
              adv_search = ActiveRecord::Base.sanitize_sql_array([
                'INNER JOIN publication_ontologies pub_adv ON pub_adv.element_id = reactions.id AND pub_adv.element_type = \'Reaction\' AND pub_adv.term_id IN (?)',
                term_ids
              ]) if term_ids.any?
            when 'Embargo'
              param_sql = ActiveRecord::Base.sanitize_sql_array([' cr.collection_id IN (?)', safe_ids])
              adv_search = <<~SQL
                INNER JOIN collections_reactions cr ON cr.reaction_id = reactions.id AND cr.deleted_at IS NULL
                AND #{param_sql}
              SQL
            end
          end
          com_config = Rails.configuration.compound_opendata
          embargo_sql = <<~SQL
            reactions.id,
            reactions.name,
            reactions.reaction_svg_file,
            publications.id AS pub_id,
            to_char(publications.published_at, 'YYYY-MM-DD') AS published_at,
            publications.taggable_data,
            COALESCE(ana.ana_cnt, 0) AS ana_cnt,
            emb.label AS embargo,
            etag.new_version
          SQL

          embargo_joins = <<~SQL
            LEFT JOIN LATERAL (
              SELECT COUNT(*) AS ana_cnt
              FROM publication_ontologies po
              WHERE po.element_type = 'Reaction' AND po.element_id = reactions.id
            ) ana ON true
            LEFT JOIN LATERAL (
              SELECT c.label
              FROM collections c
              INNER JOIN collections_reactions cr2 ON cr2.collection_id = c.id AND cr2.reaction_id = reactions.id AND cr2.deleted_at IS NULL
              WHERE c.deleted_at IS NULL
                AND EXISTS (
                  SELECT 1 FROM collections pe
                  WHERE pe.label = 'Published Elements' AND c.ancestry LIKE '%/' || pe.id::text || '/%'
                )
              ORDER BY c.position ASC
              LIMIT 1
            ) emb ON true
            LEFT JOIN LATERAL (
              SELECT taggable_data -> 'new_version' -> 'id' AS new_version
              FROM element_tags
              WHERE taggable_type = 'Reaction' AND taggable_id = reactions.id
              LIMIT 1
            ) etag ON true
          SQL

          if params[:scheme_only]
            col_scope = Collection.scheme_only_reactions_collection.reactions
                          .joins(adv_search).joins(:publication).joins(embargo_joins)
                          .select(embargo_sql).order('publications.published_at DESC')
          else
            col_scope = Collection.public_collection.reactions
                          .joins(adv_search).joins(:publication).joins(embargo_joins)
                          .select(embargo_sql).order('publications.published_at DESC')
          end
          if params[:adv_type] == 'Label' && params[:label_val].present?
            col_scope = col_scope.where("publications.taggable_data->'user_labels' @> ?", params[:label_val].to_s)
          end
          reset_pagination_page(col_scope)
          list = paginate(col_scope)
          entities = Entities::ReactionPublicationListEntity.represent(list, serializable: true)

          ids = entities.map { |e| e[:id] }.compact.map(&:to_i)

          embargo_by_id = {}
          if ids.any?
            embargo_rows = ActiveRecord::Base.connection.exec_query(<<~SQL)
              SELECT r.id,
                COALESCE(ana.ana_cnt, 0) AS ana_cnt,
                emb.label AS embargo,
                etag.new_version
              FROM unnest(ARRAY[#{ids.join(',')}]::bigint[]) AS r(id)
              LEFT JOIN LATERAL (
                SELECT COUNT(*) AS ana_cnt
                FROM publication_ontologies po
                WHERE po.element_type = 'Reaction' AND po.element_id = r.id
              ) ana ON true
              LEFT JOIN LATERAL (
                SELECT c.label
                FROM collections c
                INNER JOIN collections_reactions cr2 ON cr2.collection_id = c.id AND cr2.reaction_id = r.id AND cr2.deleted_at IS NULL
                WHERE c.deleted_at IS NULL
                  AND EXISTS (
                    SELECT 1 FROM collections pe
                    WHERE pe.label = 'Published Elements' AND c.ancestry LIKE '%/' || pe.id::text || '/%'
                  )
                ORDER BY c.position ASC
                LIMIT 1
              ) emb ON true
              LEFT JOIN LATERAL (
                SELECT taggable_data -> 'new_version' -> 'id' AS new_version
                FROM element_tags
                WHERE taggable_type = 'Reaction' AND taggable_id = r.id
                LIMIT 1
              ) etag ON true
            SQL
            embargo_by_id = embargo_rows.each_with_object({}) do |r, h|
              h[r['id'].to_i] = r
            end
          end

          xvial_count_sql = <<~SQL
            INNER JOIN element_tags e ON e.taggable_id = reactions_samples.sample_id
              AND e.taggable_data -> 'xvial' IS NOT NULL AND e.taggable_data -> 'xvial' ->> 'num' != ''
          SQL
          x_cnt_ids = ReactionsSample.joins(xvial_count_sql).where(type: 'ReactionsProductSample', reaction_id: ids).distinct.pluck(:reaction_id) || []

          xvial_com_sql = <<~SQL
            INNER JOIN samples s ON reactions_samples.sample_id = s.id AND s.deleted_at IS NULL
            INNER JOIN molecules m ON m.id = s.molecule_id
            INNER JOIN com_xvial(true) a ON a.x_inchikey = m.inchikey
          SQL
          x_com_ids = ReactionsSample.joins(xvial_com_sql).where(type: 'ReactionsProductSample', reaction_id: ids).distinct.pluck(:reaction_id) if com_config.present? && com_config.allowed_uids.include?(current_user&.id)

          x_cnt_set = x_cnt_ids.to_set
          x_com_set = (x_com_ids || []).to_set
          show_xvial_com = com_config.present? && com_config.allowed_uids.include?(current_user&.id)

          entities.each do |obj|
            id_i = obj[:id].to_i
            meta = embargo_by_id[id_i]
            obj[:ana_cnt] = meta ? meta['ana_cnt'].to_i : 0
            obj[:embargo] = meta ? (meta['embargo'] || '') : ''
            obj[:new_version] = meta['new_version'] if meta && meta['new_version']
            obj[:xvial_count] = 1 if x_cnt_set.include?(id_i)
            obj[:xvial_com] = 1 if show_xvial_com && x_com_set.include?(id_i)
          end

          { reactions: entities }
        end
      end

      resource :publicElement do
        desc "Return PUBLIC serialized elements (Reaction, sample)"
        paginate per_page: 10, offset: 0, max_per_page: 100
        get '/', each_serializer: MoleculeGuestListSerializer do
          public_collection_id = Collection.public_collection_id
          sample_join = <<~SQL
            INNER JOIN (
              SELECT molecule_id, max(pub.published_at) max_updated_at
              FROM samples
              INNER JOIN collections_samples cs on cs.collection_id = #{public_collection_id} and cs.sample_id = samples.id and cs.deleted_at ISNULL
              INNER JOIN publications pub on pub.element_type='Sample' and pub.element_id=samples.id  and pub.deleted_at ISNULL
              GROUP BY samples.molecule_id
            ) s on s.molecule_id = molecules.id
          SQL
          mol_scope = Molecule.joins(sample_join).order("s.max_updated_at desc")
          reset_pagination_page(mol_scope)
          paginate(mol_scope)
        end
      end

      resource :last_published do
        desc "Return Last PUBLIC serialized entities"
        get do
          res = {
            last_published: {}
          }
          s_pub = Publication.where(element_type: 'Sample', state: 'completed').order(:published_at).last
          unless s_pub.nil?
            sample = s_pub.element
            res[:last_published][:sample] = {
              id: sample.id,
              sample_svg_file: sample.sample_svg_file,
              molecule: sample.molecule,
              tag: s_pub.taggable_data,
              contributor: User.find(s_pub.published_by).name
            }
          end

          r_pub = Publication.where(element_type: 'Reaction', state: 'completed').order(:published_at).last
          unless r_pub.nil?
            reaction = r_pub.element
            res[:last_published][:reaction] = {
              id: reaction.id,
              reaction_svg_file: reaction.reaction_svg_file,
              tag: r_pub.taggable_data,
              contributor: User.find(r_pub.published_by).name
            }
          end
          res
          # { last_published: { sample: { id: sample.id, sample_svg_file: sample.sample_svg_file, molecule: sample.molecule, tag: s_pub.taggable_data, contributor: User.with_deleted.find(s_pub.published_by).name  },
          # reaction: { id: reaction.id, reaction_svg_file: reaction.reaction_svg_file, tag: r_pub.taggable_data, contributor: User.with_deleted.find(r_pub.published_by).name } } }
        end
      end

      resource :last_published_sample do
        desc "Return PUBLIC serialized molecules"
        get do
          sample = Collection.public_collection.samples.includes(:molecule, :residues).
          where("samples.id not in (select reactions_samples.sample_id from reactions_samples where type != 'ReactionsProductSample')").order(:created_at).last
          #TODO have and use a dedicated serializer for public sample
          sample
        end
      end

      resource :dataset do
        desc 'Return PUBLISHED serialized dataset'
        params do
          requires :id, type: Integer, desc: 'Dataset id'
        end
        get do
          dataset = Container.find(params[:id])
          sample = dataset.root.containable
          cids = sample.collections.pluck :id
          if cids.include?(Collection.public_collection_id)
            molecule = sample.molecule if sample.class.name == 'Sample'

            ## ds_json = ContainerSerializer.new(dataset).serializable_hash.deep_symbolize_keys
            ds_json = Entities::ContainerEntity.represent(dataset)
            # ds_json[:dataset_doi] = dataset.full_doi
            # ds_json[:pub_id] = dataset.publication&.id

            ## For Versioning
            # ds_json[:concept_doi] = dataset.concept_doi
            # ds_json[:versions] = dataset.versions.map do |container|
            #   {doi: container.full_doi, id: container.id }
            # end

            res = {
              dataset: ds_json,
              isLogin: current_user.present?,
              isCI: current_user.present? && current_user.id == User.chemotion_user.id,
              element: sample.is_a?(Sample) ? Entities::SampleEntity.represent(sample) : Entities::ReactionEntity.represent(sample),
              sample_svg_file: sample.is_a?(Sample) ? sample.sample_svg_file : sample.reaction_svg_file,
              molecule: {
                sum_formular: molecule&.sum_formular,
                molecular_weight: molecule&.molecular_weight,
                cano_smiles: molecule&.cano_smiles,
                inchistring: molecule&.inchistring,
                inchikey: molecule&.inchikey,
                molecule_svg_file: molecule&.molecule_svg_file,
                pubchem_cid: molecule&.tag&.taggable_data && molecule&.tag&.taggable_data["pubchem_cid"]
              },
              license: dataset.tag&.taggable_data&.dig("publication", "license") || 'CC BY-SA',
              publication: {
                author_ids: sample&.publication&.taggable_data['author_ids'] || [],
                creators: sample&.publication&.taggable_data['creators'] || [],
                affiliation_ids: sample&.publication&.taggable_data['affiliation_ids'] || [],
                affiliations: sample&.publication&.taggable_data['affiliations'] || {},
                published_at: sample&.publication&.taggable_data['published_at'],
              }
            }
          else
            res = nil
          end

          return res
        end
      end

      resource :embargo do
        desc "Return PUBLISHED serialized collection"
        params do
          requires :id, type: Integer, desc: "collection id"
        end
        get do
          pub = Publication.find_by(element_type: 'Collection', element_id: params[:id], state: 'completed')
          pub&.review = nil
          { col: pub }
        end
      end

      resource :col_list do
        after_validation do
          @embargo_collection = Collection.find(params[:collection_id])
          @pub = @embargo_collection.publication
          error!('401 Unauthorized', 401) if @pub.nil?

          if @pub.state != 'completed'
            is_reviewer = User.reviewer_ids.include?(current_user&.id)
            is_submitter = (@pub.published_by == current_user&.id || @pub.review&.dig('submitters')&.include?(current_user&.id)) && SyncCollectionsUser.find_by(user_id: current_user.id, collection_id: @embargo_collection.id).present?
            is_anonymous = current_user&.type == 'Anonymous' && SyncCollectionsUser.find_by(user_id: current_user.id, collection_id: @embargo_collection.id).present?
            error!('401 Unauthorized', 401) unless current_user.present? && (is_reviewer || is_submitter || is_anonymous)
          end
          @is_reviewer = User.reviewer_ids.include?(current_user&.id)
        end
        get do
          anasql = <<~SQL
            publications.*, (select count(*) from publication_ontologies po where po.element_type = publications.element_type and po.element_id = publications.element_id) as ana_cnt
          SQL
          sample_list = Publication.where(ancestry: '/', element: @embargo_collection.samples).select(anasql).order(updated_at: :desc)
          reaction_list = Publication.where(ancestry: '/', element: @embargo_collection.reactions).select(anasql).order(updated_at: :desc)
          list = sample_list + reaction_list
          elements = []
          list.each do |e|
            element_type = e.element&.class&.name
            u = User.with_deleted.find(e.published_by) unless e.published_by.nil?
            svg_file = e.element.sample_svg_file if element_type == 'Sample'
            title = e.element.short_label if element_type == 'Sample'

            svg_file = e.element.reaction_svg_file if element_type == 'Reaction'
            title = e.element.short_label if element_type == 'Reaction'

            scheme_only = element_type == 'Reaction' && e.taggable_data && e.taggable_data['scheme_only']
            elements.push(
              id: e.element_id, pub_id: e.id, svg: svg_file, type: element_type, title: title, published_at: e.published_at&.strftime('%Y-%m-%d'),
              published_by: u&.name, submit_at: e.created_at, state: e.state, scheme_only: scheme_only, ana_cnt: e.ana_cnt
            )
          end

          { elements: elements, embargo: @pub, embargo_id: params[:collection_id], current_user: { id: current_user&.id, type: current_user&.type, is_reviewer: @is_reviewer } }
        end
      end

      resource :col_element do
        params do
          requires :collection_id, type: Integer, desc: "collection id"
          requires :el_id, type: Integer, desc: "element id"
        end
        after_validation do
          @embargo_collection = Collection.find(params[:collection_id])
          pub = @embargo_collection.publication
          error!('401 Unauthorized', 401) if pub.nil?

          if pub.state != Publication::STATE_COMPLETED
            error!('401 Unauthorized', 401) unless current_user.present? && (User.reviewer_ids.include?(current_user.id) || pub.published_by == current_user.id)
          end

        end
        get do
          if params[:el_type] == 'Reaction'
            return get_pub_reaction(params[:el_id])
          elsif params[:el_type] == 'Sample'
            sample = Sample.find(params[:el_id])
            return get_pub_molecule(sample.molecule_id)
          end
        end
      end

      resource :reaction do
        desc "Return PUBLISHED serialized reaction"
        params do
          requires :id, type: Integer, desc: "Reaction id"
        end
        after_validation do
          reaction = Reaction.find_by(id: params[:id])
          pub = reaction&.publication
          error!('404 Reaction not found', 404) unless reaction && pub

          error!('404 Is not published yet', 404) unless pub&.state === Publication::STATE_COMPLETED
        end
        get do
          r = CollectionsReaction.where(reaction_id: params[:id], collection_id: [Collection.public_collection_id, Collection.scheme_only_reactions_collection.id])
          return nil unless r.present?

          return get_pub_reaction(params[:id])
        end
      end


      resource :molecule do
        desc 'Return serialized molecule with list of PUBLISHED dataset'
        params do
          requires :id, type: Integer, desc: 'Molecule id'
          optional :pid, type: Integer, desc: 'Publication id'
          optional :suffix, type: String, desc: 'Suffix'
          optional :adv_flag, type: Boolean, desc: 'advanced search flag'
          optional :adv_type, type: String, desc: 'advanced search type', allow_blank: true, values: %w[Authors Contributors Ontologies Embargo Label]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
          optional :label_val, type: Integer, desc: 'label_val'
        end
        get do
          if params[:pid].present?
            sample = Publication.find_by(id: params[:pid], element_type: 'Sample')&.element
            if sample.nil? || !sample.decoupled
              get_pub_molecule(params[:id], params[:adv_flag], params[:adv_type], params[:adv_val], params[:label_val])
            else
              get_pub_sample(params[:id], params[:pid], params[:adv_flag], params[:adv_type], params[:adv_val], params[:label_val])
            end
          elsif params[:suffix].present?
            doi = Doi.find_by(suffix: params[:suffix], doiable_type: 'Sample')
            if doi.nil?
              get_pub_molecule(params[:id], params[:adv_flag], params[:adv_type], params[:adv_val], params[:label_val])
            else
              sample = doi.doiable
              if sample.nil? || !sample.decoupled
                get_pub_molecule(params[:id], params[:adv_flag], params[:adv_type], params[:adv_val], params[:label_val])
              else
                pid = Publication.find_by(element_type: 'Sample', state: 'completed', doi_id: doi.id)&.id
                if pid.nil?
                  get_pub_molecule(params[:id], params[:adv_flag], params[:adv_type], params[:adv_val], params[:label_val])
                else
                  get_pub_sample(params[:id], pid, params[:adv_flag], params[:adv_type], params[:adv_val], params[:label_val])
                end
              end
            end
          else
            get_pub_molecule(params[:id], params[:adv_flag], params[:adv_type], params[:adv_val], params[:label_val])
          end
        end
      end

      resource :files do
        desc 'Return Base64 encoded files'
        params do
          requires :ids, type: Array[Integer], desc: 'File ids'
        end
        post do
          files = params[:ids].map do |a_id|
            att = Attachment.find(a_id)
            att&.container&.parent&.publication&.state == 'completed' ? raw_file_obj(att) : nil
          end
          { files: files }
        end
      end

      resource :download do
        desc 'download publication file'
        params do
          requires :id, type: Integer, desc: 'Id'
        end
        resource :attachment do
          desc 'download publication attachment'
          after_validation do
            @attachment = Attachment.find_by(id: params[:id])
            error!('404 Attachment not found', 404) unless @attachment
            if @attachment.attachable_type == 'SegmentProps'
              segment = Labimotion::Segment.find_by(id: @attachment.attachable_id)
              @publication = segment&.element&.publication
            else
              @publication = @attachment&.container&.parent&.publication
            end
            error!('404 Is not published yet', 404) unless @publication&.state&.include?('completed')
          end
          get do
            content_type 'application/octet-stream'
            header['Content-Disposition'] = "attachment; filename=#{@attachment.filename}"
            env['api.format'] = :binary
            @attachment.read_file
          end
        end
        resource :dataset do
          desc 'download publication dataset as zip'
          after_validation do
            @container = Container.find_by(id: params[:id])
            error!('404 Dataset not found', 404) unless @container
            @publication = @container&.parent&.publication
            error!('404 Is not published yet', 404) unless @publication&.state&.include?('completed')
          end
          get do
            content_type 'application/zip, application/octet-stream'
            parent_name = @container.parent&.name.to_s.gsub(/\s+/, '_')
            container_name = @container.name.gsub(/\s+/, '_')
            filename = "#{parent_name}-#{container_name}.zip"
            filename = URI.encode_www_form_component(filename)
            header['Content-Disposition'] = "attachment; filename=#{filename}"
            env['api.format'] = :binary
            zip_f = Zip::OutputStream.write_buffer do |zip|
              file_text = ''
              @container.attachments.each do |att|
                begin
                  file_content = att.read_file
                  next if file_content.nil? || !file_content.present?
                rescue Shrine::Error => e
                  Rails.logger.error "Failed to read file for attachment #{att.id}: #{e.message}"
                  next
                end

                file_text += add_to_zip_and_update_file_text(zip, att.filename, file_content)

                next unless att.annotated?

                begin
                  annotated_file_name = "#{File.basename(att.filename, '.*')}_annotated#{File.extname(att.filename)}"
                  File.open(att.annotated_file_location) do |annotated_file|
                    annotated_file_content = annotated_file.read
                    file_text += add_to_zip_and_update_file_text(zip, annotated_file_name, annotated_file_content)
                  end
                rescue => e
                  Rails.logger.error "Failed to add annotated file for attachment #{att.id}: #{e.message}"
                end
              end

              file_text += export_and_add_to_zip(params[:id], zip)

              hyperlinks_text = ''
              JSON.parse(@container.extended_metadata.fetch('hyperlinks', '[]')).each do |link|
                hyperlinks_text += "#{link} \n"
              end

              zip.put_next_entry 'dataset_description.txt'
              zip.write <<~DESC
                dataset name: #{@container.name}
                instrument: #{@container.extended_metadata.fetch('instrument', nil)}
                description:
                #{@container.description}

                Files:
                #{file_text}

                Hyperlinks:
                #{hyperlinks_text}
              DESC
            end
            zip_f.rewind
            zip_f.read
          end
        end

        resource :annotated_image do
          desc 'download publication annotated image'
          after_validation do
            @attachment = Attachment.find_by(id: params[:id])
            error!('404 Attachment not found', 404) unless @attachment
            @publication = @attachment&.container&.parent&.publication
            error!('404 Is not published yet', 404) unless @publication&.state&.include?('completed')
          end
          get do
            content_type 'application/octet-stream'

            env['api.format'] = :binary
            store = @attachment.attachment.storage.directory
            file_location = store.join(
              @attachment.attachment_data['derivatives']['annotation']['annotated_file_location'] || 'not available',
            )

            uploaded_file = if file_location.present? && File.file?(file_location)
                              extension_of_annotation = File.extname(@attachment.filename)
                              extension_of_annotation = '.png' if @attachment.attachment.mime_type == 'image/tiff'
                              filename_of_annotated_image = @attachment.filename.gsub(
                                File.extname(@attachment.filename),
                                "_annotated#{extension_of_annotation}",
                              )
                              header['Content-Disposition'] = "attachment; filename=\"#{filename_of_annotated_image}\""
                              File.open(file_location)
                            else
                              header['Content-Disposition'] = "attachment; filename=\"#{@attachment.filename}\""
                              @attachment.attachment_attacher.file
                            end
            data = uploaded_file.read
            uploaded_file.close

            data
          end
        end

        resource :thumbnail do
          after_validation do
            @attachment = Attachment.find_by(id: params[:id])
            error!('404 Attachment not found', 404) unless @attachment
            @publication = @attachment&.container&.parent&.publication
            error!('404 Is not published yet', 404) unless @publication&.state&.include?('completed')
          end
          get do
            if @attachment.thumb
              thumbnail = @attachment.read_thumbnail
              thumbnail ? Base64.encode64(thumbnail) : nil
            else
              nil
            end
          end
        end
      end

      resource :export_metadata do
        desc 'Get dataset metadata of publication'
        params do
          requires :id, type: Integer, desc: "Dataset Id"
        end
        before do
          @dataset_id = params[:id]
          @container = Container.find_by(id: @dataset_id)
          element = @container.root.containable
          @publication = Publication.find_by(element: element, state: 'completed') if element.present?
          error!('404 Publication not found', 404) unless @publication.present?
        end
        get do
          prepare_and_export_dataset(@container.id)
        end
      end

      resource :metadata do
        desc "batch download metadata"
        params do
          requires :type, type: String, desc: 'Type', values: %w[Sample Reaction Container Collection]
          requires :offset, type: Integer, desc: 'Offset', default: 0
          requires :limit, type: Integer, desc: 'Limit', default: 100
          optional :date_from, type: String, desc: 'Published date from'
          optional :date_to, type: String, desc: 'Published date to'
          optional :rdf_format, type: String, desc: 'RDF format', values: %w[jsonld turtle ntriples trig nquads], default: 'jsonld'
        end
        get :publications do
          service_url = Rails.env.production? ? 'https://www.chemotion-repository.net' : 'http://localhost:3000'
          api_url = "/api/v1/public/metadata/download_rdf?rdf_format=#{params[:rdf_format]}&inchikey="

          result = declared(params, include_missing: false)
          list = []
          limit = params[:limit] - params[:offset] > 1000 ? params[:offset] + 1000 : params[:limit]
          scope = Publication.includes(:doi).where(element_type: params[:type], state: 'completed')

          # Handle date_from parameter safely
          if params[:date_from].present? && params[:date_from] != '{date_from}'
            begin
              scope = scope.where('published_at >= ?', params[:date_from])
            rescue ArgumentError
              # Handle invalid date format gracefully
              Rails.logger.warn "Invalid date_from parameter: #{params[:date_from]}"
            end
          end

          # Handle date_to parameter safely
          if params[:date_to].present? && params[:date_to] != '{date_to}'
            begin
              # Use end of day for date_to to include records from that day
              scope = scope.where('published_at <= ?', "#{params[:date_to]} 23:59:59")
            rescue ArgumentError
              # Handle invalid date format gracefully
              Rails.logger.warn "Invalid date_to parameter: #{params[:date_to]}"
            end
          end
          publications = scope.order(:published_at).offset(params[:offset]).limit(limit)
          publications.each do |publication|
            inchikey = publication&.doi&.suffix
            list.push("#{service_url}#{api_url}#{inchikey}") if inchikey.present?
          end
          result[:publications] = list
          result[:limit] = limit
          result
        end

        desc "metadata of publication"
        params do
          optional :id, type: Integer, desc: "Id"
          optional :type, type: String, desc: "Type", values: %w[sample reaction container collection]
          optional :inchikey, type: String, desc: "inchikey"
          optional :concept, type: Boolean, desc: "concept"
          optional :extension, type: String, desc: 'JSON-LD extension option', values: %w[LLM]
          optional :rdf_format, type: String, desc: 'RDF format', values: %w[jsonld turtle ntriples trig nquads], default: 'jsonld'
        end
        after_validation do
          @type = params['type']&.classify
          @publication = Publication.find_by(element_type: @type, element_id: params['id'], state: 'completed') if params['id'].present?
          if params['inchikey'].present? && @publication.nil?
            doi = Doi.find_by(suffix: params['inchikey'])
            @publication = Publication.find_by(doi_id: doi.id, state: 'completed') if doi.present?
            @type = @publication&.element_type
          end
          @type = @type == "Container" ? "Analysis" : @type
          error!('404 Publication not found', 404) unless @publication.present?
        end
        desc "Download metadata_xml"
        get :download do
          if ENV['REPO_VERSIONING'] == 'true' && params[:concept]
            filename = URI.encode_www_form_component("metadata_#{@type}_#{@publication.element_id}_concept-#{Time.new.strftime("%Y%m%d%H%M%S")}.xml")
            metadata_xml = @publication.concept.metadata_xml
          else
            filename = URI.encode_www_form_component("metadata_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.xml")
            metadata_xml = @publication.metadata_xml
          end
          content_type('application/octet-stream')
          header['Content-Disposition'] = "attachment; filename=" + filename
          env['api.format'] = :binary
          metadata_xml
        end

        desc "Download JSON-Link Data"
        get :download_json do
          filename = URI.encode_www_form_component("JSON-LD_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.json")
          content_type('application/ld+json')
          header['Content-Disposition'] = "attachment; filename=" + filename
          env['api.format'] = :json
          @publication.json_ld(params['extension'])
        end

        desc "Get JSON-Link Data"
        get :jsonld do
          @publication.json_ld
        end

        desc "Download RDF Turtle Data"
        get :download_turtle do
          filename = URI.encode_www_form_component("RDF-Turtle_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.ttl")
          content_type('text/turtle')
          header['Content-Disposition'] = "attachment; filename=" + filename
          env['api.format'] = :binary
          JsonldConverterService.convert_publication(@publication, format: :turtle)
        end

        desc "Get RDF Turtle Data"
        get :turtle do
          content_type('text/turtle')
          env['api.format'] = :binary
          JsonldConverterService.convert_publication(@publication, format: :turtle)
        end

        desc "Download RDF N-Triples Data"
        get :download_ntriples do
          filename = URI.encode_www_form_component("RDF-NTriples_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.nt")
          content_type('application/n-triples')
          header['Content-Disposition'] = "attachment; filename=" + filename
          env['api.format'] = :binary
          JsonldConverterService.convert_publication(@publication, format: :ntriples)
        end

        desc "Get RDF N-Triples Data"
        get :ntriples do
          content_type('application/n-triples')
          env['api.format'] = :binary
          JsonldConverterService.convert_publication(@publication, format: :ntriples)
        end

        desc "Download RDF Data in specified format"
        get :download_rdf do
          case params[:rdf_format]
          when 'jsonld'
            filename = URI.encode_www_form_component("JSON-LD_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.json")
            content_type('application/ld+json')
            header['Content-Disposition'] = "attachment; filename=" + filename
            env['api.format'] = :json
            @publication.json_ld(params['extension'])
          when 'turtle'
            filename = URI.encode_www_form_component("RDF-Turtle_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.ttl")
            content_type('text/turtle')
            header['Content-Disposition'] = "attachment; filename=" + filename
            env['api.format'] = :binary
            JsonldConverterService.convert_publication(@publication, format: :turtle)
          when 'ntriples'
            filename = URI.encode_www_form_component("RDF-NTriples_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.nt")
            content_type('application/n-triples')
            header['Content-Disposition'] = "attachment; filename=" + filename
            env['api.format'] = :binary
            JsonldConverterService.convert_publication(@publication, format: :ntriples)
          when 'trig'
            filename = URI.encode_www_form_component("RDF-TriG_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.trig")
            content_type('application/trig')
            header['Content-Disposition'] = "attachment; filename=" + filename
            env['api.format'] = :binary
            JsonldConverterService.convert_publication(@publication, format: :trig)
          when 'nquads'
            filename = URI.encode_www_form_component("RDF-NQuads_#{@type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.nq")
            content_type('application/n-quads')
            header['Content-Disposition'] = "attachment; filename=" + filename
            env['api.format'] = :binary
            JsonldConverterService.convert_publication(@publication, format: :nquads)
          end
        end
      end



      resource :published_statics do
        desc 'Return PUBLIC statics'
        get do
          result = ActiveRecord::Base.connection.exec_query('select * from publication_statics as ps')
          published_statics = result.map do |row|
            row.map do |key, value|
              [key, value.is_a?(BigDecimal) ? value.to_i : value]
            end.to_h
          end
          { published_statics: published_statics }
        end
      end

      resource :top_contributors do
        desc 'Return top publication contributors (publications.published_by) of the past 365 days'
        params do
          optional :limit, type: Integer, default: 10, desc: 'maximum number of contributors to return'
          optional :days,  type: Integer, default: 365, desc: 'lookback window in days'
        end
        get do
          limit = [[params[:limit].to_i, 1].max, 50].min
          days  = [[params[:days].to_i, 1].max, 3650].min
          sql = <<~SQL
            SELECT u.id AS user_id,
                   u.first_name,
                   u.last_name,
                   u.name_abbreviation,
                   COUNT(*) AS pub_count
            FROM publications p
            JOIN users u ON u.id = p.published_by
            WHERE p.state = 'completed'
              AND p.element_type IN ('Sample', 'Reaction')
              AND p.deleted_at IS NULL
              AND p.published_at >= NOW() - INTERVAL '#{days} days'
              AND u.type = 'Person'
            GROUP BY u.id, u.first_name, u.last_name, u.name_abbreviation
            ORDER BY pub_count DESC, u.last_name ASC
            LIMIT #{limit}
          SQL
          result = ActiveRecord::Base.connection.exec_query(sql)
          top_contributors = result.map do |row|
            {
              user_id: row['user_id'],
              first_name: row['first_name'],
              last_name: row['last_name'],
              name_abbreviation: row['name_abbreviation'],
              pub_count: row['pub_count'].to_i,
            }
          end
          { top_contributors: top_contributors, window_days: days }
        end
      end

      resource :yearly_publication_stats do
        desc 'Return publication counts per calendar year per element type'
        get do
          sql = <<~SQL
            SELECT EXTRACT(YEAR FROM published_at)::int AS pub_year,
                   element_type,
                   COUNT(*) AS pub_count
            FROM publications
            WHERE state = 'completed'
              AND element_type IN ('Sample', 'Reaction', 'Container', 'Collection')
              AND deleted_at IS NULL
              AND published_at IS NOT NULL
            GROUP BY EXTRACT(YEAR FROM published_at), element_type
            ORDER BY EXTRACT(YEAR FROM published_at) ASC
          SQL
          rows = ActiveRecord::Base.connection.exec_query(sql)

          present_years = rows.map { |r| r['pub_year'] }.compact.uniq.sort
          labels = present_years.empty? ? [] : (present_years.first..present_years.last).map(&:to_s)
          year_count = labels.size
          series = {
            'Sample' => Array.new(year_count, 0),
            'Reaction' => Array.new(year_count, 0),
            'Container' => Array.new(year_count, 0),
            'Collection' => Array.new(year_count, 0),
          }
          rows.each do |row|
            idx = labels.index(row['pub_year'].to_s)
            next if idx.nil?

            series[row['element_type']][idx] = row['pub_count'].to_i
          end

          totals = labels.each_with_index.map { |_, i| series.values.sum { |arr| arr[i] } }
          cumulative = totals.each_with_object([]) { |n, acc| acc << ((acc.last || 0) + n) }

          { years: labels, series: series, totals: totals, cumulative: cumulative }
        end
      end

      resource :represent do
        desc 'represent molfile structure'
        params do
          requires :mol, type: String, desc: 'Molecule molfile'
        end
        post :structure do
          represent_structure(params[:mol])
        rescue StandardError => e
          return { molfile: params[:mol], msg: { level: 'error', message: e } }
        end
      end

      namespace :ols_terms do
        desc 'Get List'
        params do
          requires :name, type: String, desc: 'OLS Name', values: %w[chmo rxno bao]
          optional :edited, type: Boolean, default: true, desc: 'Only list visible terms'
        end
        get 'list' do
          file = Rails.public_path.join(
            'ontologies',
            "#{params[:name]}#{params[:edited] ? '.edited.json' : '.json'}",
          )
          unless File.exist?(file)
            file = Rails.public_path.join(
              'ontologies_default',
              "#{params[:name]}#{params[:edited] ? '.default.edited.json' : '.default.json'}",
            )
          end
          result = JSON.parse(File.read(file, encoding: 'bom|utf-8')) if File.exist?(file)
          result
        end
      end

      desc 'Public initialization'
      get 'initialize' do
        stt_config = Rails.configuration.try(:stt).try(:config)
        {
          molecule_viewer: Matrice.molecule_viewer,
          repo_versioning: ENV['REPO_VERSIONING'] == 'true' ? true : false,
          u: Rails.configuration.u || {},
          stt_enabled: stt_config.present? && stt_config.authorization.present?
        }
      end

      namespace :generic_templates do
        desc 'get active generic templates'
        params do
          requires :klass, type: String, desc: 'Klass', values: %w[Element Segment Dataset]
        end
        get do
          list = "Labimotion::#{params[:klass]}Klass".constantize.where(is_active: true).where.not(released_at: nil).select { |s| s['is_generic'].blank? }
          entities = Labimotion::GenericPublicEntity.represent(list)
          # entities.length > 1 ? de_encode_json(entities) : []
        end
      end

      namespace :element_klasses_name do
        desc 'get klasses'
        params do
          requires :username, type: String, desc: 'Username'
          requires :password, type: String, desc: 'Password'
        end
        get do
          list = Labimotion::ElementKlass.where(is_active: true) if params[:generic_only].present? && params[:generic_only] == true
          list = Labimotion::ElementKlass.where(is_active: true) unless params[:generic_only].present? && params[:generic_only] == true
          list.pluck(:name)
        end
      end

      namespace :article_init do
        get do
          { is_article_editor: current_user&.is_article_editor || false }
        end
      end

      namespace :howto_init do
        get do
          { is_howto_editor: current_user&.is_howto_editor || false }
        end
      end

      namespace :repository do
        desc 'Export published samples as a single SDF file.'
        params do
          optional :from, type: Date, default: -> { 3.months.ago.to_date },
                          desc: 'Lower bound of publications.published_at (YYYY-MM-DD).'
          optional :to, type: Date, default: -> { Date.current },
                        desc: 'Upper bound of publications.published_at (YYYY-MM-DD).'
        end
        get :sdf do
          if params[:from] && params[:to] && (params[:to] - params[:from]).to_i > 366
            error!('Date range may not exceed 366 days', 400)
          end

          service = RepoSdfExportService.new(
            from: params[:from]&.beginning_of_day,
            to: params[:to]&.end_of_day,
          )

          filename_parts = ['chemotion', 'samples']
          filename_parts << params[:from].iso8601 if params[:from]
          filename_parts << params[:to].iso8601 if params[:to]
          filename = "#{filename_parts.join('-')}.sdf"

          content_type 'chemical/x-mdl-sdfile'
          header 'Content-Disposition', "attachment; filename=\"#{filename}\""
          env['api.format'] = :binary
          service.to_sdf
        end
      end
    end

    namespace :upload do
      before do
        error!('Unauthorized', 401) unless TokenAuthentication.new(request, with_remote_addr: true).is_successful?
      end
      resource :attachments do
        desc 'Upload files'
        params do
          requires :recipient_email, type: String
          requires :subject, type: String
        end
        post do
          recipient_email = params[:recipient_email]
          subject = params[:subject]
          params.delete(:subject)
          params.delete(:recipient_email)

          token = request.headers['Auth-Token'] || request.params['auth_token']
          key = AuthenticationKey.find_by(token: token)

          helper = CollectorHelper.new(key.user.email, recipient_email)

          if helper.sender_recipient_known?
            dataset = helper.prepare_new_dataset(subject)
            params.each do |file_id, file|
              if tempfile = file.tempfile
                a = Attachment.new(
                  filename: file.filename,
                  file_path: file.tempfile,
                  created_by: helper.sender.id,
                  created_for: helper.recipient.id,
                )
                begin
                  a.save!
                  a.update!(attachable: dataset)
                ensure
                  tempfile.close
                  tempfile.unlink
                end
              end
            end
          end
          true
        end
      end
    end
  end
end

# rubocop: enable Metrics/ClassLength
