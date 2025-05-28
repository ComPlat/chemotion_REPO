module Repo
  class ReviewProcess
    def initialize(args, user_id, action = nil)
      @user_id = user_id             ## required
      @type = args[:type]            ## required
      @id = args[:id]                ## required
      @action = action
      @comment = args[:comment]
      @comments = args[:comments]
      @checklist = args[:checklist]
      @reviewComments = args[:reviewComments]
      @step = 0
      init_data
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def process
      return unless ['reaction', 'sample', 'collection'].include?(@type)
      return unless ['comment', 'comments', 'reviewed', 'submit', 'approved', 'accepted', 'declined'].include?(@action)

      logger(next_step, 'save_comments')
      save_comments(action_name, @action != 'comments') unless @action == 'comment' || @action == 'approved'
      logger(next_step, "process_#{@action} started")
      @publication = send("process_#{@action}")
      logger(next_step, "process_#{@action} completed")
      refresh_embargo
      @publication
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def element_submit(root)
      logger(next_step, "element_submit(#{root.id})")
      root.descendants.each { |np| np.destroy! if np.element.nil? }
      root.element.reserve_suffix
      root.element.reserve_suffix_analyses(root.element.analyses) if root.element.analyses&.length > 0
      root.element.analyses&.each do |a|
        accept_new_analysis(root, a, Publication.find_by(element: a).nil?)
      end
      case root.element_type
      when 'Sample'
        analyses_ids = root.element.analyses.pluck(:id)
        root.update!(taggable_data: root.taggable_data.merge(analysis_ids: analyses_ids))
        root.element.analyses.each do |sa|
          accept_new_analysis(root, sa, Publication.find_by(element: sa).nil?)
        end

      when 'Reaction'
        root.element.products.each do |pd|
          Publication.find_by(element_type: 'Sample', element_id: pd.id)&.destroy! if pd.analyses&.length == 0
          next if pd.analyses&.length == 0
          pd.reserve_suffix
          pd.reserve_suffix_analyses(pd.analyses)
          pd.reload
          prod_pub = Publication.find_by(element: pd)
          if prod_pub.nil?
            accept_new_sample(root, pd)
          else
            pd.analyses.each do |rpa|
              accept_new_analysis(prod_pub, rpa, Publication.find_by(element: rpa).nil?)
            end
          end
        end
      end
      root.reload
      root.update_columns(doi_id: root.element.doi.id) unless root.doi_id == root.element.doi.id
      root.descendants.each { |pub_a|
        next if pub_a.element.nil?
        pub_a.update_columns(doi_id: pub_a.element.doi.id) unless pub_a.doi_id == pub_a.element&.doi&.id
      }
      begin
        logger(next_step, "update_tag_doi(#{root.element.id})")
        Repo::SubmissionApis.update_tag_doi(root.element)
      rescue StandardError => e
        log_exception(e, method: __method__)
      end
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    private

    def refresh_embargo
      return if @type == 'collection'

      embargo = Repo::FetchHandler.find_embargo_collection(@root_publication)
      embargo_pub = embargo.publication if embargo.present?
      embargo_pub&.refresh_embargo_metadata
    end

    def process_review_info
      logger(next_step, "process_review_info")
      element_class = Object.const_get("Entities::#{@type.capitalize}Entity")
      element = element_class.represent(@root_publication.element)
      review_info = Repo::FetchHandler.repo_review_info(@root_publication, @user_id)
      his = @root_publication.review&.slice('history') unless User.reviewer_ids.include?(@user_id) || @root_publication.review.dig('reviewers')&.include?(@user_id)
      { "#{@type}": element, review: his || @root_publication.review, review_info: review_info }
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    ### TODO: add description for each method
    def process_comment
      save_comment(@comments)
      his = @root_publication.review&.slice('history') unless User.reviewer_ids.include?(@user_id)
      { review: his || @root_publication.review }
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def process_comments
      process_review_info
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def process_reviewed
      element_submit(@root_publication)
      pub_update_state(Publication::STATE_REVIEWED)
      process_review_info
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def process_submit
      element_submit(@root_publication)
      pub_update_state(Publication::STATE_PENDING)
      process_review_info
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def process_approved  ## group leader only
      approve_comments
      process_review_info
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def process_accepted
      element_submit(@root_publication)
      public_literature
      pub_update_state(Publication::STATE_ACCEPTED)
      process_review_info
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def process_declined
      pub_update_state(Publication::STATE_DECLINED)
      ## TO BE HANDLED - remove from embargo collection
      process_review_info
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def pub_update_state(state)
      logger(next_step, "pub_update_state(#{state})")

      @root_publication.update_state(state)
      @root_publication.process_new_state_job(state, @user_id)
      # @embargo_pub&.refresh_embargo_metadata
      ##################### CHI to check
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def init_data
      logger(@step, 'init_data', show_params, :info)
      @current_user = User.find_by(id: @user_id)
      # @embargo_collection = EmbargoHandler.find_or_create_embargo(@embargo_id, @current_user) if @embargo_id.present? && @embargo_id >= 0
      @root_publication = Publication.find_by(element_type: @type.classify, element_id: @id).root
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def show_params
      { action: @action, root_pub_id: @root_publication&.id, user_id: @user_id, type: @type, element_id: @id, comment: @comment, comments: @comments, checklist: @checklist, reviewComments: @reviewComments}
    end

    ### Save detail comment to the current review history
    def save_comment(comment)
      return if comment.nil? || comment.keys&.empty?

      review = @root_publication.review || {}
      review_history = review['history'] || []
      current = review_history.last
      comments = current['comments'] || {}
      comment[comment.keys[0]]['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S') unless comment.keys.empty?
      comment[comment.keys[0]]['username'] = @current_user.name
      comment[comment.keys[0]]['userid'] = @current_user.id

      current['comments'] = comments.deep_merge(comment || {})
      review['history'] = review_history
      @root_publication.update!(review: review)
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def save_comments(action, his = true)
      review = @root_publication.review || {}
      review_history = review['history'] || []
      current = review_history.last || {}
      current['state'] = %w[accepted declined].include?(action) ? action : @root_publication.state
      current['action'] = action unless action.nil?
      current['username'] = @current_user.name
      current['userid'] = @current_user.id
      current['comment'] = @comment unless @comment.nil?
      current['type'] = @root_publication.state == Publication::STATE_PENDING ? 'reviewed' : 'submit'
      current['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')

      if review_history.length == 0
        review_history[0] = current
      else
        review_history[review_history.length - 1] = current
      end
      if his ## add next_node
        next_node = { action: 'revising', type: 'submit', state: 'reviewed' } if @action == 'reviewed'
        next_node = { action: 'reviewing', type: 'reviewed', state: 'pending' } if @action == 'submit'
        unless next_node.nil?
          review_history << next_node
        end
        review['history'] = review_history
      else

        # is_leader = review.dig('reviewers')&.include?(current_user&.id)
        if @root_publication.state == Publication::STATE_PENDING && (action.nil? || action == Publication::STATE_REVIEWED)
          next_node = { action: 'reviewing', type: 'reviewed', state: 'pending' }
          review_history << next_node
          review['history'] = review_history
        end
      end
      if @checklist&.length&.positive?
        revst = review['checklist'] || {}
        @checklist.each do |k, v|
          revst[k] = v['status'] == true ? { status: v['status'], user: @current_user.name, updated_at: Time.now.strftime('%d-%m-%Y %H:%M:%S') } : { status: false } unless revst[k] && revst[k]['status'] == v['status']
        end
        review['checklist'] = revst
      end
      review['reviewComments'] = @reviewComments if @reviewComments.present?
      @root_publication.update!(review: review)
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def approve_comments
      review = @root_publication.review || {}
      review_history = review['history'] || []
      current = review_history.last
      current['username'] = @current_user.name
      current['userid'] = @current_user.id
      current['action'] = 'pre-approved'
      current['comment'] = @comment unless @comment.nil?
      current['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')
      review_history[review_history.length - 1] = current
      next_node = { action: 'reviewing', type: 'reviewed', state: 'pending' }
      review_history << next_node
      review['history'] = review_history
      revst = review['checklist'] || {}
      revst['glr'] = { status: true, user: @current_user.name, updated_at: Time.now.strftime('%d-%m-%Y %H:%M:%S') }
      review['checklist'] = revst
      @root_publication.update!(review: review)
    end

    def accept_new_sample(root, sample)
      doi = sample&.doi

      # create or update concept
      previous_version = sample.tag.taggable_data['previous_version']['id']
      previous_publication = Publication.find_by(element_type: 'Sample', element_id: previous_version)
      if ENV['REPO_VERSIONING'] == 'true'
        if previous_publication.nil?
          concept = Concept.create_for_doi!(doi)
        else
          concept = previous_publication.concept
          concept.update_for_doi!(doi)
        end
        pub_s = Publication.create!(
          state: Publication::STATE_PENDING,
          element: sample,
          doi: doi,
          concept: concept,
          published_by: root.published_by,
          parent: root,
          taggable_data: root.taggable_data
        )
      else
        pub_s = Publication.create!(
          state: Publication::STATE_PENDING,
          element: sample,
          doi: doi,
          published_by: root.published_by,
          parent: root,
          taggable_data: root.taggable_data
        )
      end

      sample.analyses.each do |sa|
        accept_new_analysis(pub_s, sa)
      end
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def accept_new_analysis(root, analysis, nil_analysis = true)
      if nil_analysis
        # create or update concept
        previous_version = analysis.extended_metadata['previous_version_id']
        previous_publication = Publication.find_by(element_type: 'Container', element_id: previous_version)
        if ENV['REPO_VERSIONING'] == 'true'
          if previous_publication.nil?
            concept = Concept.create_for_doi!(analysis.doi)
          else
            concept = previous_publication.concept
            concept.update_for_doi!(analysis.doi)
          end
          ap = Publication.create!(
            state: Publication::STATE_PENDING,
            element: analysis,
            doi: analysis.doi,
            concept: concept,
            published_by: root.published_by,
            parent: root,
            taggable_data: root.taggable_data
          )
        else
          ap = Publication.create!(
            state: Publication::STATE_PENDING,
            element: analysis,
            doi: analysis.doi,
            published_by: root.published_by,
            parent: root,
            taggable_data: root.taggable_data
          )
        end

        atag = ap.taggable_data
        aids = atag&.delete('analysis_ids')
        aoids = atag&.delete('original_analysis_ids')
        ap.save! if aids || aoids
      end
      begin
        analysis.children.where(container_type: 'dataset').each do |ds|
          ds.attachments.each do |att|
            if MimeMagic.by_path(att.filename)&.type&.start_with?('image')
              file_path = File.join('public/images/publications/', att.id.to_s, '/', att.filename)
              public_path = File.join('public/images/publications/', att.id.to_s)
              FileUtils.mkdir_p(public_path)
              File.write(file_path, att.read_file.force_encoding("utf-8"))
            end
          end
        end
      rescue StandardError => e
        log_exception(e, { step: @step, method: __method__ })
        Attachment.logger.error <<~TXT
        ---------  #{self.class.name} accept_new_analysis ------------
           root.id: #{root.id}
           analysis: #{analysis.id}
           nil_analysis: #{nil_analysis}

          Error Message:  #{e.message}
          Error:  #{e.backtrace.join("\n")}
        --------------------------------------------------------------------
        TXT
      end
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end


    def public_literature
      publications = [@root_publication] + @root_publication.descendants
      publications.each do |pub|
        next unless pub.element_type == 'Reaction' || pub.element_type == 'Sample'
        literals = Literal.where(element_type: pub.element_type, element_id: pub.element_id)
        literals&.each { |l| l.update_columns(category: 'public') } unless literals.nil?
      end
    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end

    def action_name
      return nil if @action == 'comments'
      return 'review' if @action == 'reviewed'
      return 'revision' if @action == 'submit'
      return 'approved' if @action == 'approved'
      return 'accepted' if @action == 'accepted'
      return 'declined' if @action == 'declined'
    end

    def next_step
      @step += 1
    end

    def logger(step, msg, options = {}, log_level = :debug)
      review_logger.send(log_level, "step: [#{step}], message: [#{msg}]\n ")
      review_logger.send(log_level, "options [#{options}]\n ") if options.present?
    end

    def log_exception(exception, options = {})
      review_logger.error(self.class.name);
      review_logger.error("options [#{options}] \n ")
      review_logger.error(show_params);
      review_logger.error("exception: #{exception.message}")
      review_logger.error(exception.backtrace.join("\n"))

      # send email to admin
      Message.create_msg_notification(
        channel_id: Channel.find_by(subject: Channel::SUBMITTING)&.id,
        message_from: User.find_by(name_abbreviation: 'CHI')&.id,
        autoDismiss: 5,
        message_content: { 'data': "Exception, User: [#{@user_id}], the original submission [#{@type}: #{@id}], got error, #{exception.message}" },
      )
    end

    def review_logger
      @@review_logger ||= Logger.new(Rails.root.join('log/reviewing.log'))
    end
  end
end