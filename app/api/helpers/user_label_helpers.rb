# frozen_string_literal: true

module UserLabelHelpers
  extend Grape::API::Helpers

  def update_element_labels(element, user_labels, current_user_id)
    tag = ElementTag.find_by(taggable: element)
    data = tag.taggable_data || {}
    private_labels = UserLabel.where(id: data['user_labels'], access_level: [0, 1]).where.not(user_id: current_user_id).pluck(:id)
    if !User.reviewer_ids.include?(current_user_id)
      review_labels = UserLabel.where(id: data['user_labels'], access_level: 3).pluck(:id)
    end
    data['user_labels'] = ((user_labels || []) + private_labels + (review_labels || []))&.uniq
    tag.save!

    ## For Chemotion Repository
    if element.respond_to?(:publication) && pub = element.publication
      pub.update_user_labels(data['user_labels'], current_user_id) if pub.present?
    end
  end
end
