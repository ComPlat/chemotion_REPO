# frozen_string_literal: true

# rubocop: disable Metrics/ClassLength
require 'open-uri'

# Belong to Chemotion module
module Chemotion
  # API for Public data
  class PublicAPI < Grape::API
    helpers CompoundHelpers
    helpers PublicHelpers
    helpers ParamsHelpers

    namespace :public do
      get 'ping' do
        status 204
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

      namespace :token do
        desc 'Generate Token'
        params do
          requires :username, type: String, desc: 'Username'
          requires :password, type: String, desc: 'Password'
        end
        post do
          token = Usecases::Public::BuildToken.execute!(params)
          error!('401 Unauthorized', 401) if token.blank?

          { token: token }
        end
      end

      desc 'Public initialization'
      get 'initialize' do
        {
          molecule_viewer: Matrice.molecule_viewer,
          repo_versioning: ENV['REPO_VERSIONING'] == 'true' ? true : false,
          u: Rails.configuration.u || {},
        }
      end

      namespace :generic_templates do
        desc "get active generic templates"
        params do
          requires :klass, type: String, desc: 'Klass', values: %w[Element Segment Dataset]
        end
        get do
          list = "Labimotion::#{params[:klass]}Klass".constantize.where(is_active: true).where.not(released_at: nil).select { |s| s["is_generic"].blank? }
          entities = Labimotion::GenericPublicEntity.represent(list)
          # entities.length > 1 ? de_encode_json(entities) : []
        end
      end

      namespace :element_klasses_name do
        desc "get klasses"
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


      namespace :omniauth_providers do
        desc 'get omniauth providers'
        get do
          res = {}
          config = Devise.omniauth_configs
          extra_rules = Matrice.extra_rules
          config.each do |k, _v|
            res[k] = { icon: File.basename(config[k].options[:icon] || ''), label: config[k].options[:label] }
          end
          { omniauth_providers: res, extra_rules: extra_rules }
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

      namespace :find_adv_values do
        helpers do
          def query_authors(name)
            result = User.where(type: %w(Person Group Collaborator)).where(
              <<~SQL
                users.id in (
                  select distinct(pa.author_id)::integer from publication_authors pa where state = 'completed'
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
          content_type 'application/octet-stream'
          payload = JWT.decode(params[:token], Rails.application.secrets.secret_key_base) unless params[:token].nil?
          error!('401 Unauthorized', 401) if payload&.length == 0
          att_id = payload[0]['att_id']&.to_i
          user_id = payload[0]['user_id']&.to_i
          @attachment = Attachment.find_by(id: att_id)
          @user = User.find_by(id: user_id)
          error!('401 Unauthorized', 401) if @attachment.nil? || @user.nil?
          header['Content-Disposition'] = "attachment; filename=\"#{@attachment.filename}\""
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
          error!('401 Unauthorized', 401) if payload.empty?
          @status = params[:status].is_a?(Integer) ? params[:status] : 0

          if @status > 1
            attach_id = payload[0]['att_id']&.to_i
            @url = params[:url]
            @attachment = Attachment.find_by(id: attach_id)
            user_id = payload[0]['user_id']&.to_i
            @user = User.find_by(id: user_id)
            error!('401 Unauthorized', 401) if @attachment.nil? || @user.nil?
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

          begin
            ComputedProp.from_raw(cp.id, params[:data])
          rescue StandardError => e
            Rails.logger.error("ComputedProp calculation fail: #{e.message}")
            cp.status = 'failure'
            cp.save!
          end
          cp = ComputedProp.find(params[:compute_id])
          Message.create_msg_notification(
            channel_subject: Channel::COMPUTED_PROPS_NOTIFICATION, message_from: cp.creator,
            data_args: { sample_id: cp.sample_id, status: cp.status }, cprop: ComputedProp.find(cp.id),
            level: %w[success completed].include?(cp.status) ? 'success' : 'error'
          )
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
