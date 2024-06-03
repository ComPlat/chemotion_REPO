module Repo
  class Submission
    def initialize(args)
      @user_id = args[:user_id]
      @type = args[:type]
      @id = args[:id]
      @author_ids = args[:author_ids]
      @group_reviewers = args[:group_leaders]
      @analyses_ids = args[:analyses_ids]
      @literal_ids = args[:refs]
      @license = args[:license]
      @embargo_id = args[:embargo]
      @scheme_only = args[:scheme_only] || false
      @scheme_params = args[:scheme_params] || []
      @step = 0
      init_data
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def next_step
      @step += 1
    end

    def submitting
      logger(next_step, __method__)
      return unless @type == 'Sample' || @type == 'Reaction'

      @element = @type.constantize.find_by(id: @id)

      scheme_only_handling if @type == 'Reaction' && @scheme_only == true
      @analyses = @element&.analyses&.where(id: @analyses_ids)
      @analysis_set = @analyses | Container.where(id: @element.samples.flat_map { |s| s.analyses.ids } & @analyses_ids) if @type == 'Reaction' && @analyses_ids.present?
      @analysis_set_ids = @analysis_set&.map(&:id) if @type == 'Reaction' && @analysis_set && @analysis_set.length > 0

      logger(next_step, 'create_publication_tag')
      @publication_tag = create_publication_tag

      logger(next_step, 'reviewer_collections')
      reviewer_collections

      logger(next_step, "prepare_#{@type.downcase}_data")
      @publication = send("prepare_#{@type.downcase}_data")

      logger(next_step, 'process_element')
      @publication.process_element

      logger(next_step, 'update_tag_doi')

      begin
        Repo::SubmissionApis.update_tag_doi(@publication.element)
      rescue StandardError => e
        log_exception(e, method: __method__)
      end

      if col_pub = @embargo_collection&.publication
        logger(next_step, 'refresh_embargo_metadata')
        col_pub.refresh_embargo_metadata
      end
      logger(next_step, 'process_new_state_job')
      @publication.process_new_state_job

      send_message_to_user

      logger(next_step, "#{__method__} completed, submmited element [#{@new_root&.id&.to_s}]\n ", {}, :info)

    rescue StandardError => e
      log_exception(e, { step: @step, method: __method__ })
      raise e
    end


    private

    def show_params
      { user_id: @user_id, type: @type, id: @id, author_ids: @author_ids, group_leaders: @group_reviewers, analyses_ids: @analyses_ids, refs: @literal_ids, license: @license, embargo: @embargo_id }
    end

    def init_data
      logger(@step, 'init_data', show_params, :info)
      @current_user = User.find_by(id: @user_id)
      @literals = Literal.where(id: @literal_ids) if @literal_ids.present?
      @embargo_collection = EmbargoHandler.find_or_create_embargo(@embargo_id, @current_user) if @embargo_id.present? && @embargo_id >= 0
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def create_publication_tag
      authors = User.where(type: %w[Person Collaborator], id: @author_ids)
                    .includes(:affiliations)
                    .order(Arel.sql("position(users.id::text in '#{@author_ids}')"))
      affiliations = authors.map(&:current_affiliations)
      affiliations_output = {}
      affiliations.flatten.each do |aff|
        affiliations_output[aff.id] = aff.output_full
      end
      {
        published_by: @author_ids[0],
        author_ids: @author_ids,
        creators: authors.map do |author|
          {
            'givenName' => author.first_name,
            'familyName' => author.last_name,
            'name' => author.name,
            'ORCID' => author.orcid,
            'affiliationIds' => author.current_affiliations.map(&:id),
            'id' => author.id
          }
        end,
        contributors: {
          'givenName' => @current_user.first_name,
          'familyName' => @current_user.last_name,
          'name' => @current_user.name,
          'ORCID' => @current_user.orcid,
          'affiliations' => @current_user.current_affiliations.map(&:output_full),
          'id' => @current_user.id
        },
        affiliations: affiliations_output,
        affiliation_ids: affiliations.map { |as| as.map(&:id) },
        queued_at: DateTime.now,
        license: @license,
        scheme_only: @scheme_only
      }
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end


    def prepare_reaction_data
      @reaction_analysis_set = @element.analyses.where(id: @analysis_set_ids)
      @new_root = duplicate_reaction
      @element.tag_as_published(@new_root, @reaction_analysis_set)
      @new_root.create_publication_tag(@current_user, @author_ids, @license)
      @new_root.samples.each do |new_sample|
        new_sample.create_publication_tag(@current_user, @author_ids, @license)
      end
      @new_publication = Publication.find_by(element: @new_root)
      add_submission_history(@new_publication)
      @new_publication
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def prepare_sample_data
      @new_root = duplicate_sample(@element, @analyses)
      @element.tag_as_published(@new_root, @analyses)
      @new_root.create_publication_tag(@current_user, @author_ids, @license)
      @element.untag_reserved_suffix
      @new_publication = Publication.find_by(element: @new_root)
      add_submission_history(@new_publication)
      @new_publication
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end


    def add_submission_history(root)
      init_node = {
        state: 'submission',
        action: 'submission',
        timestamp: Time.now.strftime('%d-%m-%Y %H:%M:%S'),
        username: @current_user.name,
        user_id: @current_user.id,
        type: 'submit'
      }
      review = root.review || {}
      history = review['history'] || []
      history << init_node

      current_node = {
        action: 'reviewing',
        type: 'reviewed',
        state: 'pending'
      }
      history << current_node
      review['history'] = history
      review['reviewers'] = @group_reviewers if @group_reviewers.present?
      root.update!(review: review)
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def reviewer_collections
      c = @current_user.pending_collection
      User.reviewer_ids.each do |rev_id|
        SyncCollectionsUser.find_or_create_by(
          collection_id: c.id,
          user_id: rev_id,
          shared_by_id: c.user_id,
          permission_level: 3,
          sample_detail_level: 10,
          reaction_detail_level: 10,
          label: 'REVIEWING'
        )
      end
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def duplicate_reaction
      new_reaction = @element.dup
      princhi_string, princhi_long_key, princhi_short_key, princhi_web_key = @element.products_rinchis

      new_reaction.collections << @current_user.pending_collection
      new_reaction.collections << Collection.element_to_review_collection
      new_reaction.collections << @embargo_collection unless @embargo_collection.nil?

      dir = File.join(Rails.root, 'public', 'images', 'reactions')
      rsf = @element.reaction_svg_file
      path = File.join(dir, rsf)
      new_rsf = "#{Time.now.to_i}-#{rsf}"
      dest = File.join(dir, new_rsf)

      new_reaction.save!
      new_reaction.copy_segments(segments: @element.segments, current_user_id: @user_id)
      unless @literals.nil?
        lits = @literals&.select { |lit| lit['element_type'] == 'Reaction' && lit['element_id'] == @element.id }
        duplicate_literals(new_reaction, lits)
      end
      if File.exists? path
        FileUtils.cp(path, dest)
        new_reaction.update_columns(reaction_svg_file: new_rsf)
      end
      # new_reaction.save!
      et = new_reaction.tag
      data = et.taggable_data || {}
      # data[:products_rinchi] = {
      #   rinchi_string: princhi_string,
      #   rinchi_long_key: princhi_long_key,
      #   rinchi_short_key: princhi_short_key,
      #   rinchi_web_key:  princhi_web_key
      # }
      et.update!(taggable_data: data)

      if (d = @element.doi)
        d.update!(doiable: new_reaction)
      else
        # NB: the reaction has still no sample, so it cannot get a proper rinchi needed for the doi
        # => use the one from original reaction
        d = Doi.create_for_element!(new_reaction, 'reaction/' + @element.products_short_rinchikey_trimmed)
      end

      pub = Publication.create!(
        state: Publication::STATE_PENDING,
        element: new_reaction,
        original_element: @element,
        published_by: @user_id,
        doi: d,
        taggable_data: @publication_tag.merge(
          author_ids: @author_ids,
          original_analysis_ids: @analysis_set_ids,
          products_rinchi: {
            rinchi_string: princhi_string,
            rinchi_long_key: princhi_long_key,
            rinchi_short_key: princhi_short_key,
            rinchi_web_key: princhi_web_key
          }
        )
      )

      duplicate_analyses(new_reaction, @reaction_analysis_set, 'reaction/' + @element.products_short_rinchikey_trimmed)
      @element.reactions_samples.each  do |rs|
        new_rs = rs.dup
        sample = @current_user.samples.find_by(id: rs.sample_id)
        if @scheme_only == true
          sample.target_amount_value = 0.0
          sample.real_amount_value = nil
        end
        sample_analysis_set = sample.analyses.where(id: @analysis_set_ids)
        new_sample = duplicate_sample(sample, sample_analysis_set, pub.id)
        sample.tag_as_published(new_sample, sample_analysis_set)
        new_rs.sample_id = new_sample
        new_rs.reaction_id = new_reaction.id
        new_rs.sample_id = new_sample.id
        new_rs.reaction_id = new_reaction.id
        new_rs.save!
      end

      new_reaction.update_svg_file!
      new_reaction.reload
      new_reaction.save!
      new_reaction.reload
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def duplicate_sample(sample = @sample, analyses = @analyses, parent_publication_id = nil)
      new_sample = sample.dup
      new_sample.reprocess_svg if new_sample.sample_svg_file.blank?
      new_sample.collections << @current_user.pending_collection
      new_sample.collections << Collection.element_to_review_collection
      new_sample.collections << @embargo_collection unless @embargo_collection.nil?
      new_sample.save!
      new_sample.copy_segments(segments: sample.segments, current_user_id: @current_user.id) if sample.segments
      duplicate_residues(new_sample, sample) if sample.residues
      duplicate_elemental_compositions(new_sample, sample) if sample.elemental_compositions
      duplicate_user_labels(new_sample, sample, @current_user&.id)
      unless @literals.nil?
        lits = @literals&.select { |lit| lit['element_type'] == 'Sample' && lit['element_id'] == sample.id }
        duplicate_literals(new_sample, lits)
      end
      duplicate_analyses(new_sample, analyses, new_sample.molecule.inchikey)
      has_analysis = new_sample.analyses.present?
      if (has_analysis = new_sample.analyses.present?)
        if (d = sample.doi)
          d.update!(doiable: new_sample)
        else
          d = Doi.create_for_element!(new_sample)
        end
        pub = Publication.create!(
          state: Publication::STATE_PENDING,
          element: new_sample,
          original_element: sample,
          published_by: @current_user.id,
          doi: d,
          parent_id: parent_publication_id,
          taggable_data: @publication_tag.merge(
            author_ids: @author_ids,
            user_labels: sample.tag.taggable_data['user_labels'],
            original_analysis_ids: analyses.pluck(:id),
            analysis_ids: new_sample.analyses.pluck(:id)
          )
        )
      end
      new_sample.analyses.each do |ana|
        Publication.find_by(element: ana).update(parent: pub)
      end
      new_sample
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def duplicate_residues(newSample, originalSample)
      originalSample&.residues&.each do |res|
        newRes = Residue.find_or_create_by(sample_id: newSample.id, residue_type: res.residue_type)
        newRes.update_columns(custom_info: res.custom_info)
      end
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def duplicate_elemental_compositions(newSample, originalSample)
      originalSample&.elemental_compositions&.each do |ec|
        newComposition = ElementalComposition.find_or_create_by(sample_id: newSample.id, composition_type: ec.composition_type)
        newComposition.update_columns(data: ec.data, loading: ec.loading)
      end
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def duplicate_user_labels(new_element, original_element, current_user_id)
      user_labels = original_element.tag&.taggable_data&.dig('user_labels')
      return if user_labels.nil?

      tag = new_element.tag
      taggable_data = tag.taggable_data || {}
      taggable_data['user_labels'] = user_labels
      tag.update!(taggable_data: taggable_data)

      if new_element.respond_to?(:publication) && pub = new_element.publication
        pub.update_user_labels(data['user_labels'], current_user_id) if pub.present?
      end
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def duplicate_literals(element, literals)
      literals&.each do |lit|
        attributes = {
          literature_id: lit.literature_id,
          element_id: element.id,
          element_type: lit.element_type,
          category: 'detail',
          user_id: lit.user_id,
          litype: lit.litype
        }
        Literal.create(attributes)
      end
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def duplicate_analyses(new_element, analyses_arr, ik = nil)
      unless new_element.container
        Container.create_root_container(containable: new_element)
        new_element.reload
      end
      analyses = Container.analyses_container(new_element.container.id).first
      parent_publication = new_element.publication
      analyses_arr&.each do |ana|
        new_ana = analyses.children.create(
          name: ana.name,
          container_type: ana.container_type,
          description: ana.description
        )
        new_ana.extended_metadata = ana.extended_metadata
        new_ana.save!

        # move reserved doi
        if (d = ana.doi)
          d.update(doiable: new_ana)
        else
          d = Doi.create_for_analysis!(new_ana, ik)
        end
        Publication.create!(
          state: Publication::STATE_PENDING,
          element: new_ana,
          original_element: ana,
          published_by: @current_user.id,
          doi: d,
          parent: new_element.publication,
          taggable_data: @publication_tag.merge(
            author_ids: @author_ids
          )
        )
        # duplicate datasets and copy attachments
        ana.children.where(container_type: 'dataset').each do |ds|
          new_dataset = new_ana.children.create(container_type: 'dataset')
          new_dataset.name = ds.name
          new_dataset.extended_metadata = ds.extended_metadata
          new_dataset.save!
          new_dataset.copy_dataset(ds)
          clone_attachs = ds.attachments
          Usecases::Attachments::Copy.execute!(clone_attachs, new_dataset, @current_user.id) if clone_attachs.present?
        end
      end
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    # def update_tag_doi(element)
    #   unless element.nil? || element&.doi.nil? || element&.tag.nil?
    #     mds = Datacite::Mds.new
    #     et = element.tag
    #     tag_data = (et.taggable_data && et.taggable_data['publication']) || {}
    #     tag_data['doi'] = "#{mds.doi_prefix}/#{element&.doi.suffix}"
    #     et.update!(
    #       taggable_data: (et.taggable_data || {}).merge(publication: tag_data)
    #     )
    #     if element&.class&.name == 'Reaction'
    #       element&.publication.children.each do |child|
    #         next unless child&.element&.class&.name == 'Sample'

    #         update_tag_doi(child.element)
    #       end
    #     end
    #   end
    # rescue StandardError => e
    #   log_exception(e, method: __method__)
    #   raise e
    # end

    def scheme_only_handling
      return unless @type == 'Reaction' && @scheme_only == true

      @element.reactions_samples.select { |rs| rs.type == 'ReactionsProductSample' }.map do |p|
        py = @scheme_params[:scheme_yield].select { |o| o['id'] == p.sample_id }
        p.equivalent = py[0]['_equivalent'] if py && !py.empty?
        p.scheme_yield = py[0]['_equivalent'] if py && !py.empty?
      end

      @element.reactions_samples.select{ |rs| rs.type != 'ReactionsProductSample' }.map do |p|
        p.equivalent = 0
      end
      @element.name = ''
      @element.purification = '{}'
      @element.dangerous_products = '{}'
      @element.description = { 'ops' => [{ 'insert' => '' }] } unless @scheme_params[:schemeDesc]
      @element.observation = { 'ops' => [{ 'insert' => '' }] }
      @element.tlc_solvents = ''
      @element.tlc_description = ''
      @element.rf_value = 0
      @element.rxno = nil
      @element.role = ''
      @element.temperature = @scheme_params[:temperature]
      @element.duration = "#{@scheme_params[:duration][:dispValue]} #{@scheme_params[:duration][:dispUnit]}" unless @scheme_params[:duration].nil?
    end

    def send_message_to_user
      is_scheme_ony = @scheme_only == true ? 'scheme-only ' : ''
      Message.create_msg_notification(
        channel_id: Channel.find_by(subject: Channel::SUBMITTING)&.id,
        message_from: @user_id,
        autoDismiss: 5,
        message_content: { 'data': "The submission [#{is_scheme_ony}#{@type}: #{@new_root.short_label}] has been generated from the original submission [#{@type}: #{@element.short_label}]" },
      )
    rescue StandardError => e
      log_exception(e, method: __method__)
    end

    def logger(step, msg, options = {}, log_level = :debug)
      submit_logger.send(log_level, "step: [#{step}], message: [#{msg}]\n ")
      submit_logger.send(log_level, "options [#{options}]\n ") if options.present?
    end

    def log_exception(exception, options = {})
      submit_logger.error(self.class.name);
      submit_logger.error("options [#{options}] \n ")
      submit_logger.error(show_params);
      submit_logger.error("exception: #{exception.message}")
      submit_logger.error(exception.backtrace.join("\n"))

      # send message to admin
      Message.create_msg_notification(
        channel_id: Channel.find_by(subject: Channel::SUBMITTING)&.id,
        message_from: User.find_by(name_abbreviation: 'CHI')&.id,
        autoDismiss: 5,
        message_content: { 'data': "Exception, User: [#{@user_id}], the original submission [#{@type}: #{@id}],  new submission [#{@new_root&.id}] #{@new_root&.short_label}] got error, #{exception.message}" },
      )

    end

    def submit_logger
      @@submit_logger ||= Logger.new(Rails.root.join('log/submission.log'))
    end

  end
end