module Chemotion
  class ExternalTokenAPI < Grape::API
    helpers do
      def find_user_token(provider)
        token = ExternalToken.for_user(current_user.id).for_provider(provider).first
        error!('Token not found for this provider', 404) unless token
        token
      end

      def handle_service_error(error_message, default_status = 500)
        Rails.logger.error error_message
        error!('Service temporarily unavailable', default_status)
      end

      # NMRXiv callback helpers
      def validate_callback_token!
        token = request.headers['Authorization']&.gsub(/^Bearer\s+/, '')

        unless token.present?
          error!('Missing authorization token', 401)
        end

        # For now, check against a configured token
        # In production, you might want to implement JWT verification
        expected_token = ENV['NMRXIV_CALLBACK_TOKEN'] || Rails.application.secrets.nmrxiv_callback_token

        unless token == expected_token
          nmrxiv_logger.warn("[CALLBACK_AUTH_FAILED] Invalid token provided - Token: #{token&.first(10)}..., Expected: #{expected_token&.first(10)}...")
          error!('Invalid authorization token', 401)
        end

        nmrxiv_logger.info("[CALLBACK_AUTH_SUCCESS] Valid callback token provided")
      end

      def nmrxiv_logger
        LoggerConfig.nmrxiv_logger
      end

      def find_publication!
        @publication = Publication.find_by(id: params[:publication_id])

        unless @publication
          nmrxiv_logger.error("[CALLBACK_ERROR] Publication not found - ID: #{params[:publication_id]}")
          error!('Publication not found', 404)
        end

        nmrxiv_logger.info("[CALLBACK_FOUND] Publication found - ID: #{@publication.id}, DOI: #{@publication.doi&.full_doi}")
        @publication
      end
    end

    resource :external_tokens do
      desc 'Get all external tokens for current user'
      get do
        tokens = ExternalToken.for_user(current_user.id).includes(:user)
        present tokens, with: Entities::ExternalTokenEntity, root: 'tokens'
      end

      desc 'Get external token for a specific provider'
      params do
        requires :provider, type: String, values: ExternalToken::SUPPORTED_PROVIDERS
      end
      get ':provider' do
        token = ExternalToken.for_user(current_user.id).for_provider(params[:provider]).first
        if token
          present token, with: Entities::ExternalTokenEntity
        else
          error!('Token not found for this provider', 404)
        end
      end

      desc 'Authenticate with external provider and store token'
      params do
        requires :provider, type: String, values: ExternalToken::SUPPORTED_PROVIDERS
        requires :credentials, type: Hash do
          requires :email, type: String, allow_blank: false, desc: 'Email for authentication'
          requires :password, type: String, allow_blank: false, desc: 'Password'
        end
      end
      post :authenticate do
        # Validate input
        error!('Email cannot be blank', 422) if params[:credentials][:email].blank?
        error!('Password cannot be blank', 422) if params[:credentials][:password].blank?
        case params[:provider]
        when 'nmrxiv'
          service = Chemotion::NmrxivService.new
          result = service.authenticate(
            params[:credentials][:email],
            params[:credentials][:password]
          )
          if result[:success]
            token = ExternalToken.find_or_initialize_for_user_and_provider(
              current_user.id,
              params[:provider]
            )

            token.update!(
              access_token: result[:access_token],
              refresh_token: result[:refresh_token],
              expires_at: result[:expires_at],
              provider_config: {
                user_info: result[:user_info],
                last_authenticated: Time.current
              }
            )

            present token, with: Entities::ExternalTokenEntity
          else
            error!(result[:error], 400)
          end
        else
          error!('Unsupported provider', 400)
        end
      rescue StandardError => e
        handle_service_error("External token authentication error: #{e.message}")
      end

      desc 'Refresh token for a provider'
      params do
        requires :provider, type: String, values: ExternalToken::SUPPORTED_PROVIDERS
      end
      post ':provider/refresh' do
        token = find_user_token(params[:provider])

        begin
          token.refresh_if_needed!
          present token, with: Entities::ExternalTokenEntity
        rescue StandardError => e
          Rails.logger.error "Token refresh error: #{e.message}"
          error!(e.message, 400)
        end
      end

      desc 'Validate token for a provider'
      params do
        requires :provider, type: String, values: ExternalToken::SUPPORTED_PROVIDERS
      end
      get ':provider/validate' do
        token = find_user_token(params[:provider])

        case params[:provider]
        when 'nmrxiv'
          service = Chemotion::NmrxivService.new
          result = service.validate_token(token.access_token)

          if result[:success]
            present({
              valid: result[:valid],
              provider: params[:provider],
              user_info: result[:user_info]
            })
          else
            error!(result[:error], 400)
          end
        else
          error!('Unsupported provider', 400)
        end
      rescue StandardError => e
        handle_service_error("Token validation error: #{e.message}")
      end

      desc 'Delete token for a provider'
      params do
        requires :provider, type: String, values: ExternalToken::SUPPORTED_PROVIDERS
      end
      delete ':provider' do
        token = find_user_token(params[:provider])
        token.destroy!
        status 204
      end

      desc 'Get user projects from NMRXiv'
      params do
        requires :provider, type: String, values: ['nmrxiv']
      end
      get ':provider/projects' do
        token = find_user_token(params[:provider])

        case params[:provider]
        when 'nmrxiv'
          # Refresh token if needed
          begin
            access_token = token.refresh_if_needed!
          rescue StandardError => e
            error!("Token refresh failed: #{e.message}", 401)
          end

          service = Chemotion::NmrxivService.new
          result = service.get_user_projects(access_token)

          if result[:success]
            present result[:projects]
          else
            error!(result[:error], 400)
          end
        else
          error!('Unsupported provider', 400)
        end
      rescue StandardError => e
        handle_service_error("External API error: #{e.message}")
      end

      # NMRXiv callback endpoint for status updates
      namespace :nmrxiv do
        namespace :callback do
          route_param :publication_id, type: Integer, desc: 'Publication ID' do
            desc 'Receive callback from NMRXiv about upload status'
            params do
              requires :status, type: String, desc: 'Upload status (success, error, processing, etc.)', values: %w[success error processing failed completed]
              optional :message, type: String, desc: 'Status message from NMRXiv'
              optional :nmrxiv_id, type: String, desc: 'NMRXiv internal ID for the upload'
              optional :nmrxiv_url, type: String, desc: 'URL to the published data on NMRXiv'
              optional :error_details, type: String, desc: 'Detailed error information if status is error'
              optional :metadata, type: Hash, desc: 'Additional metadata from NMRXiv'
            end
            post do
              # Skip authentication and use token validation for callbacks
              validate_callback_token!

              # Find the publication
              publication = find_publication!

              # Log the callback
              nmrxiv_logger.info("[CALLBACK_RECEIVED] Publication ID: #{publication.id}, Status: #{params[:status]}, NMRXiv ID: #{params[:nmrxiv_id]}, Message: #{params[:message]}")

              # Process the callback
              result = NmrxivCallbackService.new(publication).process_callback(
                status: params[:status],
                message: params[:message],
                nmrxiv_id: params[:nmrxiv_id],
                nmrxiv_url: params[:nmrxiv_url],
                error_details: params[:error_details],
                metadata: params[:metadata]
              )

              if result[:success]
                nmrxiv_logger.info("[CALLBACK_PROCESSED] Successfully processed callback - Publication ID: #{publication.id}, Status: #{params[:status]}")
                { success: true, message: 'Callback processed successfully' }
              else
                nmrxiv_logger.error("[CALLBACK_PROCESSING_ERROR] Failed to process callback - Publication ID: #{publication.id}, Error: #{result[:error]}")
                error!(result[:error], 422)
              end
            end
          end
        end
      end
    end
  end
end
