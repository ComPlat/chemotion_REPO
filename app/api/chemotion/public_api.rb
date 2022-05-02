# frozen_string_literal: true

require 'open-uri'

# Belong to Chemotion module
module Chemotion
  # API for Public data
  class PublicAPI < Grape::API
    include Grape::Kaminari
    helpers do
      def send_notification(attachment, user, status, has_error = false)
        data_args = { 'filename': attachment.filename, 'comment': 'the file has been updated' }
        level = 'success'
        if has_error
          data_args['comment'] = ' an error has occurred, the file is not changed.'
          level = 'error'
        elsif status == 4
          data_args['comment'] = ' file has not changed.'
          level = 'info'
        elsif @status == 7
          data_args['comment'] = ' an error has occurred while force saving the document, please review your changes.'
          level = 'error'
        end
        message = Message.create_msg_notification(
          channel_subject: Channel::EDITOR_CALLBACK, message_from: user.id,
          data_args: data_args, attach_id: attachment.id, research_plan_id: attachment.attachable_id, level: level
        )
      end
    end
    helpers CompoundHelpers

    namespace :public do
      get 'ping' do
        status 204
      end

      namespace :element_klasses_name do
        desc "get klasses"
        params do
          optional :generic_only, type: Boolean, desc: "list generic element only"
        end
        get do
          list = ElementKlass.where(is_active: true) if params[:generic_only].present? && params[:generic_only] == true
          list = ElementKlass.where(is_active: true) unless params[:generic_only].present? && params[:generic_only] == true
          list.pluck(:name)
        end
      end

      namespace :omniauth_providers do
        desc "get omniauth providers"
        get do
          Devise.omniauth_configs.keys
        end
      end

      namespace :search do
        params do
          requires :inchikey, type: String, desc: 'inchikey'
        end
        post do
          molecule = Molecule.joins("inner join samples on molecules.id = samples.molecule_id and samples.deleted_at is null")
                             .joins("inner join publications on samples.id = publications.element_id and  publications.state like '%completed%' and publications.element_type = 'Sample'")
                             .find_by(inchikey: params[:inchikey])
          { molecule_id: molecule&.id }
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

      namespace :find_adv_valuess do
        helpers do
          def query_authors(name)
            result = User.where(type: %w(Person Group Collaborator)).where(
              <<~SQL
                users.id in (
                  select distinct(pa.author_id)::integer from publication_authors pa
                )
              SQL
            )
            .by_name(params[:name]).limit(10)
            .select(
              <<~SQL
              id as key, first_name, last_name, first_name || chr(32) || last_name as name, first_name || chr(32) || last_name || chr(32) || '(' || name_abbreviation || ')' as label
              SQL
            )
          end
          def query_ontologies(name)
            result = PublicationOntologies.where('LOWER(ontologies) ILIKE ? ',"%#{params[:name]}%").limit(3)
            .select(
              <<~SQL
              term_id as key, label, label as name
              SQL
            ).uniq
          end
          def query_embargo(name)
            Collection.all_embargos(current_user.id).where("LOWER(label) ILIKE '#{ActiveRecord::Base.send(:sanitize_sql_like, params[:name])}%'").limit(10)
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
                   when 'Authors', 'Contributors'
                     query_authors(params[:name])
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

      namespace :download do
        desc 'download file for editoring'
        before do
          error!('401 Unauthorized', 401) if params[:token].nil?
        end
        get do
          content_type "application/octet-stream"
          payload = JWT.decode(params[:token], Rails.application.secrets.secret_key_base) unless params[:token].nil?
          error!('401 Unauthorized', 401) if payload&.length == 0
          att_id = payload[0]['att_id']&.to_i
          user_id = payload[0]['user_id']&.to_i
          @attachment = Attachment.find_by(id: att_id)
          @user = User.find_by(id: user_id)
          error!('401 Unauthorized', 401) if @attachment.nil? || @user.nil?

          header['Content-Disposition'] = "attachment; filename=" + @attachment.filename
          env['api.format'] = :binary
          @attachment.read_file
        end
      end

      namespace :callback do
        desc 'start to save a document'
        # callback status description
        # 0 - no document with the key identifier could be found,
        # 1 - document is being edited,
        # 2 - document is ready for saving,
        # 3 - document saving error has occurred,
        # 4 - document is closed with no changes,
        # 6 - document is being edited, but the current document state is saved,
        # 7 - error has occurred while force saving the document.
        before do
          error!('401 Unauthorized', 401) if params[:key].nil?
          payload = JWT.decode(params[:key], Rails.application.secrets.secret_key_base) unless params[:key].nil?
          error!('401 Unauthorized', 401) unless payload.present?
          @status = params[:status].is_a?(Integer) ? params[:status] : 0

          if @status > 1
            attach_id = payload[0]['att_id']&.to_i
            @url = params[:url]
            @attachment = Attachment.find_by(id: attach_id, attachable_type: 'ResearchPlan')
            user_id = payload[0]['user_id']&.to_i
            @user = User.find_by(id: user_id)
            error!('401 Unauthorized', 401) if @attachment.nil? || @user.nil?
            @research_plan = @attachment.attachable if @attachment.attachable_type == 'ResearchPlan'
          end
        end

        params do
          optional :key, type: String, desc: 'token'
          optional :status, type: Integer, desc: 'status (see description)'
          optional :url, type: String, desc: 'file url'
        end
        get do
          status 200
          { error: 0 }
        end

        post do
          # begin
          case @status
          when 1
          when 2
            @attachment.file_data = open(@url).read
            @attachment.rewrite_file_data!
            @attachment.oo_editing_end!
          else
            @attachment.oo_editing_end!
          end
          send_notification(@attachment, @user, @status) unless @status <= 1
          # rescue StandardError => err
          # Rails.logger.error(
          #   <<~LOG
          #   **** OO editor error while saving *****************
          #   #{params}
          #   #{err}
          #   LOG
          # )
          #   send_notification(@attachment, @user, @status, true)
          # end
          status 200
          { error: 0 }
        end
      end

      resource :computed_props do
        params do
          requires :token, type: String
          requires :compute_id, type: Integer

          requires :data, type: String
        end

        post do
          cconfig = Rails.configuration.compute_config
          error!('No computation configuration!') if cconfig.nil?
          error!('Unauthorized') unless cconfig.receiving_secret == params[:token]

          cp = ComputedProp.find(params[:compute_id])
          return if cp.nil?

          cp.status = params[:code]&.downcase

          ComputedProp.from_raw(cp.id, params[:data])

          Message.create_msg_notification(
            channel_subject: Channel::COMPUTED_PROPS_NOTIFICATION, message_from: cp.creator,
            data_args: { sample_id: cp.sample_id, status: params[:code]&.downcase }, cprop: ComputedProp.find(cp.id),
            level: 'success'
          )
        end
      end

      namespace :affiliations do
        params do
          optional :domain, type: String, desc: "email domain", regexp: /\A([a-z\d\-]+\.)+[a-z]{2,64}\z/i
        end

        desc "Return all countries available"
        get "countries" do
          ISO3166::Country.all_translated
        end

        desc "Return all current organizations"
        get "organizations" do
          Affiliation.where.not(organization: ENV['BLIST_ORGANIZATIONS']).pluck("DISTINCT organization")
        end

        desc "Return all current departments"
        get "departments" do
          Affiliation.where.not(department:  ENV['BLIST_DEPARTMENTS']).pluck("DISTINCT trim(department)")
        end

        desc "return organization's name from email domain"
        get "swot" do
          return unless params[:domain].present?
          Swot::school_name(params[:domain]).presence ||
            Affiliation.where(domain: params[:domain]).where.not(organization: nil).first&.organization
        end
      end

      get 'collection' do
        pub_coll = Collection.public_collection
        if current_user
          coll = SyncCollectionsUser.find_by(user_id: current_user.id, collection_id: pub_coll.id)
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
          analyses = Collection.public_collection.samples
            .where("samples.molecule_id = ?", molecule.id.to_s)
            .map(&:analyses).flatten

          analyses_filtered = analyses.select { |a|
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
        desc "Return PUBLIC serialized molecules"
        params do
          optional :page, type: Integer, desc: "page"
          optional :pages, type: Integer, desc: "pages"
          optional :per_page, type: Integer, desc: "per page"
          optional :adv_flag, type: Boolean, desc: 'advanced search?'
          optional :adv_type, type: String, desc: 'advanced search type', values: %w[Authors Ontologies Embargo]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
        end
        paginate per_page: 10, offset: 0, max_per_page: 100
        get '/' do
          public_collection_id = Collection.public_collection_id
          params[:adv_val]
          adv_search = ' '
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
          sample_join = <<~SQL
            INNER JOIN (
              SELECT molecule_id, published_at max_published_at, sample_svg_file, id as sid
              FROM (
              SELECT samples.*, pub.published_at, rank() OVER (PARTITION BY molecule_id order by pub.published_at desc) as rownum
              FROM samples, publications pub
              WHERE pub.element_type='Sample' and pub.element_id=samples.id  and pub.deleted_at ISNULL
                and samples.id IN (
                SELECT samples.id FROM samples
                INNER JOIN collections_samples cs on cs.collection_id = #{public_collection_id} and cs.sample_id = samples.id and cs.deleted_at ISNULL
                #{adv_search}
              )) s where rownum = 1
            ) s on s.molecule_id = molecules.id
          SQL

          embargo_sql = <<~SQL
            molecules.*, sample_svg_file, sid,
            (select count(*) from publication_ontologies po where po.element_type = 'Sample' and po.element_id = sid) as ana_cnt,
            (select "collections".label from "collections" inner join collections_samples cs on collections.id = cs.collection_id
              and cs.sample_id = sid where "collections"."deleted_at" is null and (ancestry in (
              select c.id::text from collections c where c.label = 'Published Elements')) order by position asc limit 1) as embargo,
            (select id from publications where element_type = 'Sample' and element_id = sid and deleted_at is null) as pub_id,
            (select to_char(published_at, 'DD-MM-YYYY') from publications where element_type = 'Sample' and element_id = sid and deleted_at is null) as published_at,
            (select taggable_data -> 'creators'->0->>'name' from publications where element_type = 'Sample' and element_id = sid and deleted_at is null) as author_name
          SQL

          list = paginate(Molecule.joins(sample_join).order("s.max_published_at desc").select(embargo_sql))

          entities = Entities::MoleculePublicationListEntity.represent(list, serializable: true)
          sids = entities.map { |e| e[:sid] }

          com_config = Rails.configuration.compound_opendata

          xvial_count_sql = <<~SQL
            inner join element_tags e on e.taggable_id = samples.id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
          SQL
          x_cnt_ids = Sample.joins(xvial_count_sql).where(id: sids).distinct.pluck(:id) || []

          xvial_com_sql = <<~SQL
            inner join molecules m on m.id = samples.molecule_id
            inner join com_xvial(true) a on a.x_inchikey = m.inchikey
          SQL
          x_com_ids = Sample.joins(xvial_com_sql).where(id: sids).distinct.pluck(:id) if com_config.present? && com_config.allowed_uids.include?(current_user&.id)

          entities = entities.each do |obj|
            obj[:xvial_count] = 1 if x_cnt_ids.include?(obj[:sid])
            obj[:xvial_com] = 1 if com_config.present? && com_config.allowed_uids.include?(current_user&.id) && (x_com_ids || []).include?(obj[:sid])
          end
          entities
        end
      end

      resource :reactions do
        desc 'Return PUBLIC serialized reactions'
        params do
          optional :page, type: Integer, desc: 'page'
          optional :pages, type: Integer, desc: 'pages'
          optional :per_page, type: Integer, desc: 'per page'
          optional :adv_flag, type: Boolean, desc: 'is it advanced search?'
          optional :adv_type, type: String, desc: 'advanced search type', values: %w[Authors Ontologies Embargo]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
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
            reactions.id, reactions.name, reactions.reaction_svg_file, publications.id as pub_id, to_char(publications.published_at, 'DD-MM-YYYY') as published_at, publications.taggable_data,
            (select count(*) from publication_ontologies po where po.element_type = 'Reaction' and po.element_id = reactions.id) as ana_cnt,
            (select "collections".label from "collections" inner join collections_reactions cr on collections.id = cr.collection_id
            and cr.reaction_id = reactions.id where "collections"."deleted_at" is null and (ancestry in (
            select c.id::text from collections c where c.label = 'Published Elements')) order by position asc limit 1) as embargo
          SQL

          if params[:scheme_only]
            list = paginate(Collection.scheme_only_reactions_collection.reactions.joins(adv_search).joins(:publication).select(embargo_sql).order('publications.published_at desc'))
          else
            list = paginate(Collection.public_collection.reactions.joins(adv_search).joins(:publication).select(embargo_sql).order('publications.published_at desc'))
          end

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

          entities
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
          paginate(Molecule.joins(sample_join).order("s.max_updated_at desc"))
        end
      end

      resource :last_published do
        desc "Return Last PUBLIC serialized entities"
        get do
          s_pub = Publication.where(element_type: 'Sample', state: 'completed').order(:published_at).last
          sample = s_pub.element

          r_pub = Publication.where(element_type: 'Reaction', state: 'completed').order(:published_at).last
          reaction = r_pub.element

          { last_published: { sample: { id: sample.id, sample_svg_file: sample.sample_svg_file, molecule: sample.molecule, tag: s_pub.taggable_data, contributor: User.find(s_pub.published_by).name  },
          reaction: { id: reaction.id, reaction_svg_file: reaction.reaction_svg_file, tag: r_pub.taggable_data, contributor: User.find(r_pub.published_by).name } } }
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
        desc "Return PUBLISHED serialized dataset"
        params do
          requires :id, type: Integer, desc: "Dataset id"
        end
        get do
          dataset = Container.find(params[:id])
          sample = dataset.root.containable
          cids = sample.collections.pluck :id
          if cids.include?(Collection.public_collection_id)
            molecule = sample.molecule if sample.class.name == 'Sample'

            ds_json = ContainerSerializer.new(dataset).serializable_hash.deep_symbolize_keys
            ds_json[:dataset_doi] = dataset.full_doi
            ds_json[:pub_id] = dataset.publication&.id

            res = {
              dataset: ds_json,
              sample_svg_file: sample.class.name == 'Sample' ? sample.sample_svg_file : sample.reaction_svg_file,
              molecule: {
                sum_formular: molecule&.sum_formular,
                molecular_weight: molecule&.molecular_weight,
                cano_smiles: molecule&.cano_smiles,
                inchistring: molecule&.inchistring,
                inchikey: molecule&.inchikey,
                molecule_svg_file: molecule&.molecule_svg_file,
                pubchem_cid: molecule&.tag&.taggable_data && molecule&.tag&.taggable_data["pubchem_cid"]
              },
              license: dataset.tag.taggable_data["publication"]["license"] || 'CC BY-SA',
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
        helpers RepositoryHelpers
        desc "Return PUBLISHED serialized collection"
        params do
          requires :id, type: Integer, desc: "collection id"
        end
        get do
          pub = Publication.find_by(element_type: 'Collection', element_id: params[:id])
          { col: pub }
        end
      end

      resource :col_list do
        helpers RepositoryHelpers
        get do
          @embargo_collection = Collection.find(params[:collection_id])
          anasql = <<~SQL
            publications.*, (select count(*) from publication_ontologies po where po.element_type = publications.element_type and po.element_id = publications.element_id) as ana_cnt
          SQL
          sample_list = Publication.where(ancestry: nil, element: @embargo_collection.samples).select(anasql).order(updated_at: :desc)
          reaction_list = Publication.where(ancestry: nil, element: @embargo_collection.reactions).select(anasql).order(updated_at: :desc)
          list = sample_list + reaction_list
          elements = []
          list.each do |e|
            element_type = e.element&.class&.name
            u = User.find(e.published_by) unless e.published_by.nil?
            svg_file = e.element.sample_svg_file if element_type == 'Sample'
            title = e.element.short_label if element_type == 'Sample'

            svg_file = e.element.reaction_svg_file if element_type == 'Reaction'
            title = e.element.short_label if element_type == 'Reaction'

            scheme_only = element_type == 'Reaction' && e.taggable_data && e.taggable_data['scheme_only']
            elements.push(
              id: e.element_id, pub_id: e.id, svg: svg_file, type: element_type, title: title, published_at: e.published_at&.strftime('%d-%m-%Y'),
              published_by: u&.name, submit_at: e.updated_at, state: e.state, scheme_only: scheme_only, ana_cnt: e.ana_cnt
            )
          end
          { elements: elements, embargo_id: params[:collection_id], current_user: { id: current_user&.id, type: current_user&.type } }
        end
      end

      resource :col_element do
        helpers RepositoryHelpers
        params do
          requires :collection_id, type: Integer, desc: "collection id"
          requires :el_id, type: Integer, desc: "element id"
        end
        get do
          @embargo_collection = Collection.find(params[:collection_id])
          if params[:el_type] == 'Reaction'
            return get_pub_reaction(params[:el_id])
          elsif params[:el_type] == 'Sample'
            sample = Sample.find(params[:el_id])
            return get_pub_molecule(sample.molecule_id)
          end
        end
      end

      resource :reaction do
        helpers RepositoryHelpers
        desc "Return PUBLISHED serialized reaction"
        params do
          requires :id, type: Integer, desc: "Reaction id"
        end
        get do
          r = CollectionsReaction.where(reaction_id: params[:id], collection_id: [Collection.public_collection_id, Collection.scheme_only_reactions_collection.id])
          return nil unless r.present?

          return get_pub_reaction(params[:id])
        end
      end

      resource :molecule do
        helpers RepositoryHelpers
        desc "Return serialized molecule with list of PUBLISHED dataset"
        params do
          requires :id, type: Integer, desc: "Molecule id"
          optional :adv_flag, type: Boolean, desc: "advanced search flag"
          optional :adv_type, type: String, desc: "advanced search type", allow_blank: true, values: %w[Authors Ontologies Embargo]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
        end
        get do
          get_pub_molecule(params[:id], params[:adv_flag], params[:adv_type], params[:adv_val])
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
            @publication = @attachment&.container&.parent&.publication
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
            filename = URI.escape("#{@container.parent&.name.gsub(/\s+/, '_')}-#{@container.name.gsub(/\s+/, '_')}.zip")
            header['Content-Disposition'] = "attachment; filename=#{filename}"
            env['api.format'] = :binary
            zip_f = Zip::OutputStream.write_buffer do |zip|
              @container.attachments.each do |att|
                zip.put_next_entry att.filename
                zip.write att.read_file
              end
              zip.put_next_entry 'dataset_description.txt'
              zip.write <<~DESC
                dataset name: #{@container.name}
                instrument: #{@container.extended_metadata.fetch('instrument', nil)}
                description:
                #{@container.description}

                Files:
              DESC
              @container.attachments.each do |att|
                zip.write "#{att.filename} #{att.checksum}\n"
              end
            end
            zip_f.rewind
            zip_f.read
          end
        end
      end

      resource :metadata do
        desc "metadata of publication"
        params do
          requires :id, type: Integer, desc: "Id"
          requires :type, type: String, desc: "Type", values: %w[sample reaction container]
        end
        after_validation do
          @publication = Publication.find_by(
            element_type: params['type'].classify,
            element_id: params['id']
          )
          error!('404 Publication not found', 404) unless @publication && @publication.state.include?("completed")
        end
        desc "Download metadata_xml"
        get :download do
          el_type = params['type'] == "container" ? "analysis" : params['type']
          filename = URI.escape("metadata_#{el_type}_#{@publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.xml")
          content_type('application/octet-stream')
          header['Content-Disposition'] = "attachment; filename=" + filename
          env['api.format'] = :binary
          @publication.metadata_xml
        end
      end

      resource :published_statics do
        desc 'Return PUBLIC statics'
        get do
          ActiveRecord::Base.connection.exec_query('select * from publication_statics as ps')
        end
      end
    end

    namespace :upload do
      before do
        error!('Unauthorized' , 401) unless TokenAuthentication.new(request, with_remote_addr: true).is_successful?
      end
      resource :attachments do
        desc "Upload files"
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
                  content_type: file.type
                )
                begin
                  a.save!
                  a.update!(attachable: dataset)
                  primary_store = Rails.configuration.storage.primary_store
                  a.update!(storage: primary_store)
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
