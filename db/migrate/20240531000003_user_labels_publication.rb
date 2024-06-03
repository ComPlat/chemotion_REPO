class UserLabelsPublication < ActiveRecord::Migration[6.1]
  def change
    Publication.where(element_type: 'Sample').each do |pub|
      pub.publish_user_labels
    end
  rescue StandardError => e
    Rails.logger.error "Error changing channel msg: #{e.message}"
  end
end
