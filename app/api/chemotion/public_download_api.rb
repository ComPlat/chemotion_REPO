# frozen_string_literal: true

module Chemotion
  # API endpoints for public download of publication data
  # Provides JSON-LD metadata and BagIt-compliant data packages
  class PublicDownloadAPI < Grape::API
    include Grape::Kaminari
    helpers DownloadHelpers

    namespace :public do
      resource :download do
        desc 'Download list of publication URLs filtered by instrument type and publication type'
        params do
          requires :kind, type: String, desc: 'Instrument type', values: DownloadHelpers::INSTRUMENT_TYPES,
                          default: 'NMR'
          requires :type, type: String, desc: 'Publication type', values: %w[Sample Reaction Container]
          requires :offset, type: Integer, desc: 'Offset for pagination', default: 0, values: -> { (0..Float::INFINITY) }
          requires :limit, type: Integer, desc: 'Limit for pagination (max 1000)', default: 100, values: lambda {
            (1..1000)
          }
          optional :date_from, type: String, desc: 'Published date from (YYYY-MM-DD format)'
          optional :date_to, type: String, desc: 'Published date to (YYYY-MM-DD format)'
          optional :tracking, type: Boolean, desc: 'Include tracker ID in metadata', default: false
        end

        get :list do
          # Use request base URL instead of hardcoded URLs for better deployment flexibility
          service_url = request.base_url
          service_url = service_url.gsub(/^http:/, 'https:') if Rails.env.production?
          api_url = '/api/v1/public/download/bagit/'

          result = declared(params, include_missing: false)
          # Grape validation already ensures limit is between 1 and 1000
          limit = params[:limit]

          # Map the simple kind parameter to the array of full CHMO kind values
          chmo_kinds = DownloadHelpers::INSTRUMENT_KIND_MAPPING[params[:kind]]
          return { error: 'Invalid instrument kind' } if chmo_kinds.blank?

          # Build query scope: join publications with containers and filter by metadata kind
          scope = Publication.joins('INNER JOIN containers c ON publications.element_id = c.id')
                             .where(element_type: 'Container', state: 'completed')
                             .where("c.extended_metadata -> 'kind' IN (?)", chmo_kinds)

          # Apply date filters if provided, ignoring placeholder values from some clients
          if params[:date_from].present? && params[:date_from] != '{date_from}'
            scope = scope.where('published_at >= ?', params[:date_from])
          end

          if params[:date_to].present? && params[:date_to] != '{date_to}'
            # Use end of day for date_to to include records from that day
            scope = scope.where('published_at <= ?', "#{params[:date_to]} 23:59:59")
          end

          # Get matching container publications to extract unique parent IDs
          # We don't paginate here because many containers can point to the same parent,
          # and many containers might not have parents with ZIP files.
          # Filtering 100 containers prematurely (the previous logic) caused valid data to be hidden.
          all_container_ancestries = scope.pluck(:ancestry).compact.uniq

          publications = case params[:type]
                         when 'Sample'
                           # For samples, get the last ID in the ancestry path (sample ID)
                           sample_ids = all_container_ancestries.map { |a| a.split('/').last.to_i }.uniq
                           Publication.where(id: sample_ids, element_type: 'Sample')
                         when 'Reaction'
                           # For reactions, get the first ID in the ancestry path (reaction ID)
                           reaction_ids = all_container_ancestries.map { |a| a.split('/').first.to_i }.uniq
                           Publication.where(id: reaction_ids, element_type: 'Reaction')
                         when 'Container'
                           # For containers, use the container publications scope directly
                           scope
                         else
                           return { error: 'Invalid publication type' }
                         end

          # Use the publication zip_download_url from taggable_data
          # Apply ZIP check, sorting, and pagination here to ensure consistent results
          list = publications.where(Arel.sql("taggable_data ->> 'zip_download_url' IS NOT NULL"))
                            .order(published_at: :desc)
                            .offset(params[:offset])
                            .limit(limit)
                            .pluck(:id, Arel.sql("taggable_data ->> 'zip_download_url'"))
                            .filter_map do |_pub_id, zip_url|
                              # Only include publications that have a valid zip_download_url
                              zip_url if zip_url.present?
                            end

          result[:publications] = list
          result[:limit] = limit
          result
        rescue StandardError => e
          Rails.logger.error "Error in publication list endpoint: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
          { error: 'Internal server error' }
        end

        resource :bagit do
          desc 'Download JSON-LD metadata and attachments for a publication as a BagIt-compliant zip file'
          params do
            requires :id, type: Integer, desc: 'Publication ID'
            optional :kind, type: String, desc: 'Instrument type filter', values: DownloadHelpers::INSTRUMENT_TYPES,
                            default: 'NMR'
            optional :tracking, type: Boolean, desc: 'Include tracker ID in metadata', default: false
          end

          route_param :id do
            before do
              @publication = Publication.includes(:element, :doi).find(params[:id])
              # Check if publication is accessible (published and not embargoed)
              error!('404 Not Found', 404) unless @publication.state == Publication::STATE_COMPLETED
            rescue ActiveRecord::RecordNotFound
              error!('404 Not Found', 404)
            end

            get do
              # Check if publication has a zip file available
              zip_url = @publication.zip_download_url
              if zip_url.blank?
                error!('ZIP file not available for this publication', 404)
              end

              # Check if the ZIP file actually exists
              unless @publication.zip_file_exists?
                error!('ZIP file not found on storage', 404)
              end

              begin
                # Redirect to the actual ZIP file URL
                redirect zip_url, permanent: false
              rescue StandardError => e
                Rails.logger.error "Error accessing publication ZIP file: #{e.message}"
                Rails.logger.error e.backtrace.join("\n")
                error!('Internal server error', 500)
              end
            end
          end
        end
      end
    end
  end
end
