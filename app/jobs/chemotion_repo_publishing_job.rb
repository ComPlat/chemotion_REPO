class ChemotionRepoPublishingJob < ActiveJob::Base
  attr_reader :publication, :element, :publications
  INVALID_STATE = "INVALID STATE"

  def max_attempts
    1
  end

  def perform(id, action, current_user_id = 0)
    @publication = Publication.find(id)
    @publications = [publication] + publication.descendants
    @publications.each { |d| d.update_columns(state: action) }

    @element = publication.element
    publication.logger("publication STARTS")

    unless publication.state.present?
      publication.logger(INVALID_STATE)
      raise INVALID_STATE
    end
    send(publication.state)
  end

  private

  def accepted
    publications.each do |pub|
      pub.transition_from_start_to_metadata_uploading!
    end
    transition_success?(
      Publication::STATE_ACCEPTED,
      Publication::STATE_DC_METADATA_UPLOADING
    )
    dc_metadata_uploading
  end

  def dc_metadata_uploading
    publications.each do |pub|
      pub.transition_from_metadata_uploading_to_uploaded!
    end
    transition_success?(
      Publication::STATE_DC_METADATA_UPLOADING,
      Publication::STATE_DC_METADATA_UPLOADED
    )
    dc_metadata_uploaded
  end

  def dc_metadata_uploaded
    publications.each do |pub|
      pub.transition_from_metadata_uploaded_to_doi_registering!
    end
    transition_success?(
      Publication::STATE_DC_METADATA_UPLOADED,
      Publication::STATE_DC_DOI_REGISTERING
    )
    dc_doi_registering
  end

  def dc_doi_registering
    publications.each do |pub|
      pub.transition_from_doi_registering_to_registered!
    end
    transition_success?(
      Publication::STATE_DC_DOI_REGISTERING,
      Publication::STATE_DC_DOI_REGISTERED
    )
    dc_doi_registered
  end

  def dc_doi_registered
    publications.reverse_each do |pub|
      if pub.element_type == 'Sample'
        pub.transition_from_doi_registered_to_pubchem_registering!
      else
        pub.transition_from_doi_registered_to_completing!
      end
    end
    transition_success?(
      Publication::STATE_DC_DOI_REGISTERED,
      [Publication::STATE_PUBCHEM_REGISTERING, Publication::STATE_COMPLETING]
    )
    pubchem_registering
  end

  def pubchem_registering
    publications.each do |pub|
      if pub.element_type == 'Sample'
        pub.transition_from_doi_pubchem_registering_to_registered!
      else
        pub.transition_from_doi_registered_to_completing!
      end
    end
    transition_success?(
      Publication::STATE_PUBCHEM_REGISTERING,
      [Publication::STATE_PUBCHEM_REGISTERED, Publication::STATE_COMPLETING]
    )
    pubchem_registered

    rescue StandardError => e
      Delayed::Worker.logger.error <<~TXT
      ---------  #{self.class.name} pubchem_registering error ------------
        Error Message:  #{e}
      --------------------------------------------------------------------
      TXT
      PublicationMailer.mail_job_error(self.class.name, @publication.id, "[pubchem_registering]" + e.to_s).deliver_now
      raise e
  end

  def pubchem_registered
    publications.each do |pub|
      if pub.element_type == 'Sample'
        pub.transition_from_pubchem_registered_to_completing!
      else
        pub.transition_from_doi_registered_to_completing!
      end
    end
    transition_success?(
      Publication::STATE_PUBCHEM_REGISTERED,
      Publication::STATE_COMPLETING
    )
    completing
  end

  def completing
    publications.each do |pub|
      pub.transition_from_completing_to_completed!
    end
    transition_success?(
      Publication::STATE_COMPLETING,
      Publication::STATE_COMPLETED
    )
    completed
  end

  def completed
    remove_publish_pending
    replace_old_sample_version_in_reaction

    if ENV['PUBLISH_MODE'] == 'production'
      PublicationMailer.mail_publish_approval(@publication.id).deliver_now
    end
    submitter = @publication.published_by || @publication.taggable_data['creators']&.first&.dig('id')
    sgl = @publication.review.dig('reviewers').nil? ? [submitter] : @publication.review.dig('reviewers') + [submitter]
    Message.create_msg_notification(
      channel_subject: Channel::PUBLICATION_REVIEW,
      message_from: submitter,
      message_to: sgl,
      data_args: {subject: "Congratulations! Chemotion Repository: #{@publication.doi.suffix} published"}
    )
  rescue StandardError => e
    Delayed::Worker.logger.error <<~TXT
    ---------  #{self.class.name} completed error ------------
      Error Message:  #{e}
    --------------------------------------------------------------------
    TXT
    PublicationMailer.mail_job_error(self.class.name, @publication.id, "[completed]" + e.to_s).deliver_now
    raise e
  end

  def published
  end

  def remove_publish_pending
    unless @element&.tag&.taggable_data['previous_version'].nil?
      @element&.tag&.taggable_data&.delete('publish_pending')
      @element&.tag.save!
    else
      return if @publication.original_element.nil?
      ot = @publication.original_element&.tag&.taggable_data&.delete('publish_pending')
      @publication.original_element&.tag.save! unless ot.nil?
      if @publication.element_type == 'Reaction'
        @publication.original_element&.samples&.each do |s|
          t = s.tag&.taggable_data&.delete('publish_pending')
          s.tag.save! unless t.nil?
        end
      end
    end
  end

  def replace_old_sample_version_in_reaction
    # check if this is a new version of a sample in a public reaction
    # if so, replace the previous version in this reaction
    unless @element&.tag&.taggable_data['previous_version'].nil?
      return unless @publication.element_type == 'Sample'

      if @element&.tag&.taggable_data['replace_in_publication']
        previous_version_id = @element&.tag&.taggable_data['previous_version']['id']
        reaction_id = @element&.tag&.taggable_data['reaction_id']

        unless reaction_id.nil?
          reaction = Collection.public_collection.reactions.find_by(id: reaction_id)
          unless reaction.nil?
            reaction_sample = reaction.reactions_samples.find_by(sample_id: previous_version_id)
            reaction_sample.sample_id = @element.id
            reaction_sample.save!

            @element.untag_replace_in_publication
          end
        end
      end
    end
  end

  def transition_success?(from_state, to_state)
    failed = publications.select{|pub| !([to_state].flatten.include?(pub.state))}
      .map{|pub| [pub.id, pub.state]}
    if failed.present?
      message = "TRANSITION FROM #{from_state} to #{to_state}, FAILED\n failed for publications: #{failed}"
      publication.logger(message)
      raise message
    end
    true
  end
end
