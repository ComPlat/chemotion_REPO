# frozen_string_literal: true

# Chemotion Repository-only additions layered onto UserLabelHelpers via
# prepend. Two behaviours are added:
#
# 1. Labels with access_level: 3 (review-only) are re-attached to the tag
#    for non-reviewers so they remain visible in repo reviewing flows —
#    upstream drops them.
# 2. If the element has an associated Publication, its user_labels mirror
#    the tag.
module RepoUserLabelHelpers
  def update_element_labels(element, user_labels, user_id)
    tag = element.tag
    original_ids = tag && (tag.taggable_data || {})['user_labels']

    super

    return if tag.nil?

    unless User.reviewer_ids.include?(user_id)
      review_labels = UserLabel.where(id: original_ids, access_level: 3).pluck(:id)
      if review_labels.present?
        data = tag.taggable_data || {}
        data['user_labels'] = ((data['user_labels'] || []) + review_labels).uniq
        tag.taggable_data = data
        tag.save!
      end
    end

    if element.respond_to?(:publication) && (pub = element.publication) && pub.present?
      pub.update_user_labels(tag.taggable_data['user_labels'], user_id)
    end
  end
end
