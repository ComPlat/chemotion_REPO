class ImportCollectionsJob < ApplicationJob
  include ActiveJob::Status

  queue_as :import_collections

  after_perform do |job|
    begin
      op = @gate === true ? 'transfer' : 'import'
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP,
        message_from: @user_id,
        data_args: { col_labels: '', operation: op, expires_at: nil },
        autoDismiss: 5
      ) if @success
    rescue StandardError => e
      Delayed::Worker.logger.error e
    end
  end

  def perform(att, current_user_id, gate = false, col_id = nil, origin = nil)
    @user_id = current_user_id
    @success = true
    @gate = gate
    begin
      import = Import::ImportCollections.new(att, current_user_id, @gate, col_id, origin)
      import.extract
      import.import!
    rescue => e
      op = @gate === true ? 'transfer' : 'import'
      Delayed::Worker.logger.error e
      Message.create_msg_notification(
        channel_subject: Channel::COLLECTION_ZIP_FAIL,
        message_from: @user_id,
        data_args: { col_labels: '', operation: op },
        autoDismiss: 5
      )
      @success = false
    ensure
      att&.destroy!
    end
  end

  def max_attempts
    1
  end
end
