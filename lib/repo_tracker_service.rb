# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'
require 'fileutils'

class RepoTrackerService
  BASE_URL = ExternalServicesConfig.repo_tracker_base_url || 'http://localhost:8000'

  def self.tracking_item_name(publication)
    element = publication&.element
    return '' unless publication && element

    begin
      et = element.tag
      tracking_item_name = et&.taggable_data&.dig('tracking_item_name')
      LoggerConfig.tracker_logger.debug("[TrackingItemName] existing: #{tracking_item_name}") if tracking_item_name.present?
      return tracking_item_name if tracking_item_name.present?

      tracking_item_name = et.taggable_data&.dig('eln_info', 'tracking_item_name')
      LoggerConfig.tracker_logger.debug("[TrackingItemName] from ELN: #{tracking_item_name}") if tracking_item_name.present?

      tracking_item_name = generate_tracking_item_name(publication) if tracking_item_name.nil?
      LoggerConfig.tracker_logger.debug("[TrackingItemName] New Generating tracker_item_name: #{tracking_item_name}")

      et.update!(taggable_data: (et.taggable_data || {}).merge(tracking_item_name: tracking_item_name)) if tracking_item_name.present?
      LoggerConfig.tracker_logger.debug("[TrackingItemName] tracker_item_name: #{tracking_item_name}")
      tracking_item_name
    rescue => e
      LoggerConfig.tracker_logger.error("[RepoTrackerService] Error creating tracking item name: #{e.message}")
      LoggerConfig.tracker_logger.error(e.backtrace.join("\n"))
      # Use fallback tracking item name
      tracking_item_name
    end
  end

  def initialize(element, new_element, user_id, state, to_system = 'chemotion_repository')
    @element = element
    @to_system = to_system
    @publication = new_element.publication if new_element.respond_to?(:publication)
    @tracking_item_name = RepoTrackerService.tracking_item_name(@publication)
    @new_element = new_element
    @user_id = user_id
    @user = User.find_by(id: @user_id)
    @state = state
    @access_token = nil
    @start_time = Time.current

    # Track child elements if this is a Reaction
    @child_publications = []
    if @publication&.element_type == 'Reaction'
      # Children have their own publications - use publication.children or publication.descendants
      @child_publications = @publication.children.presence || []
      tracker_logger.info("[RepoTrackerService.init] Reaction detected, will track #{@child_publications.count} child publication(s)")
    end

    tracker_logger.info("[RepoTrackerService.init] tracking_item_name: #{@tracking_item_name}, state: #{@state}")
  end

  def call
    unless @user
      tracker_logger.error("[RepoTrackerService] User not found: #{@user_id}")
      return
    end

    # Only process Reaction or Sample element types
    unless @publication&.element_type.in?(['Reaction', 'Sample'])
      tracker_logger.info("[RepoTrackerService] Skipping tracking - element type '#{@publication&.element_type}' is not supported. Only 'Reaction' and 'Sample' are tracked.")
      return
    end

    if !ExternalServicesConfig.repo_tracker_enabled?
      tracker_logger.info("[RepoTrackerService] Disabled, skipping tracking for #{@tracking_item_name} with state #{@state}")
      return
    end


    # Set up OAuth credentials
    unless ExternalServicesConfig.repo_tracker_username && ExternalServicesConfig.repo_tracker_password && ExternalServicesConfig.repo_tracker_client_id
      missing_keys = []
      missing_keys << 'repo_tracker_username' unless ExternalServicesConfig.repo_tracker_username
      missing_keys << 'repo_tracker_password' unless ExternalServicesConfig.repo_tracker_password
      missing_keys << 'repo_tracker_client_id' unless ExternalServicesConfig.repo_tracker_client_id
      tracker_logger.error("Missing configuration keys: #{missing_keys.join(', ')}")
      return
    else
      keys = {
        enabled: ExternalServicesConfig.repo_tracker_enabled?,
        username: ExternalServicesConfig.repo_tracker_username,
        password: ExternalServicesConfig.repo_tracker_password,
        client_id: ExternalServicesConfig.repo_tracker_client_id,
        base_url: ExternalServicesConfig.repo_tracker_base_url,
        tracker_name: ExternalServicesConfig.repo_tracker_name,
      }
      tracker_logger.info("[RepoTrackerService] Using OAuth credentials: #{keys[:enabled]}, #{keys[:base_url]}, #{keys[:tracker_name]}, #{keys[:username]}, #{keys[:client_id]}")
    end

    begin
      tracker_logger.debug("[OAuth] Getting OAuth token for state: #{@state}")
      # Get OAuth token
      token = get_oauth_token
      if token
        tracker_logger.info("[TokenObtained] OAuth token obtained, sending tracking data with state: #{@state}")

        # Send tracking data for main element
        result = send_tracking_data_for_element(token, @element, @new_element, @tracking_item_name)

        # Send tracking data for child elements (products) if this is a Reaction
        child_results = []
        if @child_publications.any?
          tracker_logger.info("[ChildTracking] Sending tracking data for #{@child_publications.count} child publication(s)")
          @child_publications.each do |child_publication|
            child_element = child_publication.element
            child_tracking_item_name = RepoTrackerService.tracking_item_name(child_publication)
            child_result = send_tracking_data_for_element(token, child_element, child_element, child_tracking_item_name, @element)
            child_results << child_result
          end
        end

        duration = Time.current - @start_time
        all_successful = result&.dig(:success) == true && child_results.all? { |r| r&.dig(:success) == true }
        tracker_logger.info("[JobCompletion] RepoTrackerService completed for #{@tracking_item_name} with state #{@state} - Success: #{all_successful}, Duration: #{duration.round(2)}s, Child tracking results: #{child_results.map { |r| r&.dig(:success) }}")
      else
        duration = Time.current - @start_time
        tracker_logger.error("[TokenFailure] Failed to obtain OAuth token for state: #{@state}")
        tracker_logger.info("[JobCompletion] RepoTrackerService failed for #{@tracking_item_name} with state #{@state} - Success: false, Duration: #{duration.round(2)}s")
      end
    rescue StandardError => e
      duration = Time.current - @start_time
      tracker_logger.error("[ServiceException] RepoTrackerService failed for state #{@state}: #{e.message} - Element: #{@element&.id}, User: #{@user_id}, Exception: #{e.class.name}, Backtrace: #{e.backtrace&.first(5)}")
      tracker_logger.info("[JobCompletion] RepoTrackerService failed for #{@tracking_item_name} with state #{@state} - Success: false, Duration: #{duration.round(2)}s")
      # Log the error but don't re-raise to prevent breaking the process
      tracker_logger.warn("[ProcessContinue] RepoTrackerService continuing despite error for #{@tracking_item_name}")
    rescue => e
      # Catch any other unexpected exceptions
      duration = Time.current - @start_time
      tracker_logger.fatal("[UnexpectedException] Unexpected exception in RepoTrackerService for state #{@state}: #{e.message} - #{@tracking_item_name}, User: #{@user_id}")
      tracker_logger.error("[UnexpectedException] Backtrace: #{e.backtrace.join("\n")}")
      tracker_logger.info("[JobCompletion] RepoTrackerService failed for #{@tracking_item_name} with state #{@state} - Success: false, Duration: #{duration.round(2)}s")
    end
  end

  def self.generate_tracking_item_name(publication)
    element = publication&.element
    return nil unless publication && element

    tracker_prefix = TrackerCommon.extract_hostname_without_tld
    LoggerConfig.tracker_logger.debug("[TrackingItemName] Generating tracker_prefix #{tracker_prefix}")
    "#{tracker_prefix}-#{element.short_label}-#{element.id}"
  end

  private_class_method :generate_tracking_item_name

  private

  def tracker_logger
    LoggerConfig.tracker_logger
  end

  def create_http_connection(uri)
    begin
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == 'https'
      http.read_timeout = 30
      http.open_timeout = 10
      http
    rescue => e
      tracker_logger.error("[HTTPConnectionError] Error creating HTTP connection: #{e.message} - URI: #{uri}")
      tracker_logger.error(e.backtrace.join("\n"))
      raise e
    end
  end

  def validate_required_params
    unless ExternalServicesConfig.repo_tracker_username && ExternalServicesConfig.repo_tracker_password && ExternalServicesConfig.repo_tracker_client_id
      missing_keys = []
      missing_keys << 'repo_tracker_username' unless ExternalServicesConfig.repo_tracker_username
      missing_keys << 'repo_tracker_password' unless ExternalServicesConfig.repo_tracker_password
      missing_keys << 'repo_tracker_client_id' unless ExternalServicesConfig.repo_tracker_client_id
      tracker_logger.error("Missing configuration keys: #{missing_keys.join(', ')}")
      return false
    end
    true
  end

  def get_oauth_token
    return nil unless validate_required_params

    uri = URI("#{ExternalServicesConfig.repo_tracker_oauth_endpoint.to_s}" || "#{ExternalServicesConfig.repo_tracker_base_url}/oauth/token")
    params = {
      grant_type: 'password',
      username: ExternalServicesConfig.repo_tracker_username,
      password: ExternalServicesConfig.repo_tracker_password,
      client_id: ExternalServicesConfig.repo_tracker_client_id,
    }

    http = create_http_connection(uri)
    start_time = Time.current

    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/x-www-form-urlencoded'
    request.body = URI.encode_www_form(params)

    tracker_logger.debug("[OAuthRequest] Requesting OAuth token from #{uri}")

    begin
      response = http.request(request)
    rescue => e
      tracker_logger.error("[OAuthRequestError] Unexpected error requesting OAuth token: #{e.message} - URI: #{uri}")
      tracker_logger.error(e.backtrace.join("\n"))
      return nil
    end

    duration = ((Time.current - start_time) * 1000).round(2)

    tracker_logger.info("[POST] #{uri} - Response: #{response.code}, Message: #{response.message}, Body: #{response.body}, Duration: #{duration}ms")
    if response.code == '200'
      token_data = JSON.parse(response.body)
      @access_token = token_data['access_token']
      tracker_logger.info("[OAuth] Token request successful - Response: #{response.code}")
      return token_data['access_token']
    else
      tracker_logger.info("[OAuth] Token request failed - Response: #{response.code}, Body: #{response.body}")
      return nil
    end
  rescue JSON::ParserError => e
    tracker_logger.error("[OAuthParseError] JSON parsing error for OAuth token response: #{e.message} - Response: #{response&.body}")
    tracker_logger.error(e.backtrace.join("\n"))
    return nil
  rescue => e
    tracker_logger.error("[OAuthError] Error getting OAuth token: #{e.message}")
    tracker_logger.error(e.backtrace.join("\n"))
    return nil
  ensure
    safe_close_http_connection(http)
  end

  def send_tracking_data_for_element(token, element, new_element, tracking_item_name, parent_element = nil)
    is_child = parent_element.present?
    log_prefix = is_child ? "Child" : ""
    tracker_logger.info("[#{log_prefix}TrackingDataStart] Sending tracking data for #{is_child ? 'child ' : ''}element: #{tracking_item_name} with state: #{@state}")

    uri = URI(ExternalServicesConfig.repo_tracker_tracking_endpoint)
    start_time = Time.current

    begin
      # Ensure we have a valid token for the request
      token = ensure_valid_token(token)
      unless token
        tracker_logger.error("[#{log_prefix}TokenValidation] Failed to obtain valid token for #{tracking_item_name} with state #{@state}")
        return { success: false, message: "Invalid token" }
      end

      tracker_logger.debug("[#{log_prefix}MetadataBuilding] Building metadata for #{is_child ? 'child ' : ''}element: #{tracking_item_name} - State: #{@state}")

      begin
        params = parent_element ? { parent_element: parent_element } : {}
        metadata = RepoTrackerMetadataService.build_metadata(
          state: @state,
          element: element,
          new_element: new_element,
          to_system: @to_system,
          eln_info: {},
          user: @user,
          params: params
        )
      rescue => e
        tracker_logger.error("[#{log_prefix}MetadataServiceError] Error building metadata for #{is_child ? 'child ' : ''}element: #{e.message} - tracking_item_name: #{tracking_item_name}")
        tracker_logger.error(e.backtrace.join("\n"))
        # Use fallback metadata
        fallback_metadata = {
          element_id: element.id,
          state: @state,
          timestamp: Time.current.iso8601,
          error: "Metadata service failed"
        }
        fallback_metadata[:parent_element_id] = parent_element.id if parent_element
        metadata = fallback_metadata
      end

      tracking_data = {
        status: @state,
        metadata: metadata,
        tracking_item_name: tracking_item_name,
        tracking_item_owner_name: @user.name,
        tracking_item_owner_email: @user.email,
        from_trackable_system_name: ExternalServicesConfig.repo_tracker_name || 'chemotion_repository',
        to_trackable_system_name: @to_system || ExternalServicesConfig.repo_tracker_name || 'chemotion_repository',
      }

      tracker_logger.info("[Sending #{log_prefix}TrackingRequest] #{tracking_item_name} State: #{@state}")
      tracker_logger.debug("[#{log_prefix}TrackingRequest] Request payload for #{tracking_item_name} - Size: #{tracking_data.to_json.bytesize} bytes#{is_child ? '' : ', Item: ' + tracking_data.to_s}")

      # Create a new HTTP connection for the request
      http = create_http_connection(uri)

      request = Net::HTTP::Post.new(uri)
      request['Content-Type'] = 'application/json'
      request['Authorization'] = "Bearer #{token}"
      request.body = tracking_data.to_json

      begin
        response = http.request(request)
        tracker_logger.info("[#{log_prefix}TrackingResponse] #{tracking_item_name} Code: #{response.code}, Message: #{response.message}#{is_child ? '' : ', Body: ' + response.body}")
      rescue => e
        tracker_logger.error("[#{log_prefix}TrackingRequestError] Unexpected error sending tracking data for #{is_child ? 'child ' : ''}element #{tracking_item_name}: #{e.message} - State: #{@state}")
        tracker_logger.error(e.backtrace.join("\n"))
        return { success: false, message: "Request error: #{e.message}" }
      end

      duration = ((Time.current - start_time) * 1000).round(2)

      if response.code == '200' || response.code == '201'
        tracker_logger.info("[#{log_prefix}TrackingSuccess] Successfully sent tracking data for #{is_child ? 'child ' : ''}element #{tracking_item_name} with state #{@state}")
        return { success: true, message: "#{is_child ? 'Child t' : 'T'}racking data sent successfully" }
      else
        tracker_logger.error("[#{log_prefix}TrackingFailed] Failed to send tracking data for #{is_child ? 'child ' : ''}element #{tracking_item_name} with state #{@state}")
        tracker_logger.error("[#{log_prefix}TrackingFailed] Response: #{response.code}, Body: #{response.body}")
        tracker_logger.error("[#{log_prefix}TrackingFailed] Duration: #{duration} ms") unless is_child
        return { success: false, message: "Failed to send #{is_child ? 'child ' : ''}tracking data: #{response.code} #{response.body}" }
      end
    rescue => e
      duration = ((Time.current - start_time) * 1000).round(2)
      tracker_logger.error("[#{log_prefix}TrackingException] Error sending tracking data for #{is_child ? 'child ' : ''}element #{tracking_item_name} with state #{@state}")
      tracker_logger.error("[#{log_prefix}TrackingFailed] Duration: #{duration} ms")
      tracker_logger.error("[#{log_prefix}TrackingFailed] Backtrace: #{e.backtrace.join("\n")}")
      return { success: false, message: "Error: #{e.message}" }
    ensure
      safe_close_http_connection(http)
    end
  end

  def ensure_valid_token(token)
    # Simple token validation - you might want to make this more sophisticated
    # For now, we'll just check if we have a token
    if token.nil? || token.empty?
      tracker_logger.warn("[TokenValidation] Token is nil or empty, getting new token")
      return get_oauth_token
    end

    # You could add token expiration check here if the API returns expiration info
    token
  end

  def safe_close_http_connection(http)
    return unless http

    begin
      http.finish if http.started?
    rescue => e
      tracker_logger.error("[HTTPCleanup] Error closing HTTP connection: #{e.message}")
      tracker_logger.error(e.backtrace.join("\n"))
    end
  end
end
