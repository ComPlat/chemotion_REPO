# frozen_string_literal: true

# Background job for generating publication zip files
class GeneratePublicationZipJob < ApplicationJob
  queue_as :default

  # Generate publication zip file in background
  def perform(publication_id, user_id, kinds: nil, tracking: false)
    @publication = Publication.find(publication_id)
    @user = User.find(user_id)
    @success = true

    begin
      service = PublicationZipService.new(@publication)
      result = service.generate_zip(kinds: kinds, tracking: tracking)

      if result[:success]
        # Notify user of successful generation
        Message.create_msg_notification(
          channel_subject: Channel::PUBLICATION_ZIP_SUCCESS,
          message_from: @user.id,
          data_args: {
            operation: 'Generate Publication Zip',
            publication_id: @publication.id,
            file_path: result[:relative_path],
            download_url: result[:download_url],
            file_size: result[:file_size]
          }
        )

        Rails.logger.info("Publication zip generated successfully: #{result[:file_path]}")
      else
        handle_error("Generation failed: #{result[:error]}")
      end

    rescue StandardError => e
      handle_error("Job error: #{e.message}")
      Rails.logger.error("Publication zip generation job failed: #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
    end
  end

  private

  def handle_error(error_message)
    @success = false

    # Notify user of failure
    begin
      Message.create_msg_notification(
        channel_subject: Channel::PUBLICATION_ZIP_FAIL,
        message_from: @user.id,
        data_args: {
          operation: 'Generate Publication Zip',
          publication_id: @publication.id,
          error: error_message
        }
      )
    rescue => e
      Rails.logger.error("Failed to send error notification: #{e.message}")
    end
  end
end
