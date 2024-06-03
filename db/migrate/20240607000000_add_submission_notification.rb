class AddSubmissionNotification < ActiveRecord::Migration[6.1]
  def change
    channel = Channel.find_by(subject: Channel::SUBMITTING)
    return unless channel.nil?
    attributes = {
      subject: Channel::SUBMITTING,
      channel_type: 8,
      msg_template: '{"data": "The submission has been submitted!",
                      "action":"Submission"
                     }'
    }
    Channel.create(attributes)
  end
end
