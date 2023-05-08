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

  def group_leaders
    reviewers = @publication.review.dig('reviewers')
    if reviewers.nil?
      []
    else
      Person.where(id: reviewers).pluck(:email)
    end
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
    # return unless reviewers.present?
    return if @publication.review.dig('reviewers').nil? || @publication.review.dig('history').length > 2

    mail(
      to: group_leaders,
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
      bcc: group_leaders,
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

  def mail_job_error(job_name, id, msg)
    @job_name = job_name
    @id = id.to_s
    @msg = msg
    it_email = ENV['HELPDESK'].presence.split(/,/)&.map(&:strip)
    return unless it_email.present?
    mail(
      to: it_email,
      subject: "Chemotion Repository Job Error, Job: [" + job_name + "], Id: ["+ @id +"]",
    ) do |format|
      format.html
      format.text { render plain: "mail_job_error" }
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

  def mail_user_comment(current_user, id, type, pageId, pageType, comment)
    @current_user = current_user
    @pageType = pageType
    @pageId = pageId
    first_reviewer_email = Person.where(id: User.reviewer_ids).first.email

    @user_comment = comment.gsub("\n", "\r\n")
    @publication = Publication.find_by(element_type: type, element_id: id)

    @element_type = (type == 'Container') ? 'Analysis' : type
    @element_type = 'Product' if pageType == 'reactions' && type == 'Sample'

    case type
    when 'Container'
       @pub_id = "CRD-#{@publication.id}"
       @doi = @publication && @publication.taggable_data && @publication.taggable_data["analysis_doi"]
    when 'Sample'
      @pub_id = "CRS-#{@publication.id}"
      @doi = @publication && @publication.taggable_data && @publication.taggable_data["doi"]
    when 'Reaction'
      @pub_id = "CRR-#{@publication.id}"
      @doi = @publication && @publication.taggable_data && @publication.taggable_data["doi"]
   end

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

    mail(
      to: ENV['DEVISE_SENDER'],
      cc: current_user.email,
      bcc: first_reviewer_email,
      subject: "Comments from Chemotion User [" + current_user.name + "]",
    ) do |format|
      format.html
      format.text { render plain: "User comments" }
    end
  end

  def compound_params(current_user, id, data)
    @current_user = current_user
    @mail_content = data.gsub("\n", "\r\n")
    @publication = Publication.find_by(element_type: 'Sample', element_id: id)
    @sample = @publication.element
    @pub_id = "CRS-#{@publication.id}"
    @doi = @publication&.taggable_data && @publication.taggable_data['doi']
    @suffix = @publication&.doi&.suffix
    @xvial = (@sample.tag.taggable_data && @sample.tag.taggable_data['xvial'] && @sample.tag.taggable_data['xvial']['num']) || ''
    case ENV['PUBLISH_MODE']
    when 'production'
      if Rails.env.production?
        @protocol = 'https://'
        @host = 'www.chemotion-repository.net'
      end
    when 'staging'
      @protocol = 'http://'
      @host = ENV['HOST'] || 'localhost:3000'
    end
  end

  def compound_request_content_plain
    <<~TXT
      #{ENV['PUBLISH_MODE'] == 'staging' ? 'TESTING MODE' : ''}
      Here is a request for Compound X-Vial: #{@xvial} from Chemotion User [#{@current_user.name}]:

      Chemotion Id: #{@pub_id}
      DOI: #{@doi}
      Compound X-Vial: #{@xvial}
      Request by: #{@current_user.name} [#{@current_user.email}]

      See it at:
      #{@protocol + @host}/inchikey/#{@suffix}
    TXT
  end

  def compound_request_content
    @subject = '[Request] A request from Chemotion Repository User [' + @current_user.name + ']'
    @mail_base = "Dear Compound team

    Here is a request for Compound X-Vial: #{@xvial} from Chemotion User [#{@current_user.name}]:

    Chemotion Id: #{@pub_id}
    DOI: #{@doi}
    Compound X-Vial: #{@xvial}
    Request by: #{@current_user.name} [#{@current_user.email}]"
    @mail_base = @mail_base.gsub("\n", "\r\n")
  end

  def compound_confirmation_content_plain
    <<~TXT
      #{ENV['PUBLISH_MODE'] == 'staging' ? 'TESTING MODE' : ''}
      Your request for Chemotion Id: #{@pub_id} has been delivered to Compound platform:

      Chemotion Id: #{@pub_id}
      DOI: #{@doi}
      Request by: #{@current_user.name} [#{@current_user.email}]

      See it at:
      #{@protocol + @host}/inchikey/#{@suffix}
    TXT
  end

  def compound_confirmation_content
    @subject = '[Confirmation] Your request has been delivered to Compound platform'
    @mail_base = "Dear #{@current_user.name},

    Your request for Chemotion Id: #{@pub_id} has been delivered to Compound platform:

    Chemotion Id: #{@pub_id}
    DOI: #{@doi}
    Request by: #{@current_user.name} [#{@current_user.email}]"
    @mail_base = @mail_base.gsub("\n", "\r\n")
  end

  def compound_request
    compound_request_content
    mail(
      to: ENV['COMPOUND_TEAM'].presence.split(/,/)&.map(&:strip),
      subject: @subject
    ) do |format|
      format.html
      format.text { render plain: compound_request_content_plain }
    end
  end

  def compound_confirmation
    compound_confirmation_content
    mail(
      to: @current_user.email,
      subject: @subject
    ) do |format|
      format.html
      format.text { render plain: compound_confirmation_content_plain }
    end
  end

  def mail_request_compound(current_user, id, data, mail_type)
    compound_params(current_user, id, data)
    compound_request if mail_type == 'request'
    compound_confirmation if mail_type == 'confirmation'
  end
end
