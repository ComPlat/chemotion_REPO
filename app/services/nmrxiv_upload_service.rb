# frozen_string_literal: true

require 'faraday'
require 'faraday/multipart'
require 'digest'

# Service for uploading publication data to NMRXiv
class NmrxivUploadService
  TEMP_DIR = Rails.public_path.join('nmrxiv/uploads')
  FILE_RETENTION_HOURS = 24

  attr_reader :publication, :error, :access_token, :file_path, :logger

  def nmrxiv_logger
    LoggerConfig.nmrxiv_logger
  end

  def initialize(publication, access_token)
    @publication = publication
    @access_token = access_token
    app_host = Rails.application.routes.default_url_options[:host] rescue nil
    app_port = Rails.application.routes.default_url_options[:port] rescue nil
    app_protocol = Rails.application.config.force_ssl ? 'https' : 'http'
    @error = nil
    @file_path = nil

    nmrxiv_logger.info("[SERVICE_INIT] Initialized NMRXiv upload service - Publication: #{@publication.id}, DOI: #{@publication.doi&.full_doi}")
  end

  # Get the NMRXiv API URL from configuration
  def api_url
    ExternalServicesConfig.nmrxiv_upload_url || 'https://dev.nmrxiv.org/api/v1/chemotion/upload'
  end

  # Main method to upload publication data to NMRXiv and create temporary download link
  def upload(kinds: nil, tracking: false)
    external_id = generate_external_id
    nmrxiv_logger.info("[UPLOAD_START] Publication: #{@publication.id}, External ID: #{external_id}")

    begin
      download_url = @publication.zip_download_url
      nmrxiv_logger.error("[DOWNLOAD_URL_ERROR] download URL does not exist: #{download_url}") unless download_url
      return error_result('Failed to generate download URL') unless download_url
      @file_path = download_url


      nmrxiv_logger.info("[API_UPLOAD] Starting API upload to NMRXiv, Download URL: #{download_url}")
      response = upload_to_nmrxiv(download_url)

      unless response[:success]
        nmrxiv_logger.error("[API_UPLOAD_FAILURE] Upload failed - Publication: #{@publication.id}, Error: #{response[:error]}")
        return error_result("Upload failed: #{response[:error]}")
      end

      nmrxiv_logger.info("[API_UPLOAD_SUCCESS] Upload successful - Publication: #{@publication.id}, Response: #{response[:nmrxiv_response]}")
      success_result(download_url, response[:nmrxiv_response])

    rescue StandardError => e
      nmrxiv_logger.error("[UPLOAD_ERROR] Upload error occurred - Publication: #{@publication.id}, External ID: #{external_id}, URL: #{download_url}")

      nmrxiv_logger.error "NMRXiv upload error: #{e.message}"
      nmrxiv_logger.error e.backtrace.join("\n")

      error_result("Upload service error: #{e.message}")
    end
  end

  private

  def upload_to_nmrxiv(download_url)
    begin
      connection = build_nmrxiv_connection
      # download_url = generate_download_url(file_path)
      payload = build_nmrxiv_payload(download_url)

      nmrxiv_logger.debug("[API_PAYLOAD] Built NMRXiv payload - External ID: #{payload[:external_id]}, ZIP URL: #{payload[:zip_url]}, Callback: #{payload[:callback_url]}, Token: #{payload[:callback_token]&.first(8)}..., Release: #{payload[:release_date]}")

      response = post_nmrxiv(connection, payload)
      handle_nmrxiv_response(response)
    rescue Faraday::TimeoutError => e
      nmrxiv_logger.error("[API_TIMEOUT_ERROR] Request timed out - API: #{api_url}, Timeout: #{ExternalServicesConfig.nmrxiv_timeout}")
      nmrxiv_logger.error(e.backtrace.join("\n"))
      {
        success: false,
        error: "Request timeout: #{e.message}",
      }
    rescue Faraday::ConnectionFailed => e
      nmrxiv_logger.error("[API_CONNECTION_ERROR] Connection failed - API: #{api_url}")
      nmrxiv_logger.error(e.backtrace.join("\n"))
      {
        success: false,
        error: "Connection failed: #{e.message}",
      }
    rescue StandardError => e
      nmrxiv_logger.error("[API_UPLOAD_ERROR] Upload error occurred - API: #{api_url}, Publication: #{@publication.id}")
      nmrxiv_logger.error(e.backtrace.join("\n"))
      {
        success: false,
        error: "Network error: #{e.message}",
      }
    end
  end

  def build_nmrxiv_connection
    nmrxiv_logger.debug("[CONNECTION_BUILD] Building NMRXiv connection - API: #{api_url}, Timeout: #{ExternalServicesConfig.nmrxiv_timeout}")

    Faraday.new(url: api_url) do |faraday|
      faraday.request :json
      faraday.response :json
      faraday.response :follow_redirects
      faraday.adapter Faraday.default_adapter
      faraday.options.timeout = ExternalServicesConfig.nmrxiv_timeout
    end
  end

  def build_nmrxiv_payload(download_url)
    {
      external_id: generate_external_id,
      callback_url: generate_callback_url,
      callback_token: generate_callback_token,
      zip_url: download_url,
      release_date: generate_release_date,
    }
  end

  def post_nmrxiv(connection, payload)
    nmrxiv_logger.debug("[POST_REQUEST] Sending request to NMRXiv - URL: #{api_url}, Headers: Authorization: [REDACTED], Content-Type: application/json")

    response = connection.post do |req|
      req.headers['Authorization'] = "Bearer #{@access_token}"
      req.headers['Content-Type'] = 'application/json'
      req.body = payload
      req.options.timeout = 60 # 1 minute timeout for JSON payload
    end

    nmrxiv_logger.debug("[POST_RESPONSE] Received response - Status: #{response.status}, Body size: #{response.body&.to_s&.length || 0} chars")
    response
  end

  def handle_nmrxiv_response(response)
    if response.success?
      raw_body = response.body || '{}'
      response_body = if raw_body.is_a?(Hash)
                        raw_body
                      else
                        JSON.parse(raw_body)
                      end
      nmrxiv_logger.info("Response from NMRXiv - Status: #{response.status}, Body: #{response_body.inspect}")
      nmrxiv_logger.info("[API_SUCCESS] NMRXiv API response successful - Status: #{response.status}, ID: #{response_body.dig('id')}, Status: #{response_body.dig('status')}")
      nmrxiv_logger.debug("[API_RESPONSE] NMRXiv response body: #{response_body.inspect}")
      {
        success: true,
        nmrxiv_response: response_body,
      }
    else
      error_message = "HTTP #{response.status}: #{response.body}"
      nmrxiv_logger.error("[API_FAILURE] #{error_message} - Status: #{response.status}, Body: #{response.body}")
      {
        success: false,
        error: error_message,
      }
    end
  rescue JSON::ParserError => e
    nmrxiv_logger.error("[API_PARSE_ERROR] Failed to parse NMRXiv response as JSON (received HTML or non-JSON body) - Status: #{response.status}, Error: #{e.message}")
    nmrxiv_logger.debug("[API_PARSE_ERROR] Raw body: #{response.body&.first(500)}")
    {
      success: false,
      error: "Invalid response from NMRXiv (non-JSON body): #{e.message}",
    }
  end

  def generate_external_id
    RepoTrackerService.tracking_item_name(@publication)
  end

  def generate_callback_url
    begin
      # Generate callback URL for NMRXiv to notify when processing is complete
      callback_url = "#{ENV['PUBLIC_URL']}/api/v1/external_tokens/nmrxiv/callback/#{@publication.id}"

      nmrxiv_logger.debug("[CALLBACK_URL] Generated callback URL - URL: #{callback_url}, Publication ID: #{@publication.id}")

      callback_url
    rescue StandardError => e
      nmrxiv_logger.error("[CALLBACK_URL_ERROR] Failed to generate callback URL - Publication ID: #{@publication.id}, Error: #{e.message}")
      nmrxiv_logger.error "Failed to generate callback URL: #{e.message}"
      nmrxiv_logger.error(e.backtrace.join("\n"))
      "#{ENV['PUBLIC_URL']}/api/v1/external_tokens/nmrxiv/callback/#{@publication.id}"
    end
  end

  def generate_callback_token
    begin
      # Generate or retrieve the callback token for NMRXiv to use when calling back
      token = ENV['NMRXIV_CALLBACK_TOKEN'] || Rails.application.secrets.nmrxiv_callback_token

      # If no token is configured, generate a secure random token
      if token.blank?
        token = SecureRandom.hex(32)
        nmrxiv_logger.warn("[CALLBACK_TOKEN] No callback token configured, generated temporary token - Publication ID: #{@publication.id}")
      end

      nmrxiv_logger.debug("[CALLBACK_TOKEN] Generated callback token - Publication ID: #{@publication.id}, Token: #{token&.first(8)}...")

      token
    rescue StandardError => e
      nmrxiv_logger.error("[CALLBACK_TOKEN_ERROR] Failed to generate callback token - Publication ID: #{@publication.id}, Error: #{e.message}")
      nmrxiv_logger.error "Failed to generate callback token: #{e.message}"
      nmrxiv_logger.error(e.backtrace.join("\n"))
      SecureRandom.hex(32)
    end
  end

  def generate_release_date
    begin
      # Set release date based on publication date or current date plus some buffer
      release_date = if @publication.published_at.present?
                       @publication.published_at.strftime('%Y-%m-%d')
                     else
                       # Default to 1 year from now if no publication date
                       # 1.year.from_now.strftime('%Y-%m-%d')
                       ''
                     end

      nmrxiv_logger.debug("[RELEASE_DATE] Generated release date - Date: #{release_date}, Published At: #{@publication.published_at}, Publication ID: #{@publication.id}")

      release_date
    rescue StandardError => e
      nmrxiv_logger.error("[RELEASE_DATE_ERROR] Failed to generate release date - Publication ID: #{@publication.id}, Published At: #{@publication.published_at}, Error: #{e.message}")
      nmrxiv_logger.error "Failed to generate release date: #{e.message}"
      nmrxiv_logger.error(e.backtrace.join("\n"))
      ''
    end
  end

  def success_result(download_url, nmrxiv_response)
    result = {
      success: true,
      download_url: download_url,
      nmrxiv_response: nmrxiv_response,
      expires_at: FILE_RETENTION_HOURS.hours.from_now,
      message: 'Publication data successfully uploaded to NMRXiv and temporary download link created',
    }

    nmrxiv_logger.info("[UPLOAD_COMPLETE] Upload process completed successfully - Publication ID: #{@publication.id}, Download URL: #{download_url}, Expires at: #{result[:expires_at]}, NMRXiv ID: #{nmrxiv_response.dig('id')}")

    result
  end

  def error_result(message)
    @error = message
    result = {
      success: false,
      error: message,
    }

    nmrxiv_logger.error("[UPLOAD_ERROR] #{message} - Publication ID: #{@publication.id}")

    result
  end
end
