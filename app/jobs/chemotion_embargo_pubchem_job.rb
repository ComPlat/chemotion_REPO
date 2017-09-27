class ChemotionEmbargoPubchemJob < ActiveJob::Base
  attr_reader :embargo_collection, :publication, :element, :publications

  def perform(embargo_col_id)
    @embargo_collection = Collection.find(embargo_col_id)
    @sync_emb_col = @embargo_collection.sync_collections_users&.first

    pub_samples = Publication.where(ancestry: nil, element: @embargo_collection.samples).order(updated_at: :desc)
    pub_reactions = Publication.where(ancestry: nil, element: @embargo_collection.reactions).order(updated_at: :desc)
    @pub_list = pub_samples + pub_reactions
    @pub_list.each do |embargo_pub|
      @publication = Publication.find(embargo_pub.id)
      @publications = [publication] + publication.descendants
      @element = publication.element
      publications.each do |pub|
        pub.transition_from_start_to_metadata_uploading!
      end
      publications.each do |pub|
        pub.transition_from_metadata_uploading_to_uploaded!
      end
      publications.each do |pub|
        pub.transition_from_metadata_uploaded_to_doi_registering!
      end
      publications.each do |pub|
        pub.transition_from_doi_registering_to_registered!
      end
      publications.reverse_each do |pub|
        if pub.element_type == 'Sample'
          pub.transition_from_doi_registered_to_pubchem_registering!
        else
          pub.transition_from_doi_registered_to_completing!
        end
      end
      publications.each do |pub|
        pub.transition_from_completing_to_completed!
      end
    end
    send_pubchem
    remove_publish_pending
    send_email
  end

  def remove_publish_pending
    @pub_list.each do |embargo_pub|
      @publication = Publication.find(embargo_pub.id)
      ot = @publication.original_element&.tag&.taggable_data&.delete('publish_pending')
      @publication.original_element.tag.save! unless ot.nil?
      if @publication.element_type == 'Reaction'
        @publication.original_element&.samples.each do |s|
          t = s.tag&.taggable_data&.delete('publish_pending')
          s.tag.save! unless t.nil?
        end
      end
    end
  end

  def send_pubchem
    sdf = ""
    pubchem_list = Publication.where(element: @embargo_collection.samples)
    pubchem_list.each do |pub|
      metadata_obj = OpenStruct.new(sample: pub.element)
      metadata_file = ERB.new(File.read(
        File.join(Rails.root,'app', 'publish', 'pubchem_metadata.sdf.erb')
      ))
      mt = metadata_file.result(metadata_obj.instance_eval { binding })
      pub.element.update_publication_tag(pubchem_reg_at: DateTime.now)
      pd = pub.taggable_data.merge(pubchem_reg_at: DateTime.now)
      sdf += mt
    end
    message = "\n---Embargo MOLFILE START---"
    #Publication.logger([message, sdf, "(Embargo Pubchem FTP upload #{Rails.env.production ? '' : 'NOT'} sent (mode: #{ENV['PUBLISH_MODE']})"])
    publication_logger ||= Logger.new(File.join(Rails.root, 'log', 'publication.log'))
    message = [message, sdf, "Embargo Pubchem FTP upload sdf"].flatten.join("\n")
    publication_logger.info(
      <<~INFO
      ******** MODE #{ENV['PUBLISH_MODE']}********
      Embargo Collection: #{@embargo_collection.id} - #{@embargo_collection.label} ( #{@embargo_collection.samples.map{ |s| s.id }} )
      #{message}
      ********************************************************************************
      INFO
    )

    if Rails.env.production? && ENV['PUBLISH_MODE'] == 'production'
      ftp = Net::FTP.new('ftp-private.ncbi.nlm.nih.gov')
      ftp.passive = true
      ftp.login(ENV['PUBCHEM_LOGIN'], ENV['PUBCHEM_PASSWORD'])
      ftp.puttextcontent(sdf, @embargo_collection.id.to_s + '.sdf.in')
      ftp.close
    else
      #file_path = Rails.public_path.join('pubchem_upload', "#{self.job_id}_#{@embargo_collection.id}.sdf.in")
      #File.write(file_path, sdf)
    end

    pubchem_list.each do |pub|
      pub.update_columns(state: 'completing')
      pub.transition_from_completing_to_completed!
    end
  end

  def send_email
    if ENV['PUBLISH_MODE'] == 'production'
      PublicationMailer.mail_publish_embargo_release(@embargo_collection.id).deliver_now
    end
    Message.create_msg_notification(
      channel_subject: Channel::PUBLICATION_REVIEW,
      message_from: @sync_emb_col.user_id,
      data_args: {subject: "Congratulations! Embargo Collection #{@embargo_collection.label} released and published"}
    )
  end
end

