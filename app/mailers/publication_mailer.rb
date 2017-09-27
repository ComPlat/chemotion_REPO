class PublicationMailer < ActionMailer::Base
  default from: ENV['DEVISE_SENDER'] || 'eln'

  def external_review_content
    <<~TXT
    #{ENV['PUBLISH_MODE'] == 'staging' ? "TESTING MODE" : ""}

    A temporary account for #{@embargo_collection} has been created!
    Account: #{@external_acct}
    Password: #{@external_pwd}

    You can use this account/password to access:
      #{@proto + @host}/home/embargo
    TXT
  end

  def reviewing_content
    <<~TXT
    #{ENV['PUBLISH_MODE'] == 'staging' ? "TESTING MODE" : ""}
    Creator: #{@creator&.name}
    #{@publication.element_type} ##{@publication.element_id} is pending for publication.
    Please help reviewing it at:
      #{@proto + @host}/home/review/review_#{@publication.element_type.underscore}/#{@publication.element_id}
    TXT
  end

  def reviewed_content
    <<~TXT
    #{ENV['PUBLISH_MODE'] == 'staging' ? "TESTING MODE" : ""}
    Dear #{@creator&.name}

    #{@publication.element_type} ##{@publication.element_id} has been reviewed.

    Please check the reviewer's comments and request for modification:
      #{@proto + @host}/home/review/review_#{@publication.element_type.underscore}/#{@publication.element_id}

    You can also see the comments and edit your publication directly from your [Reviewing] collection at:
      #{@proto + @host}/mydb/scollection/#{@creator_reviewing_scol_id}/#{@publication.element_type.underscore}/#{@publication.element_id}

    Once done with the revision, you can then resubmit your publication.
    TXT
  end

  def accepted_content
    <<~TXT
    #{ENV['PUBLISH_MODE'] == 'staging' ? "TESTING MODE" : ""}
    Dear #{@creator&.name}

    #{@publication.element_type} ##{@publication.element_id} has been accepted.

    Once the embargo is released, this publication will be published.
    TXT
  end

  def approved_content
    <<~TXT
    #{ENV['PUBLISH_MODE'] == 'staging' ? "TESTING MODE" : ""}
    Congratulations!
    Your #{@publication.element_type} ##{@publication.element_id} has been published.

    See it at:
      #{@proto + @host}/inchikey/#{@doi.suffix}
    TXT
  end


  def embargo_released_content
    <<~TXT
    #{ENV['PUBLISH_MODE'] == 'staging' ? "TESTING MODE" : ""}
    Congratulations!
    Your embargo #{@embargo_collection} has been released.

    See it at:
      #{@proto + @host}/mydb/scollection/#{@sync_emb_col.id}
    TXT
  end

  def declined_content
    <<~TXT
    #{ENV['PUBLISH_MODE'] == 'staging' ? "TESTING MODE" : ""}
    Congratulations!
    Your #{@publication.element_type} ##{@publication.element_id} has been declined.

    See it at:
      #{@proto + @host}/mydb/collection/all/#{@publication.element_type.underscore}/#{@publication.element_id.to_s}
    TXT
  end

  def subject(prefix)
    "Chemotion Repository: #{prefix} for #{@doi.suffix}"
  end

  def reviewers
    # Person.where(id: User.reviewer_ids).pluck :email
    []
  end

  def init_params(publication_id,current_user_id=0)
    @publication = Publication.find(publication_id)
    @doi = @publication.doi
    # @publications = [@publication] + @publication.descendants
    # @element = @publication.element
    @is_submitter = @publication.published_by == current_user_id  || false
    @creator_id = @publication.published_by || @publication.taggable_data['creators']&.first&.dig('id')
    @creator = User.find(@creator_id) unless @creator_id.nil?
    @creator_reviewing_scol_id = @creator.reviewing_collection&.sync_collections_users&.first&.id if @publication.state === 'reviewed'

    case ENV['PUBLISH_MODE']
    when 'production'
      if Rails.env.production?
        @proto = "https://"
        @host = "www.chemotion-repository.net"
      end
    when 'staging'
      @proto = "http://"
      @host = ENV['HOST'] || "localhost:3000"
    end
  end

  def init_external_params(current_user, collection_label, email, pwd)
    @creator = current_user
    @embargo_collection = collection_label
    @external_acct = email
    @external_pwd = pwd

    case ENV['PUBLISH_MODE']
    when 'production'
      if Rails.env.production?
        @proto = "https://"
        @host = "www.chemotion-repository.net"
      end
    when 'staging'
      @proto = "http://"
      @host = ENV['HOST'] || "localhost:3000"
    end
  end

  def mail_reviewed_request(publication_id)
    init_params(publication_id)
    #reviewed_notify
    mail(
      to: @creator.email,
      bcc: reviewers,
      subject: subject('Publication Reviewed'),
    ) do |format|
      format.html
      format.text { render plain: reviewed_content }
    end
  end

  def mail_reviewing_request(publication_id)
    init_params(publication_id)
    #reviewing_notify
    return unless reviewers.present?

    mail(
      to: reviewers,
      subject: subject('Pending for publication. Review Request')
    ) do |format|
      format.html
      format.text { render plain: reviewing_content }
    end
  end

  def mail_accepted_request(publication_id)
    init_params(publication_id)
    #accepted_notify
    mail(
      to: @creator.email,
      bcc: reviewers,
      subject: subject('Publication Accepted')
    ) do |format|
      format.html
      format.text { render plain: accepted_content }
    end
  end

  def mail_publish_approval(publication_id)
    init_params(publication_id)
    #approved_notify
    mail(
      to: @creator.email,
      bcc: reviewers,
      subject: subject('Publication Approved'),
    ) do |format|
      format.html
      format.text { render plain: approved_content }
    end
  end

  def mail_publish_embargo_release(embargo_col_id)
    @embargo_collection = Collection.find(embargo_col_id)
    @sync_emb_col = @embargo_collection.sync_collections_users&.first
    @creator = User.find(@sync_emb_col.user_id)

    case ENV['PUBLISH_MODE']
    when 'production'
      if Rails.env.production?
        @proto = "https://"
        @host = "www.chemotion-repository.net"
      end
    when 'staging'
      @proto = "http://"
      @host = ENV['HOST'] || "localhost:3000"
    end

    #approved_notify
    mail(
      to: @creator.email,
      bcc: reviewers,
      subject: "Chemotion Repository: Embargo collection: #{@embargo_collection.label} released",
    ) do |format|
      format.html
      format.text { render plain: embargo_released_content }
    end
  end

  def mail_declined_request(publication_id, current_user_id)
    init_params(publication_id,current_user_id)
    @action_title = @is_submitter ? 'withdrawn' : 'rejected'

    #rejected_notify
    mail(
      to: @creator.email,
      bcc: reviewers,
      subject: subject('Publication '+@action_title),
    ) do |format|
      format.html
      format.text { render plain: approved_content }
    end
  end

  def mail_external_review(current_user, collection_label, email, pwd)
    init_external_params(current_user, collection_label, email, pwd)
    #anonymous_notify
    mail(
      to: @creator.email,
      bcc: reviewers,
      subject: "Chemotion Repository: A temporary account for ["+ @embargo_collection +"] has been created",
    ) do |format|
      format.html
      format.text { render plain: external_review_content }
    end
  end

end
