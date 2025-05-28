# frozen_string_literal: true

# A helper for submission
module SubmissionHelpers
  extend Grape::API::Helpers

  def tag_as_submitted(element)
    return unless element.is_a?(Sample) || element.is_a?(Reaction)

    et = element.tag
    return if et.taggable_data.nil?

    publish_pending = !et.taggable_data.key?('previous_version')
    et.update!(taggable_data: (et.taggable_data || {}).merge(publish_pending: publish_pending))
  rescue StandardError => e
    Publication.repo_log_exception(e, { element: element&.id })
    nil
  end

  def reserve_reaction_dois(reaction, analysis_set, analysis_set_ids)
    reaction_products = reaction.products.select { |s| s.analyses.select { |a| a.id.in? analysis_set_ids }.count > 0 }
    reaction.reserve_suffix
    reaction_products.each do |p|
      d = p.reserve_suffix
      et = p.tag
      et.update!(
        taggable_data: (et.taggable_data || {}).merge(reserved_doi: d.full_doi)
      )
    end
    reaction.reserve_suffix_analyses(analysis_set)
    reaction.reload
    reaction.tag_reserved_suffix(analysis_set)
    reaction.reload
    {
      reaction: Entities::ReactionEntity.represent(reaction, serializable: true),
      message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
    }
  rescue StandardError => e
    Publication.repo_log_exception(e, { reaction: reaction&.id, analysis_set: analysis_set, analysis_set_ids: analysis_set_ids })
    nil
  end

  def ols_validation(analyses)
    analyses&.each do |ana|
      if ana.container_type == 'analysis'
        error!('analyses check fail', 404) if (ana.extended_metadata['kind'].match /^\w{3,4}\:\d{6,7}\s\|\s\w+/).nil?
      end
    end
  rescue StandardError => e
    Publication.repo_log_exception(e, { analyses: analyses })
    nil
  end

  def coauthor_validation(coauthors)
    coauthor_ids = []
    coauthors&.each do |coa|
      val = coa
      usr = User.where(type: %w[Person Collaborator]).where.not(confirmed_at: nil).where('id = ? or email = ?', val.to_i, val.to_s).first
      error!('invalid co-author: ' + val.to_s, 404) if usr.nil?
      coauthor_ids << usr.id
    end
    coauthor_ids
  rescue StandardError => e
    Publication.repo_log_exception(e, { coauthors: coauthors })
    nil
  end

  def perform_method
    method = ENV['PUBLISH_MODE'] == 'production' ? :perform_later : :perform_now
    method
  end

  def send_message_and_tag(element, user)
    tag_as_submitted(element)
    Message.create_msg_notification(
      channel_id: Channel.find_by(subject: Channel::SUBMITTING)&.id,
      message_from: user.id,
      autoDismiss: 5,
      message_content: { 'data': "Your submission for #{element.class.name} [#{element.short_label}] is currently being processed. You will recieve a notification upon completion." },
    )
    element.reload
  rescue StandardError => e
    Publication.repo_log_exception(e, { element: element&.id, user: user&.id })
  end

  # def concat_author_ids(coauthors = params[:coauthors])
  #   coauthor_ids = coauthors.map do |coa|
  #     val = coa.strip
  #     next val.to_i if val =~ /^\d+$/

  #     User.where(type: %w(Person Collaborator)).where.not(confirmed_at: nil).find_by(email: val)&.id if val =~ /^\S+@\S+$/
  #   end.compact
  #   [current_user.id] + coauthor_ids
  # end

  private




end
