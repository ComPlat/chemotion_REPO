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
          optional :adv_type, type: String, desc: 'advanced search type', values: %w[Authors Ontologies Embargo Label]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
          optional :label_val, type: Integer, desc: 'label_val'
          optional :req_xvial, type: Boolean, default: false, desc: 'xvial is required or not'
        end
        paginate per_page: 10, offset: 0, max_per_page: 100
        get '/' do
          public_collection_id = Collection.public_collection_id
          params[:adv_val]
          adv_search = ' '
          req_xvial = params[:req_xvial]
          if params[:adv_flag] == true && params[:adv_type].present? && params[:adv_val].present?
            case params[:adv_type]
            when 'Authors'
              adv_search = <<~SQL
                INNER JOIN publication_authors pub on pub.element_id = samples.id and pub.element_type = 'Sample' and pub.state = 'completed'
                and author_id in ('#{params[:adv_val].join("','")}')
              SQL
            when 'Ontologies'
              adv_search = <<~SQL
                INNER JOIN publication_ontologies pub on pub.element_id = samples.id and pub.element_type = 'Sample'
                and term_id in ('#{params[:adv_val].join("','")}')
              SQL
            when 'Embargo'
              param_sql = ActiveRecord::Base.send(:sanitize_sql_array, [' css.collection_id in (?)', params[:adv_val].map(&:to_i).join(',')])
              adv_search = <<~SQL
                INNER JOIN collections_samples css on css.sample_id = samples.id and css.deleted_at ISNULL
                and #{param_sql}
              SQL
            end
          end
          if params[:adv_type] == 'Label' && params[:label_val].present?
            label_search = <<~SQL
              and pub.taggable_data->'user_labels' @> '#{params[:label_val]}'
            SQL
          end
          sample_join = <<~SQL
            INNER JOIN (
              SELECT molecule_id, published_at max_published_at, sample_svg_file, id as sid
              FROM (
              SELECT samples.*, pub.published_at, rank() OVER (PARTITION BY molecule_id order by pub.published_at desc) as rownum
              FROM samples, publications pub
              WHERE pub.element_type='Sample' and pub.element_id=samples.id  and pub.deleted_at ISNULL #{label_search}
                and samples.id IN (
                SELECT samples.id FROM samples
                INNER JOIN collections_samples cs on cs.collection_id = #{public_collection_id} and cs.sample_id = samples.id and cs.deleted_at ISNULL
                #{adv_search}
                #{join_xvial_sql(req_xvial)}
              )) s where rownum = 1
            ) s on s.molecule_id = molecules.id
          SQL

          embargo_sql = <<~SQL
            molecules.*, sample_svg_file, sid,
            (select count(*) from publication_ontologies po where po.element_type = 'Sample' and po.element_id = sid) as ana_cnt,
            (select "collections".label from "collections" inner join collections_samples cs on collections.id = cs.collection_id
              and cs.sample_id = sid where "collections"."deleted_at" is null and (ancestry in (
              select c.id::text from collections c where c.label = 'Published Elements')) order by position asc limit 1) as embargo,
            (
                select json_build_object('id', id, 'published_at', to_char(published_at, 'YYYY-MM-DD'), 'author_name', taggable_data -> 'creators'->0->>'name', 'doi', taggable_data -> 'doi')
                from publications
                where element_type = 'Sample'
                  and element_id = sid
                  and deleted_at is null
            ) as publication
          SQL

          mol_scope = Molecule.joins(sample_join).order("s.max_published_at desc").select(embargo_sql)
          reset_pagination_page(mol_scope)
          list = paginate(mol_scope)

          entities = Entities::MoleculePublicationListEntity.represent(list, serializable: true)
          sids = entities.map { |e| e[:sid] }

          com_config = Rails.configuration.compound_opendata
          xvial_count_sql = <<~SQL
            inner join element_tags e on e.taggable_type = 'Sample' and e.taggable_id = samples.id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
          SQL
          x_cnt_ids = req_xvial ? sids.uniq : (Sample.joins(xvial_count_sql).where(id: sids).distinct.pluck(:id) || [])
          xvial_com_sql = get_xvial_sql(req_xvial)
          x_com_ids = Sample.joins(xvial_com_sql).where(id: sids).distinct.pluck(:id) if com_config.present? && com_config.allowed_uids.include?(current_user&.id)

          entities = entities.each do |obj|
            obj[:xvial_count] = 1 if x_cnt_ids.include?(obj[:sid])
            obj[:xvial_com] = 1 if com_config.present? && com_config.allowed_uids.include?(current_user&.id) && (x_com_ids || []).include?(obj[:sid])
            obj[:xvial_archive] = get_xdata(obj[:inchikey], obj[:sid], req_xvial)
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
          optional :adv_type, type: String, desc: 'advanced search type', values: %w[Authors Ontologies Embargo Label]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
          optional :label_val, type: Integer, desc: 'label_val'
          optional :scheme_only, type: Boolean, desc: 'is it a scheme-only reaction?', default: false
        end
        paginate per_page: 10, offset: 0, max_per_page: 100
        get '/' do
          if params[:adv_flag] === true && params[:adv_type].present? && params[:adv_val].present?
            case params[:adv_type]
            when 'Authors'
              adv_search = <<~SQL
                INNER JOIN publication_authors pub on pub.element_id = reactions.id and pub.element_type = 'Reaction' and pub.state = 'completed'
                and author_id in ('#{params[:adv_val].join("','")}')
              SQL
            when 'Ontologies'
              adv_search = <<~SQL
                INNER JOIN publication_ontologies pub on pub.element_id = reactions.id and pub.element_type = 'Reaction'
                and term_id in ('#{params[:adv_val].join("','")}')
              SQL
            when 'Embargo'
              param_sql = ActiveRecord::Base.send(:sanitize_sql_array, [' cr.collection_id in (?)', params[:adv_val].map(&:to_i).join(',')])
              adv_search = <<~SQL
                INNER JOIN collections_reactions cr on cr.reaction_id = reactions.id and cr.deleted_at is null
                and #{param_sql}
              SQL
            else
              adv_search = ' '
            end
          else
            adv_search = ' '
          end
          com_config = Rails.configuration.compound_opendata
          embargo_sql = <<~SQL
            reactions.id, reactions.name, reactions.reaction_svg_file, publications.id as pub_id, to_char(publications.published_at, 'YYYY-MM-DD') as published_at, publications.taggable_data,
            (select count(*) from publication_ontologies po where po.element_type = 'Reaction' and po.element_id = reactions.id) as ana_cnt,
            (select "collections".label from "collections" inner join collections_reactions cr on collections.id = cr.collection_id and cr.deleted_at is null
            and cr.reaction_id = reactions.id where "collections"."deleted_at" is null and (ancestry in (
            select c.id::text from collections c where c.label = 'Published Elements')) order by position asc limit 1) as embargo,
            (select taggable_data -> 'new_version' -> 'id' from element_tags where taggable_type = 'Reaction' and taggable_id = reactions.id) as new_version
          SQL

          if params[:scheme_only]
            col_scope = Collection.scheme_only_reactions_collection.reactions.joins(adv_search).joins(:publication).select(embargo_sql).order('publications.published_at desc')
          else
            col_scope = Collection.public_collection.reactions.joins(adv_search).joins(:publication).select(embargo_sql).order('publications.published_at desc')
          end
          if params[:adv_type] == 'Label' && params[:label_val].present?
            col_scope = col_scope.where("publications.taggable_data->'user_labels' @> '?'", params[:label_val])
          end
          reset_pagination_page(col_scope)
          list = paginate(col_scope)
          entities = Entities::ReactionPublicationListEntity.represent(list, serializable: true)

          ids = entities.map { |e| e[:id] }

          xvial_count_sql = <<~SQL
            inner join element_tags e on e.taggable_id = reactions_samples.sample_id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
          SQL
          x_cnt_ids = ReactionsSample.joins(xvial_count_sql).where(type: 'ReactionsProductSample', reaction_id: ids).distinct.pluck(:reaction_id) || []

          xvial_com_sql = <<~SQL
            inner join samples s on reactions_samples.sample_id = s.id and s.deleted_at is null
            inner join molecules m on m.id = s.molecule_id
            inner join com_xvial(true) a on a.x_inchikey = m.inchikey
          SQL
          x_com_ids = ReactionsSample.joins(xvial_com_sql).where(type: 'ReactionsProductSample', reaction_id: ids).distinct.pluck(:reaction_id) if com_config.present? && com_config.allowed_uids.include?(current_user&.id)

          entities = entities.each do |obj|
            obj[:xvial_count] = 1 if x_cnt_ids.include?(obj[:id])
            obj[:xvial_com] = 1 if com_config.present? && com_config.allowed_uids.include?(current_user&.id) && (x_com_ids || []).include?(obj[:id])
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
          pub.review = nil
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
          sample_list = Publication.where(ancestry: nil, element: @embargo_collection.samples).select(anasql).order(updated_at: :desc)
          reaction_list = Publication.where(ancestry: nil, element: @embargo_collection.reactions).select(anasql).order(updated_at: :desc)
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
          optional :adv_flag, type: Boolean, desc: 'advanced search flag'
          optional :adv_type, type: String, desc: 'advanced search type', allow_blank: true, values: %w[Authors Ontologies Embargo Label]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
          optional :label_val, type: Integer, desc: 'label_val'
        end
        get do
          get_pub_molecule(params[:id], params[:adv_flag], params[:adv_type], params[:adv_val], params[:label_val])
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
              scope = scope.where('published_at <= ?', params[:date_to])
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

    end
  end
end

# rubocop: enable Metrics/ClassLength
