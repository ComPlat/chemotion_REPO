# frozen_string_literal: true

# A helper for reviewing/submission
module RepoCommentHelpers
  extend Grape::API::Helpers
  def approve_comments(root, comment, _checklist, _reviewComments, _action, _his = true)
    review = root.review || {}
    review_history = review['history'] || []
    current = review_history.last
    current['username'] = current_user.name
    current['userid'] = current_user.id
    current['action'] = 'pre-approved'
    current['comment'] = comment unless comment.nil?
    current['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')
    review_history[review_history.length - 1] = current
    next_node = { action: 'reviewing', type: 'reviewed', state: 'pending' }
    review_history << next_node
    review['history'] = review_history
    revst = review['checklist'] || {}
    revst['glr'] = { status: true, user: current_user.name, updated_at: Time.now.strftime('%d-%m-%Y %H:%M:%S') }
    review['checklist'] = revst

    root.update!(review: review)
  end

  # def save_comments(root, comment, checklist, reviewComments, action, his = true)
  #   review = root.review || {}
  #   review_history = review['history'] || []
  #   current = review_history.last || {}
  #   current['state'] = %w[accepted declined].include?(action) ? action : root.state
  #   current['action'] = action unless action.nil?
  #   current['username'] = current_user.name
  #   current['userid'] = current_user.id
  #   current['comment'] = comment unless comment.nil?
  #   current['type'] = root.state == Publication::STATE_PENDING ? 'reviewed' : 'submit'
  #   current['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')

  #   if review_history.length == 0
  #     review_history[0] = current
  #   else
  #     review_history[review_history.length - 1] = current
  #   end
  #   if his ## add next_node
  #     next_node = { action: 'revising', type: 'submit', state: 'reviewed' } if root.state == Publication::STATE_PENDING
  #     next_node = { action: 'reviewing', type: 'reviewed', state: 'pending' } if root.state == Publication::STATE_REVIEWED
  #     review_history << next_node
  #     review['history'] = review_history
  #   else

  #     # is_leader = review.dig('reviewers')&.include?(current_user&.id)
  #     if root.state == Publication::STATE_PENDING && (action.nil? || action == Publication::STATE_REVIEWED)
  #       next_node = { action: 'reviewing', type: 'reviewed', state: 'pending' }
  #       review_history << next_node
  #       review['history'] = review_history
  #     end
  #   end
  #   if checklist&.length&.positive?
  #     revst = review['checklist'] || {}
  #     checklist.each do |k, v|
  #       revst[k] = v['status'] == true ? { status: v['status'], user: current_user.name, updated_at: Time.now.strftime('%d-%m-%Y %H:%M:%S') } : { status: false } unless revst[k] && revst[k]['status'] == v['status']
  #     end
  #     review['checklist'] = revst
  #   end
  #   review['reviewComments'] = reviewComments if reviewComments.present?
  #   root.update!(review: review)
  # end

  # TODO: mv to model
  def save_comment(root, comment)
    review = root.review || {}
    review_history = review['history'] || []
    current = review_history.last
    comments = current['comments'] || {}
    comment[comment.keys[0]]['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S') unless comment.keys.empty?
    comment[comment.keys[0]]['username'] = current_user.name
    comment[comment.keys[0]]['userid'] = current_user.id

    current['comments'] = comments.deep_merge(comment || {})
    review['history'] = review_history
    root.update!(review: review)
  end
end