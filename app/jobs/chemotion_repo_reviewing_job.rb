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
    remove_new_version_if_declined
  end

  private
  def notify_users
    submitter = publication.published_by || publication.taggable_data['creators']&.first&.dig('id')

    args = {
      channel_subject: Channel::PUBLICATION_REVIEW,
      message_from: submitter
    }
    sgl = publication.review.dig('reviewers').nil? ? [submitter] : publication.review.dig('reviewers') + [submitter]

    case publication.state
    when Publication::STATE_PENDING
      args[:message_to] = User.reviewer_ids + (publication.review.dig('reviewers') || [])
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
      args[:message_to] = sgl
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
  rescue StandardError => e
    Delayed::Worker.logger.error <<~TXT
      ---------  #{self.class.name}  mail_users error ------------
        Error Message:  #{e}
      --------------------------------------------------------------------
    TXT

  end

  def remove_new_version_if_declined
    case publication.state
    when Publication::STATE_DECLINED
      unless publication.element&.tag&.taggable_data['previous_version'].nil?
        @publications.each do |publication|
          publication.element.destroy
          publication.doi.destroy
        end
      end
    else
      return
    end
  end

end
