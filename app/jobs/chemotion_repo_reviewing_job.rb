class ChemotionRepoReviewingJob < ActiveJob::Base
  attr_reader :publication, :publications
  INVALID_STATE = "INVALID STATE"

  def perform(id, action, current_user_id = 0)
    @publication = Publication.find(id)
    @publications = [publication] + publication.descendants
    @publications.each { |d| d.update_columns(state: action) }
    @current_user_id = current_user_id
    # @element = publication.element
    publication.logger("publication STARTS")

    unless publication.state.present?
      publication.logger(INVALID_STATE)
      raise INVALID_STATE
    end

    #  process_element
    notify_users
    mail_users
  end

  private

  # NB: Moved to model
  # def process_element
  #   case publication.state
  #   when Publication::STATE_PENDING
  #     publication.move_to_pending_collection
  #   when Publication::STATE_REVIEWED
  #     publication.move_to_review_collection
  #   when Publication::STATE_ACCEPTED
  #     publication.move_to_accepted_collection
  #   when Publication::STATE_DECLINED
  #     publication.declined_reverse_original_element
  #     publication.declined_move_collections
  #   end
  # end

  def notify_users
    args = {
      channel_subject: Channel::PUBLICATION_REVIEW,
      message_from: publication.published_by || publication.taggable_data['creators']&.first&.dig('id')
    }

    case publication.state
    when Publication::STATE_PENDING
      args[:message_to] = User.reviewer_ids
      args[:data_args] = {
        subject: "Chemotion Repository: Review Request for #{publication.doi.suffix}"
      }
    when Publication::STATE_REVIEWED
      args[:data_args] = {
        subject: "Chemotion Repository: Modification request for #{publication.doi.suffix} \n Please check the reviewer's comments and request for modification. \n Once done with the revision, you can then resubmit your publication."
      }
    when Publication::STATE_ACCEPTED
      args[:data_args] = {
        subject: "Chemotion Repository: Publication Accepted. for #{publication.doi.suffix}  \n Once the embargo is released, this submission will be published."
      }
    when Publication::STATE_DECLINED
      title = publication.published_by == @current_user_id ? 'withdrawn' : 'rejected'
      args[:data_args] = {
        subject: "Chemotion Repository: Publication #{title}. for #{publication.doi.suffix}."
      }
    # when Publication::STATE_RETRACTED
    else
      return
    end
    Message.create_msg_notification(args)
  end

  def mail_users
    return unless ENV['PUBLISH_MODE'] == 'production'

    case publication.state
    when Publication::STATE_PENDING
      PublicationMailer.mail_reviewing_request(publication.id).deliver_now
    when Publication::STATE_REVIEWED
      PublicationMailer.mail_reviewed_request(publication.id).deliver_now
    when Publication::STATE_ACCEPTED
      PublicationMailer.mail_accepted_request(publication.id).deliver_now
    when Publication::STATE_DECLINED
      PublicationMailer.mail_declined_request(publication.id, @current_user_id).deliver_now unless @current_user_id.zero?
    else
      return
    end
  end

  # NB: NOT USED?
  # NB: Moved to model
  # def release_original_element
  #   ot = publication.original_element&.tag&.taggable_data&.delete("publish_#{publication.element_type.downcase}")
  #   publication.original_element.tag.save! unless ot.nil?
  #
  #   case publication.element_type
  #   when 'Sample'
  #     clear_orig_analyses(publication.original_element)
  #   when 'Reaction'
  #     clear_orig_analyses(publication.original_element)
  #     publication.original_element&.samples&.each do |s|
  #       t = s.tag&.taggable_data&.delete('publish_sample')
  #       s.tag.save! unless t.nil?
  #       clear_orig_analyses(s)
  #     end
  #   end
  # end

  # def clear_orig_analyses(element)
  #   element&.analyses&.each do |a|
  #     t = a.tag&.taggable_data&.delete('publish_analysis')
  #     a.tag.save! unless t.nil?
  #   end
  # end
end
