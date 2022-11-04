# frozen_string_literal: true

# Helper for public API
module PublicHelpers
  extend Grape::API::Helpers
  include ApplicationHelper

  def send_notification(attachment, user, status, has_error = false)
    data_args = { 'filename': attachment.filename, 'comment': 'the file has been updated' }
    level = 'success'
    if has_error
      data_args['comment'] = ' an error has occurred, the file is not changed.'
      level = 'error'
    elsif status == 4
      data_args['comment'] = ' file has not changed.'
      level = 'info'
    elsif @status == 7
      data_args['comment'] = ' an error has occurred while force saving the document, please review your changes.'
      level = 'error'
    end
    Message.create_msg_notification(
      channel_subject: Channel::EDITOR_CALLBACK, message_from: user.id,
      data_args: data_args, attach_id: attachment.id, research_plan_id: attachment.attachable_id, level: level
    )
  end

  def de_encode_json(json, key = '', viv = '', encode = true)
    if encode
      encode_json(json)
    else
      decode_json(json, key, viv)
    end
  end
end
