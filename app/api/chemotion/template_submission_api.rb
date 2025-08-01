# frozen_string_literal: true

module Chemotion
  # API for Template Submissions from external systems
  class TemplateSubmissionAPI < Grape::API
    include Grape::Kaminari

    helpers do
      # Get allowed origin URLs from environment variable
      # Format: TEMPLATE_SUBMISSION_ALLOWED_ORIGINS='http://system1.com,https://system2.org'
      def allowed_origin_urls
        @allowed_origin_urls ||= begin
          urls = ENV['TEMPLATE_SUBMISSION_ALLOWED_ORIGINS']&.split(',')&.map(&:strip) || []
          urls.presence || []
        end
      end

      # Authenticate using X-Origin-URL header against whitelist (for external systems)
      def authenticate_with_origin!
        origin_url = extract_origin_url
        validate_origin_url_present!(origin_url)
        validate_allowed_origins_configured!
        validate_origin_authorized!(origin_url)

        @origin_url = origin_url
        Rails.logger.info "Template submission authenticated from origin: #{origin_url}"
      end

      def extract_origin_url
        request.headers['X-Origin-URL'] || request.headers['X-Origin-Url']
      end

      def validate_origin_url_present!(origin_url)
        return if origin_url.present?

        Rails.logger.warn "Template submission rejected: Missing X-Origin-URL header from IP #{request.ip}"
        log_available_headers
        error!('X-Origin-URL header is required', 401)
      end

      def log_available_headers
        Rails.logger.debug do
          "Available headers: #{request.headers.select { |k, _| k.start_with?('HTTP_', 'X-') }.to_h}"
        end
      end

      def validate_allowed_origins_configured!
        return unless allowed_origin_urls.empty?

        Rails.logger.error 'Template submission configuration error: TEMPLATE_SUBMISSION_ALLOWED_ORIGINS not set'
        error!('Template submission service not configured', 503)
      end

      def validate_origin_authorized!(origin_url)
        return if allowed_origin_urls.include?(origin_url)

        Rails.logger.warn "Template submission rejected: Unauthorized origin '#{origin_url}' from IP #{request.ip}"
        error!('Unauthorized origin', 403)
      end

      def origin_identifier
        @origin_url || 'unknown'
      end
    end

    # Public namespace for external systems - ONLY CREATE endpoint is public
    namespace :labimotion_hub do
      namespace :template_submissions do
        desc 'Create a template submission'
        params do
          requires :template_klass, type: String, desc: 'Type of template (e.g., reaction, sample, analysis)'
          requires :template, type: Hash, desc: 'Template data in JSON format'
          optional :metadata, type: Hash, desc: 'Additional metadata', default: {}
          optional :origin, type: String, desc: 'Origin of the submission', default: 'external_api'
        end
        before do
          authenticate_with_origin!
        end
        post do
          submission = TemplateSubmission.create!(
            template_klass: params[:template_klass],
            template: params[:template],
            metadata: (params[:metadata] || {}).merge(
              submitted_from_origin: origin_identifier,
              submitted_from_ip: request.ip,
              submitted_at: Time.current.iso8601,
            ),
            origin: params[:origin],
            state: :pending,
          )

          Entities::TemplateSubmissionEntity.represent(submission)
        rescue ActiveRecord::RecordInvalid => e
          error!("Validation failed: #{e.message}", 422)
        rescue StandardError => e
          Rails.logger.error "Template submission error: #{e.message}\n#{e.backtrace.join("\n")}"
          error!("Failed to create template submission: #{e.message}", 500)
        end
      end
    end

    resource :template_submissions do
      before do
        authenticate!
      end

      desc 'Get template submission by ID'
      params do
        requires :id, type: Integer, desc: 'Template submission ID'
      end
      get ':id' do
        submission = TemplateSubmission.find_by(id: params[:id])
        error!('Template submission not found', 404) unless submission

        Entities::TemplateSubmissionEntity.represent(submission)
      end

      desc 'List template submissions'
      params do
        optional :template_klass, type: String, desc: 'Filter by template type'
        optional :state, type: String, desc: 'Filter by state (pending, approved, rejected, released)'
        optional :origin, type: String, desc: 'Filter by origin'
        optional :page, type: Integer, desc: 'Page number', default: 1
        optional :per_page, type: Integer, desc: 'Items per page', default: 20, values: ->(v) { v.between?(1, 100) }
      end
      get do
        submissions = TemplateSubmission.recent

        submissions = submissions.by_template_type(params[:template_klass]) if params[:template_klass].present?
        submissions = submissions.by_state(params[:state]) if params[:state].present?
        submissions = submissions.by_origin(params[:origin]) if params[:origin].present?

        # Pagination
        page = params[:page] || 1
        per_page = params[:per_page] || 20
        total = submissions.count
        submissions = submissions.offset((page - 1) * per_page).limit(per_page)

        {
          submissions: submissions.map { |s| Entities::TemplateSubmissionEntity.new(s).as_json },
          pagination: {
            current_page: page,
            per_page: per_page,
            total_items: total,
            total_pages: (total.to_f / per_page).ceil,
          },
        }
      end

      desc 'Update template submission state'
      params do
        requires :id, type: Integer, desc: 'Template submission ID'
        requires :state, type: String, desc: 'New state', values: %w[pending approved rejected released]
        optional :metadata_update, type: Hash, desc: 'Additional metadata to merge'
      end
      put ':id/state' do
        submission = TemplateSubmission.find_by(id: params[:id])
        error!('Template submission not found', 404) unless submission

        begin
          update_attrs = { state: params[:state] }

          if params[:metadata_update].present?
            updated_metadata = submission.metadata.merge(params[:metadata_update])
            updated_metadata.merge!(
              "#{params[:state]}_by_user_id" => current_user.id,
              "#{params[:state]}_by_username" => current_user.name_abbreviation,
              "#{params[:state]}_at" => Time.current.iso8601,
            )
            update_attrs[:metadata] = updated_metadata
          end

          submission.update!(update_attrs)

          Entities::TemplateSubmissionEntity.represent(submission)
        rescue ActiveRecord::RecordInvalid => e
          error!("Validation failed: #{e.message}", 422)
        rescue StandardError => e
          Rails.logger.error "Template submission update error: #{e.message}"
          error!("Failed to update template submission: #{e.message}", 500)
        end
      end

      desc 'Delete template submission'
      params do
        requires :id, type: Integer, desc: 'Template submission ID'
      end
      delete ':id' do
        submission = TemplateSubmission.find_by(id: params[:id])
        error!('Template submission not found', 404) unless submission

        begin
          submission.destroy!
          status 204
        rescue StandardError => e
          Rails.logger.error "Template submission delete error: #{e.message}"
          error!("Failed to delete template submission: #{e.message}", 500)
        end
      end
    end
  end
end
