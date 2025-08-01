# frozen_string_literal: true

# Service to automatically upload publication data to NMRXiv when publication state changes to 'completed'
class NmrxivAutoUploadService
  def initialize(publication_id)
    @publication_id = publication_id
  end

  def nmrxiv_logger
    LoggerConfig.nmrxiv_logger
  end

  def call
    nmrxiv_logger.info("[SERVICE_START] Starting auto-upload service - Publication: #{@publication_id}")
    publication = Publication.find(@publication_id)

    nmrxiv_logger.debug("[PUBLICATION_FOUND] Found publication - ID: #{publication.id}, State: #{publication.state}, Type: #{publication.element_type}, Published by: #{publication.published_by}")

    # Only process completed publications
    unless publication.state == Publication::STATE_COMPLETED
      nmrxiv_logger.info("[SERVICE_SKIP] Publication not in completed state - ID: #{publication.id}, Current: #{publication.state}, Required: #{Publication::STATE_COMPLETED}")
      return
    end

    # Check if NMRXiv service is enabled in configuration
    unless ExternalServicesConfig.nmrxiv_enabled?
      nmrxiv_logger.info("[SERVICE_SKIP] NMRXiv service not enabled - Publication: #{publication.id}")
      return
    end

    nmrxiv_logger.debug("[CONFIG_CHECK] NMRXiv service enabled - Publication: #{publication.id}")

    # Check if user token exists for NMRXiv
    token = ExternalToken.for_user(publication.published_by).for_provider('nmrxiv').first
    unless token && token.valid_token?
      nmrxiv_logger.warn("[SERVICE_SKIP] No valid NMRXiv token found - Publication: #{publication.id}, User: #{publication.published_by}, Token exists: #{token.present?}, Token valid: #{token&.valid_token?}")
      return
    end

    nmrxiv_logger.debug("[TOKEN_CHECK] Valid NMRXiv token found - Publication: #{publication.id}, Token: #{token.id}, Provider: #{token.provider}")

    # Check if the publication has NMR data
    has_nmr = has_nmr_data?(publication)
    unless has_nmr
      nmrxiv_logger.info("[SERVICE_SKIP] Publication does not contain NMR data - ID: #{publication.id}, Type: #{publication.element_type}")
      return
    end

    nmrxiv_logger.info("[NMR_DATA_CHECK] Publication contains NMR data - ID: #{publication.id}, Type: #{publication.element_type}")

    begin
      nmrxiv_logger.info("[UPLOAD_START] Starting upload to NMRXiv - Publication: #{publication.id}, Token provider: #{token.provider}")

      send_repo_tracker_job(publication)
      upload_to_nmrxiv(publication, token)

      nmrxiv_logger.info("[SERVICE_SUCCESS] Auto-upload service completed successfully - Publication: #{publication.id}")
    rescue => e
      nmrxiv_logger.error("[UPLOAD_ERROR] Upload failed - Publication: #{publication.id}, Token: #{token.id}, Error: #{e.message}")
      nmrxiv_logger.error(e.backtrace.join("\n"))
      Rails.logger.error "Failed to auto-upload publication #{publication.id} to NMRXiv: #{e.message}"
    end
  rescue => e
    nmrxiv_logger.error("[SERVICE_ERROR] Service error - Publication: #{@publication_id}, Error: #{e.message}")
    nmrxiv_logger.error(e.backtrace.join("\n"))
    Rails.logger.error "Error in NMRXiv auto-upload service for publication #{@publication_id}: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
  end

  private

  def has_nmr_data?(publication)
    # Check if the publication contains NMR data by looking for CHMO NMR kinds
    unless publication.element
      nmrxiv_logger.debug("[NMR_CHECK] Publication has no element - ID: #{publication.id}")
      return false
    end

    nmrxiv_logger.debug("[NMR_CHECK_START] Checking for NMR data - Publication: #{publication.id}, Type: #{publication.element_type}, Element: #{publication.element.id}")

    result = case publication.element_type
    when 'Sample'
      check_sample_for_nmr(publication.element)
    when 'Reaction'
      check_reaction_for_nmr(publication.element)
    when 'Container'
      check_container_for_nmr(publication.element)
    else
      nmrxiv_logger.debug("[NMR_CHECK] Unsupported element type - Publication: #{publication.id}, Type: #{publication.element_type}")
      false
    end

    nmrxiv_logger.debug("[NMR_CHECK_RESULT] NMR data check completed - Publication: #{publication.id}, Has NMR: #{result}, Type: #{publication.element_type}")

    result
  end

  # Get NMR instrument kinds from mapping, memoized for performance
  def nmr_kinds
    @nmr_kinds ||= DownloadHelpers::INSTRUMENT_KIND_MAPPING['NMR']
  end

  # Check if a kind string contains any NMR identifiers
  def nmr_kind?(kind)
    if nmr_kinds.blank? || kind.blank?
      nmrxiv_logger.debug("[NMR_KIND_CHECK] Kind check failed - missing data - Kind: #{kind}, NMR kinds present: #{nmr_kinds.present?}, Count: #{nmr_kinds&.count || 0}") if nmrxiv_logger
      return false
    end

    is_nmr = nmr_kinds.any? { |nmr_kind| kind.include?(nmr_kind) }

    nmrxiv_logger.debug("[NMR_KIND_CHECK] Kind check completed - Kind: #{kind}, Is NMR: #{is_nmr}, Matching: #{nmr_kinds.select { |nmr_kind| kind.include?(nmr_kind) }}") if nmrxiv_logger

    is_nmr
  end

  def check_sample_for_nmr(sample)
    unless sample&.analyses
      nmrxiv_logger.debug("[SAMPLE_NMR_CHECK] Sample has no analyses - Sample: #{sample&.id}")
      return false
    end

    nmrxiv_logger.debug("[SAMPLE_NMR_CHECK] Checking sample analyses for NMR - Sample: #{sample.id}, Count: #{sample.analyses.count}")

    nmr_analyses = sample.analyses.select do |analysis|
      kind = analysis&.extended_metadata&.dig('kind')
      is_nmr = nmr_kind?(kind)

      if is_nmr
        nmrxiv_logger.debug("[NMR_ANALYSIS_FOUND] Found NMR analysis - Sample: #{sample.id}, Analysis: #{analysis.id}, Kind: #{kind}")
      end

      is_nmr
    end

    result = nmr_analyses.any?
    nmrxiv_logger.debug("[SAMPLE_NMR_RESULT] Sample NMR check completed - Sample: #{sample.id}, Has NMR: #{result}, Count: #{nmr_analyses.count}")

    result
  end

  def check_reaction_for_nmr(reaction)
    unless reaction
      nmrxiv_logger.debug("[REACTION_NMR_CHECK] Reaction is nil")
      return false
    end

    nmrxiv_logger.debug("[REACTION_NMR_CHECK] Checking reaction for NMR - Reaction: #{reaction.id}")

    # Check analyses on the reaction itself
    if reaction.respond_to?(:analyses) && reaction.analyses.any? { |a| nmr_analysis?(a) }
      nmrxiv_logger.debug("[REACTION_NMR_FOUND] Found NMR analysis on reaction - Reaction: #{reaction.id}")
      return true
    end

    # Check analyses on reaction samples
    if reaction.respond_to?(:samples)
      nmrxiv_logger.debug("[REACTION_SAMPLES_CHECK] Checking reaction samples for NMR - Reaction: #{reaction.id}, Samples: #{reaction.samples.count}")

      reaction.samples.each do |sample|
        if check_sample_for_nmr(sample)
          nmrxiv_logger.debug("[REACTION_SAMPLE_NMR_FOUND] Found NMR in reaction sample - Reaction: #{reaction.id}, Sample: #{sample.id}")
          return true
        end
      end

      nmrxiv_logger.debug("[REACTION_NMR_RESULT] No NMR found in reaction samples - Reaction: #{reaction.id}")
      false
    else
      nmrxiv_logger.debug("[REACTION_NMR_CHECK] Reaction does not respond to samples - Reaction: #{reaction.id}")
      false
    end
  end

  def check_container_for_nmr(container)
    unless container&.children
      nmrxiv_logger.debug("[CONTAINER_NMR_CHECK] Container has no children - Container: #{container&.id}")
      return false
    end

    nmrxiv_logger.debug("[CONTAINER_NMR_CHECK] Checking container children for NMR - Container: #{container.id}, Children: #{container.children.count}")

    nmr_children = container.children.select do |child|
      if child.respond_to?(:extended_metadata)
        kind = child.extended_metadata&.dig('kind')
        is_nmr = nmr_kind?(kind)

        if is_nmr
          nmrxiv_logger.debug("[CONTAINER_NMR_FOUND] Found NMR in container child - Container: #{container.id}, Child: #{child.id}, Kind: #{kind}")
        end

        is_nmr
      else
        false
      end
    end

    result = nmr_children.any?
    nmrxiv_logger.debug("[CONTAINER_NMR_RESULT] Container NMR check completed - Container: #{container.id}, Has NMR: #{result}, Count: #{nmr_children.count}")

    result
  end

  def nmr_analysis?(analysis)
    kind = analysis&.extended_metadata&.dig('kind')
    is_nmr = nmr_kind?(kind)

    nmrxiv_logger.debug("[ANALYSIS_NMR_CHECK] Analysis NMR check - Analysis: #{analysis&.id}, Kind: #{kind}, Is NMR: #{is_nmr}") if nmrxiv_logger

    is_nmr
  end

  def find_nmrxiv_users_for_publication(publication, token)
    # Find users who have NMRXiv tokens and access to this publication
    # This could be the publisher, authors, or users with collection access

    user_ids = []

    # Add the user who published this
    user_ids << publication.published_by if publication.published_by

    # Add author IDs if available in taggable_data
    if publication.taggable_data&.dig('author_ids').present?
      user_ids.concat(publication.taggable_data['author_ids'])
    end

    # Find users with collection access to this publication's element
    if publication.element.respond_to?(:collections)
      collection_user_ids = publication.element.collections.joins(:users).pluck('users.id')
      user_ids.concat(collection_user_ids)
    end

    # Remove duplicates and get users with valid NMRXiv tokens
    user_ids.uniq.filter_map do |user_id|
      user = User.find_by(id: user_id)
      next unless user

      token = ExternalToken.for_user(user_id).for_provider('nmrxiv').first
      next unless token&.valid_token?

      { user: user, token: token }
    end
  end

  def send_repo_tracker_job(publication)
    return unless publication && publication.element

    if ExternalServicesConfig.repo_tracker_enabled?
      RepoTrackerService.new(publication.element, publication.element, publication.published_by, 'sent', 'nmrxiv').call
    end
    # Enqueue a job to track the repository status after upload
    nmrxiv_logger.info("[REPO_TRACKER_JOB] Enqueued RepoTrackerJob - Publication: #{publication.id}")
  rescue => e
    nmrxiv_logger.error("[REPO_TRACKER_JOB_ERROR] Failed to enqueue RepoTrackerJob - Publication: #{publication.id}, Error: #{e.message}")
    nmrxiv_logger.error(e.backtrace.join("\n"))
  end

  def upload_to_nmrxiv(publication, token)
    nmrxiv_logger.info("[UPLOAD_SERVICE_START] Initiating upload service - Publication: #{publication.id}, Token provider: #{token.provider}")

    # Upload to NMRXiv using the service (NMRXiv base URL comes from YAML config)
    upload_service = NmrxivUploadService.new(publication, token.access_token)

    nmrxiv_logger.debug("[UPLOAD_PARAMS] Upload parameters - Publication: #{publication.id}, NMR kinds: #{nmr_kinds&.join(',') || 'none'}, Tracking: true")

    result = upload_service.upload(kinds: nmr_kinds, tracking: true)

    if result[:success]
      nmrxiv_logger.info("[UPLOAD_SUCCESS] Successfully auto-uploaded publication to NMRXiv - Publication: #{publication.id}, URL: #{result[:download_url]}, NMRXiv ID: #{result[:nmrxiv_response]&.dig('id')}, Expires: #{result[:expires_at]}")

      Rails.logger.info "Successfully auto-uploaded publication #{publication.id} to NMRXiv"

      # Optionally notify the user of successful upload
      # You could send a notification or log the success
    else
      nmrxiv_logger.error("[UPLOAD_FAILURE] Failed to auto-upload publication to NMRXiv - Publication: #{publication.id}, Error: #{result[:error]}")
      Rails.logger.error "Failed to auto-upload publication #{publication.id} to NMRXiv: #{result[:error]}"
    end
    result
  rescue => e
    nmrxiv_logger.error("[UPLOAD_SERVICE_ERROR] Upload service error - Publication: #{publication.id}, Error: #{e.message}")
    nmrxiv_logger.error(e.backtrace.join("\n"))
    # raise e
  end
end
