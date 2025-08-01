# frozen_string_literal: true

# Service for processing NMRXiv callbacks
class NmrxivCallbackService
  attr_reader :publication, :logger

  def initialize(publication)
    @publication = publication
    @logger = LoggerConfig.nmrxiv_logger
  end

  # Process callback from NMRXiv
  def process_callback(status:, message: nil, nmrxiv_id: nil, nmrxiv_url: nil, error_details: nil, metadata: nil)
    logger.info("[CALLBACK_SERVICE] Processing callback - Publication: #{publication.id}, Status: #{status}")

    begin
      # Validate the status

      status = status.to_s.downcase
    rescue StandardError => e
      logger.error("[CALLBACK_SERVICE_ERROR] Error processing callback - Publication: #{publication.id}, Status: #{status}")
      logger.error("Error: #{e.message}")
      logger.error(e.backtrace.join("\n"))

      error_result(e.message)
    end
  end

  private

  def success_result
    {
      success: true,
      message: 'Callback processed successfully'
    }
  end

  def error_result(message)
    {
      success: false,
      error: message
    }
  end
end
