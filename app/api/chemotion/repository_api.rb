# frozen_string_literal: true

require 'securerandom'
module Chemotion
  # Repository API
  class RepositoryAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers SampleHelpers
    helpers SubmissionHelpers
    helpers EmbargoHelpers

    namespace :repository do
      helpers do
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
              published_by: current_user.id,
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
              clone_attachs = ds.attachments
              Usecases::Attachments::Copy.execute!(clone_attachs, new_dataset, current_user.id) if clone_attachs.present?
            end
          end
        end

        def reviewer_collections
          c = current_user.pending_collection
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
        end

        # Create(clone) publication sample/analyses with dois
        def duplicate_sample(sample = @sample, analyses = @analyses, parent_publication_id = nil)
          new_sample = sample.dup
          new_sample.reprocess_svg if new_sample.sample_svg_file.blank?
          new_sample.collections << current_user.pending_collection
          new_sample.collections << Collection.element_to_review_collection
          new_sample.collections << @embargo_collection unless @embargo_collection.nil?
          new_sample.save!
          new_sample.copy_segments(segments: sample.segments, current_user_id: current_user.id) if sample.segments
          duplicate_residues(new_sample, sample) if sample.residues
          duplicate_elemental_compositions(new_sample, sample) if sample.elemental_compositions
          duplicate_user_labels(new_sample, sample) ## if sample.tag.taggable_data['user_labels']
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
              published_by: current_user.id,
              doi: d,
              parent_id: parent_publication_id,
              taggable_data: @publication_tag.merge(
                author_ids: @author_ids,
                original_analysis_ids: analyses.pluck(:id),
                analysis_ids: new_sample.analyses.pluck(:id)
              )
            )
          end
          new_sample.analyses.each do |ana|
            Publication.find_by(element: ana).update(parent: pub)
          end
          new_sample
        end

        def concat_author_ids(coauthors = params[:coauthors])
          coauthor_ids = coauthors.map do |coa|
            val = coa.strip
            next val.to_i if val =~ /^\d+$/

            User.where(type: %w(Person Collaborator)).where.not(confirmed_at: nil).find_by(email: val)&.id if val =~ /^\S+@\S+$/
          end.compact
          [current_user.id] + coauthor_ids
        end

        def duplicate_reaction(reaction, analysis_set)
          new_reaction = reaction.dup
          if analysis_set && analysis_set.length > 0
            analysis_set_ids = analysis_set.map(&:id)
            reaction_analysis_set = reaction.analyses.where(id: analysis_set_ids)
          end
          princhi_string, princhi_long_key, princhi_short_key, princhi_web_key = reaction.products_rinchis

          new_reaction.collections << current_user.pending_collection
          new_reaction.collections << Collection.element_to_review_collection
          new_reaction.collections << @embargo_collection unless @embargo_collection.nil?

          # composer = SVG::ReactionComposer.new(paths, temperature: temperature_display_with_unit,
          #                                             solvents: solvents_in_svg,
          #                                             show_yield: true)
          # new_reaction.reaction_svg_file = composer.compose_reaction_svg_and_save(prefix: Time.now)
          dir = File.join(Rails.root, 'public', 'images', 'reactions')
          rsf = reaction.reaction_svg_file
          path = File.join(dir, rsf)
          new_rsf = "#{Time.now.to_i}-#{rsf}"
          dest = File.join(dir, new_rsf)

          new_reaction.save!
          new_reaction.copy_segments(segments: reaction.segments, current_user_id: current_user.id)
          unless @literals.nil?
            lits = @literals&.select { |lit| lit['element_type'] == 'Reaction' && lit['element_id'] == reaction.id }
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

          if (d = reaction.doi)
            d.update!(doiable: new_reaction)
          else
            # NB: the reaction has still no sample, so it cannot get a proper rinchi needed for the doi
            # => use the one from original reaction
            d = Doi.create_for_element!(new_reaction, 'reaction/' + reaction.products_short_rinchikey_trimmed)
          end

          pub = Publication.create!(
            state: Publication::STATE_PENDING,
            element: new_reaction,
            original_element: reaction,
            published_by: current_user.id,
            doi: d,
            taggable_data: @publication_tag.merge(
              author_ids: @author_ids,
              original_analysis_ids: analysis_set_ids,
              products_rinchi: {
                rinchi_string: princhi_string,
                rinchi_long_key: princhi_long_key,
                rinchi_short_key: princhi_short_key,
                rinchi_web_key: princhi_web_key
              }
            )
          )

          duplicate_analyses(new_reaction, reaction_analysis_set, 'reaction/' + reaction.products_short_rinchikey_trimmed)
          reaction.reactions_samples.each  do |rs|
            new_rs = rs.dup
            sample = current_user.samples.find_by(id: rs.sample_id)
            if @scheme_only == true
              sample.target_amount_value = 0.0
              sample.real_amount_value = nil
            end
            sample_analysis_set = sample.analyses.where(id: analysis_set_ids)
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
        end

        def create_publication_tag(contributor, author_ids, license)
          authors = User.where(type: %w[Person Collaborator], id: author_ids)
                        .includes(:affiliations)
                        .order(Arel.sql("position(users.id::text in '#{author_ids}')"))
          affiliations = authors.map(&:current_affiliations)
          affiliations_output = {}
          affiliations.flatten.each do |aff|
            affiliations_output[aff.id] = aff.output_full
          end
          {
            published_by: author_ids[0],
            author_ids: author_ids,
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
              'givenName' => contributor.first_name,
              'familyName' => contributor.last_name,
              'name' => contributor.name,
              'ORCID' => contributor.orcid,
              'affiliations' => contributor.current_affiliations.map(&:output_full),
              'id' => contributor.id
            },
            affiliations: affiliations_output,
            affiliation_ids: affiliations.map { |as| as.map(&:id) },
            queued_at: DateTime.now,
            license: license,
            scheme_only: @scheme_only
          }
        end

        def prepare_reaction_data
          reviewer_collections
          new_reaction = duplicate_reaction(@reaction, @analysis_set)
          reaction_analysis_set = @reaction.analyses.where(id: @analysis_set_ids)
          @reaction.tag_as_published(new_reaction, reaction_analysis_set)
          new_reaction.create_publication_tag(current_user, @author_ids, @license)
          new_reaction.samples.each do |new_sample|
            new_sample.create_publication_tag(current_user, @author_ids, @license)
          end
          pub = Publication.where(element: new_reaction).first
          add_submission_history(pub)
          pub
        end

        def duplicate_user_labels(newSample, originalSample)
          user_labels = originalSample.tag&.taggable_data.dig('user_labels')
          return if user_labels.nil?

          tag = newSample.tag
          taggable_data = tag.taggable_data || {}
          taggable_data['user_labels'] = user_labels
          tag.update!(taggable_data: taggable_data)
        end

        def duplicate_elemental_compositions(newSample, originalSample)
          originalSample&.elemental_compositions&.each do |ec|
            newComposition = ElementalComposition.find_or_create_by(sample_id: newSample.id, composition_type: ec.composition_type)
            newComposition.update_columns(data: ec.data, loading: ec.loading)
          end
        end

        def duplicate_residues(newSample, originalSample)
          originalSample&.residues&.each do |res|
            newRes = Residue.find_or_create_by(sample_id: newSample.id, residue_type: res.residue_type)
            newRes.update_columns(custom_info: res.custom_info)
          end
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
        end

        def prepare_sample_data
          reviewer_collections
          new_sample = duplicate_sample(@sample, @analyses)
          @sample.tag_as_published(new_sample, @analyses)
          new_sample.create_publication_tag(current_user, @author_ids, @license)
          @sample.untag_reserved_suffix
          pub = Publication.where(element: new_sample).first
          add_submission_history(pub)
          pub
        end

        def add_submission_history(root)
          init_node = {
            state: 'submission',
            action: 'submission',
            timestamp: Time.now.strftime('%d-%m-%Y %H:%M:%S'),
            username: current_user.name,
            user_id: current_user.id,
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
        end
      end

      desc 'Get review list'
      params do
        optional :type, type: String, desc: 'Type'
        optional :state, type: String, desc: 'State'
        optional :search_type, type: String, desc: 'search type', values: %w[All Name Embargo Submitter]
        optional :search_value, type: String, desc: 'search value'
        optional :page, type: Integer, desc: 'page'
        optional :pages, type: Integer, desc: 'pages'
        optional :per_page, type: Integer, desc: 'per page'
      end
      paginate per_page: 10, offset: 0, max_per_page: 100
      get 'list' do
        type = params[:type].blank? || params[:type] == 'All' ? %w[Sample Reaction] : params[:type].chop!
        state = params[:state].empty? || params[:state] == 'All' ? [Publication::STATE_PENDING, Publication::STATE_REVIEWED, Publication::STATE_ACCEPTED] : params[:state]
        pub_scope = if User.reviewer_ids.include?(current_user.id)
                      Publication.where(state: state, ancestry: nil, element_type: type)
                    else
                      Publication.where(state: state, ancestry: nil, element_type: type).where("published_by = ? OR (review -> 'reviewers')::jsonb @> '?'", current_user.id, current_user.id)
                    end
        unless params[:search_value].blank? || params[:search_value] == 'All'
          case params[:search_type]
          when 'Submitter'
            pub_scope = pub_scope.where(published_by: params[:search_value])
          when 'Embargo'
            embargo_search = <<~SQL
              (element_type = 'Reaction' and element_id in (select reaction_id from collections_reactions cr where cr.deleted_at is null and cr.collection_id = ?))
              or
              (element_type = 'Sample' and element_id in (select sample_id from collections_samples cs where cs.deleted_at is null and cs.collection_id = ?))
            SQL
            embargo_search = ActiveRecord::Base.send(:sanitize_sql_array, [embargo_search, params[:search_value], params[:search_value]])
            pub_scope = pub_scope.where(embargo_search)
          when 'Name'
            r_name_sql = " r.short_label like '%#{ActiveRecord::Base.send(:sanitize_sql_like, params[:search_value])}%' "
            s_name_sql = " s.short_label like '%#{ActiveRecord::Base.send(:sanitize_sql_like, params[:search_value])}%' "
            name_search = <<~SQL
              (element_type = 'Reaction' and element_id in (select id from reactions r where #{r_name_sql}))
              or
              (element_type = 'Sample' and element_id in (select id from samples s where #{s_name_sql}))
            SQL
            pub_scope = pub_scope.where(name_search)
          end
        end

        list = pub_scope.order('publications.updated_at desc')
        elements = []
        paginate(list).each do |e|
          element_type = e.element&.class&.name
          next if element_type.nil?

          u = User.find(e.published_by) unless e.published_by.nil?
          svg_file = e.element.reaction_svg_file if element_type == 'Reaction'
          title = e.element.short_label if element_type == 'Reaction'

          svg_file = e.element.sample_svg_file if element_type == 'Sample'
          title = e.element.short_label if element_type == 'Sample'
          review_info = repo_review_info(e, current_user&.id, true)
          checklist = e.review && e.review['checklist'] if User.reviewer_ids.include?(current_user&.id) || review_info[:groupleader] == true
          scheme_only = element_type == 'Reaction' && e.taggable_data && e.taggable_data['scheme_only']


          elements.push(
            id: e.element_id, svg: svg_file, type: element_type, title: title, checklist: checklist || {}, review_info: review_info, isReviewer: User.reviewer_ids.include?(current_user&.id) || false,
            published_by: u&.name, submitter_id: u&.id, submit_at: e.created_at, state: e.state, embargo: find_embargo_collection(e).label, scheme_only: scheme_only
          )
        end
        { elements: elements }
      end

      desc 'Get embargo list'
      helpers RepositoryHelpers
      post 'embargo_list' do
        params do
          optional :is_submit, type: Boolean, default: false, desc: 'Publication submission'
        end
        is_reviewer = User.reviewer_ids.include?(current_user.id)
        is_embargo_viewer = User.embargo_viewer_ids.include?(current_user.id)
        is_submitter = false
        if (is_reviewer || is_embargo_viewer) && params[:is_submit] == false
          es = Publication.where(element_type: 'Collection', state: 'pending').order(Arel.sql("taggable_data->>'label' ASC"))
        else
          is_submitter = current_user.type == 'Anonymous' ? false : true
          cols = if current_user.type == 'Anonymous'
                   Collection.where(id: current_user.sync_in_collections_users.pluck(:collection_id)).where.not(label: 'chemotion')
                 else
                  Collection.where(ancestry: current_user.publication_embargo_collection.id)
                 end
          es = Publication.where(element_type: 'Collection', element_id: cols.pluck(:id)).order(Arel.sql("taggable_data->>'label' ASC")) unless cols&.empty?
        end
        # es = build_publication_element_state(es) unless es.empty?

        { repository: es, current_user: { id: current_user.id, type: current_user.type, is_reviewer: is_reviewer, is_submitter: is_submitter } }
      end

      namespace :assign_embargo do
        desc 'assign to an embargo bundle'
        params do
          requires :new_embargo, type: Integer, desc: 'Collection id'
          requires :element, type: Hash, desc: 'Element'
        end
        after_validation do
          declared_params = declared(params, include_missing: false)
          @p_element = declared_params[:element]
          @p_embargo = declared_params[:new_embargo]
          pub = Publication.find_by(element_type: @p_element['type'].classify, element_id: @p_element['id'])
          error!('404 Publication not found', 404) unless pub
          error!("404 Publication state must be #{Publication::STATE_REVIEWED}", 404) unless pub.state == Publication::STATE_REVIEWED
          error!('401 Unauthorized', 401) unless pub.published_by == current_user.id
          if @p_embargo.to_i.positive?
            e_col = Collection.find(@p_embargo.to_i)
            error!('404 This embargo has been released.', 404) unless e_col.ancestry.to_i == current_user.publication_embargo_collection.id
          end
        end
        post do
          embargo_collection = fetch_embargo_collection(@p_embargo.to_i, current_user) if @p_embargo.to_i >= 0
          case @p_element['type'].classify
          when 'Sample'
            CollectionsSample
          when 'Reaction'
            CollectionsReaction
          end.create_in_collection(@p_element['id'], [embargo_collection.id])
          { element: @p_element,
            new_embargo: embargo_collection,
            is_new_embargo: @p_embargo.to_i.zero?,
            message: "#{@p_element['type']} [#{@p_element['title']}] has been moved to Embargo Bundle [#{embargo_collection.label}]" }
        rescue StandardError => e
          { error: e.message }
        end
      end

      resource :compound do
        desc 'compound'
        params do
          requires :id, type: Integer, desc: 'Element id'
          optional :data, type: String
          optional :xcomp, type: String
        end
        resource :request do
          post do
            PublicationMailer.mail_request_compound(current_user, params[:id], params[:data], 'request').deliver_now
            PublicationMailer.mail_request_compound(current_user, params[:id], params[:data], 'confirmation').deliver_now
          end
        end
        resource :update do
          after_validation do
            @pub = ElementTag.find_by(taggable_type: 'Sample', taggable_id: params[:id])
            error!('404 No data found', 404) unless @pub
            element_policy = ElementPolicy.new(current_user, @pub.taggable)
            error!('401 Unauthorized', 401) unless element_policy.read? || User.reviewer_ids.include?(current_user.id)
          end
          post do
            data = @pub.taggable_data || {}
            xvial = data['xvial'] || {}
            xvial['num'] = params[:data]
            xvial['comp_num'] = params[:xcomp]
            xvial['username'] = current_user.name
            xvial['userid'] = current_user.id
            xvial['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')
            data['xvial'] = xvial
            @pub.update!(taggable_data: data)
          end
        end
      end

      resource :comment do
        desc 'User comment'
        params do
          requires :id, type: Integer, desc: 'Element id'
          optional :type, type: String, values: %w[Reaction Sample Container Collection]
          requires :pageId, type: Integer, desc: 'Page Element id'
          optional :pageType, type: String, values: %w[reactions molecules]
          optional :comment, type: String
        end
        after_validation do
          @pub = Publication.find_by(element_type: params[:type], element_id: params[:id])
          error!('404 No data found', 404) unless @pub
          element_policy = ElementPolicy.new(current_user, @pub.element)
          error!('401 Unauthorized', 401) unless element_policy.read? || User.reviewer_ids.include?(current_user.id)
        end
        post 'user_comment' do
          PublicationMailer.mail_user_comment(current_user, params[:id], params[:type], params[:pageId], params[:pageType], params[:comment]).deliver_now
        end
        post 'reviewer' do
          pub = Publication.find_by(element_type: params[:type], element_id: params[:id])
          review = pub.review || {}
          review_info = review['info'] || {}
          review_info['comment'] = params[:comment]
          review_info['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')
          review_info['username'] = current_user.name
          review_info['userid'] = current_user.id

          review['info'] = review_info
          pub.update!(review: review)
        end
      end

      resource :reaction do
        helpers RepositoryHelpers
        desc 'Return PUBLISHED serialized reaction'
        params do
          requires :id, type: Integer, desc: 'Reaction id'
          optional :is_public, type: Boolean, default: true
        end
        after_validation do
          element = Reaction.find_by(id: params[:id])
          error!('404 No data found', 404) unless element

          element_policy = ElementPolicy.new(current_user, element)
          error!('401 Unauthorized', 401) unless element_policy.read? || User.reviewer_ids.include?(current_user.id)

          pub = Publication.find_by(element_type: 'Reaction', element_id: params[:id])
          error!('404 No data found', 404) if pub.nil?

          error!('401 Unauthorized', 401) if (params[:is_public] == false && pub.state == 'completed')
        end
        get do
          reaction = Reaction.where(id: params[:id])
                             .select(
                               <<~SQL
                                 reactions.id, reactions.name, reactions.description, reactions.reaction_svg_file, reactions.short_label,
                                 reactions.status, reactions.tlc_description, reactions.tlc_solvents, reactions.rf_value,
                                 reactions.temperature, reactions.timestamp_start,reactions.timestamp_stop,reactions.observation,
                                 reactions.rinchi_string, reactions.rinchi_long_key, reactions.rinchi_short_key,reactions.rinchi_web_key,
                                 (select json_extract_path(taggable_data::json, 'publication') from publications where element_type = 'Reaction' and element_id = reactions.id) as publication,
                                 reactions.duration
                               SQL
                             ).includes(container: :attachments).last
          literatures = get_literature(params[:id], 'Reaction', params[:is_public] ? 'public' : 'detail') || []
          reaction.products.each do |p|
            literatures += get_literature(p.id, 'Sample', params[:is_public] ? 'public' : 'detail')
          end
          schemeList = get_reaction_table(params[:id])
          publication = Publication.find_by(element_id: params[:id], element_type: 'Reaction')
          review_info = repo_review_info(publication, current_user&.id, false)
          publication.review&.slice!('history') unless User.reviewer_ids.include?(current_user.id) || review_info[:groupleader] == true
          published_user = User.find(publication.published_by) unless publication.nil?
          entities = Entities::RepoReactionEntity.represent(reaction, serializable: true)
          entities[:literatures] = literatures unless entities.nil? || literatures.blank?
          entities[:schemes] = schemeList unless entities.nil? || schemeList.blank?
          entities[:segments] = Labimotion::SegmentEntity.represent(reaction.segments)
          embargo = find_embargo_collection(publication)
          entities[:embargo] = embargo&.label
          entities[:embargoId] = embargo&.id
          {
            reaction: entities,
            selectEmbargo: Publication.find_by(element_type: 'Collection', element_id: embargo&.id),
            pub_name: published_user&.name || '',
            review_info: review_info
          }
        end
      end

      resource :sample do
        helpers RepositoryHelpers
        desc 'Return Review serialized Sample'
        params do
          requires :id, type: Integer, desc: 'Sample id'
          optional :is_public, type: Boolean, default: true
        end
        after_validation do
          element = Sample.find_by(id: params[:id])
          error!('401 No data found', 401) unless element

          element_policy = ElementPolicy.new(current_user, element)
          error!('401 Unauthorized', 401) unless element_policy.read? || User.reviewer_ids.include?(current_user.id)

          pub = Publication.find_by(element_type: 'Sample', element_id: params[:id])
          error!('401 No data found', 401) if pub.nil?
          error!('401 Unauthorized', 401) if (params[:is_public] == false && pub.state == 'completed')
        end
        get do
          sample = Sample.where(id: params[:id]).includes(:molecule, :tag).last
          review_sample = { **sample.serializable_hash.deep_symbolize_keys }
          review_sample[:segments] = sample.segments.present? ? Labimotion::SegmentEntity.represent(sample.segments) : []
          molecule = Molecule.find(sample.molecule_id) unless sample.nil?
          containers = Entities::ContainerEntity.represent(sample.container)
          publication = Publication.find_by(element_id: params[:id], element_type: 'Sample')
          review_info = repo_review_info(publication, current_user&.id, false)
          # preapproved = publication.review.dig('checklist', 'glr', 'status') == true
          # is_leader = publication.review.dig('reviewers')&.include?(current_user&.id)
          publication.review&.slice!('history') unless User.reviewer_ids.include?(current_user.id) || review_info[:groupleader] == true
          published_user = User.find(publication.published_by) unless publication.nil?
          literatures = get_literature(params[:id], 'Sample', params[:is_public] ? 'public' : 'detail')
          # embargo = PublicationCollections.where("(elobj ->> 'element_type')::text = 'Sample' and (elobj ->> 'element_id')::integer = #{sample.id}")&.first&.label
          embargo = find_embargo_collection(publication)
          review_sample[:embargo] = embargo&.label
          review_sample[:embargoId] = embargo&.id
          label_ids = sample.tag.taggable_data['user_labels'] || [] unless sample.tag.taggable_data.nil?
          user_labels = UserLabel.public_labels(label_ids) unless label_ids.nil?
          {
            molecule: MoleculeGuestSerializer.new(molecule).serializable_hash.deep_symbolize_keys,
            sample: review_sample,
            labels: user_labels,
            publication: publication,
            literatures: literatures,
            analyses: containers,
            selectEmbargo: Publication.find_by(element_type: 'Collection', element_id: embargo&.id),
            doi: Entities::DoiEntity.represent(sample.doi, serializable: true),
            pub_name: published_user&.name,
            review_info: review_info
          }
        end
      end

      resource :metadata do
        desc 'metadata of publication'
        params do
          requires :id, type: Integer, desc: 'Id'
          requires :type, type: String, desc: 'Type', values: %w[sample reaction]
        end
        after_validation do
          @root_publication = Publication.find_by(
            element_type: params['type'].classify,
            element_id: params['id']
          ).root
          error!('404 Publication not found', 404) unless @root_publication
          error!('401 Unauthorized', 401) unless User.reviewer_ids.include?(current_user.id) || @root_publication.published_by == current_user.id || @root_publication.review['reviewers'].include?(current_user.id)
        end
        post :preview do
          mt = []
          root_publication = @root_publication
          publications = [root_publication] + root_publication.descendants
          publications.each do |pub|
            mt.push(element_type: pub.element_type, metadata_xml: pub.datacite_metadata_xml)
          end
          { metadata: mt }
        end
        post :preview_zip do
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          root_publication = @root_publication
          publications = [root_publication] + root_publication.descendants
          filename = URI.escape("metadata_#{root_publication.element_type}_#{root_publication.element_id}-#{Time.new.strftime('%Y%m%d%H%M%S')}.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")
          zip = Zip::OutputStream.write_buffer do |zip|
            publications.each do |pub|
              el_type = pub.element_type == 'Container' ? 'analysis' : pub.element_type.downcase
              zip.put_next_entry URI.escape("metadata_#{el_type}_#{pub.element_id}.xml")
              zip.write pub.datacite_metadata_xml
            end
          end
          zip.rewind
          zip.read
        end
      end
      namespace :review_search_options do
        helpers do
          def query_submitter(element_type, state)
            if User.reviewer_ids.include?(current_user.id)
              state_sql = state == 'All' || state.empty? ? " state in ('pending', 'reviewed', 'accepted')" : ActiveRecord::Base.send(:sanitize_sql_array, [' state=? ', state])
              type_sql = element_type == 'All' || element_type.empty? ? " element_type in ('Sample', 'Reaction')" : ActiveRecord::Base.send(:sanitize_sql_array, [' element_type=? ', element_type.chop])
              search_scope = User.where(type: 'Person').where(
                <<~SQL
                  users.id in (
                    select published_by from publications pub where ancestry is null and deleted_at is null
                    and #{state_sql} and #{type_sql})
                SQL
              )
                                 .order('first_name ASC')
            else
              search_scope = User.where(id: current_user.id)
            end
            result = search_scope.select(
              <<~SQL
                id as key, first_name, last_name, first_name || chr(32) || last_name as name, first_name || chr(32) || last_name || chr(32) || '(' || name_abbreviation || ')' as label
              SQL
            )
          end

          def query_embargo
            search_scope = if User.reviewer_ids.include?(current_user.id)
                             Collection.where(
                               <<~SQL
                                 ancestry::integer in (select id from collections cx where label = 'Embargoed Publications')
                               SQL
                             )
                           else
                             Collection.where(ancestry: current_user.publication_embargo_collection.id)
                           end
            result = search_scope.select(
              <<~SQL
                id as key, label as name, label as label
              SQL
            )
                                 .order('label ASC')
          end
        end
        desc 'Find matched review values'
        params do
          requires :type, type: String, allow_blank: false, desc: 'Type', values: %w[All Submitter Embargo]
          optional :element_type, type: String, desc: 'Type', values: %w[All Samples Reactions]
          optional :state, type: String, desc: 'Type', values: %w[All reviewed accepted pending]
        end
        get do
          result = case params[:type]
                   when 'Submitter'
                     query_submitter(params[:element_type], params[:state])
                   when 'Embargo'
                     query_embargo
                   else
                     []
          end
          { result: result }
        end
      end

      namespace :reviewing do
        helpers do
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

          def save_comments(root, comment, checklist, reviewComments, action, his = true)
            review = root.review || {}
            review_history = review['history'] || []
            current = review_history.last || {}
            current['state'] = %w[accepted declined].include?(action) ? action : root.state
            current['action'] = action unless action.nil?
            current['username'] = current_user.name
            current['userid'] = current_user.id
            current['comment'] = comment unless comment.nil?
            current['type'] = root.state == Publication::STATE_PENDING ? 'reviewed' : 'submit'
            current['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')

            if review_history.length == 0
              review_history[0] = current
            else
              review_history[review_history.length - 1] = current
            end
            if his ## add next_node
              next_node = { action: 'revising', type: 'submit', state: 'reviewed' } if root.state == Publication::STATE_PENDING
              next_node = { action: 'reviewing', type: 'reviewed', state: 'pending' } if root.state == Publication::STATE_REVIEWED
              review_history << next_node
              review['history'] = review_history
            else

              # is_leader = review.dig('reviewers')&.include?(current_user&.id)
              if root.state == Publication::STATE_PENDING && (action.nil? || action == Publication::STATE_REVIEWED)
                next_node = { action: 'reviewing', type: 'reviewed', state: 'pending' }
                review_history << next_node
                review['history'] = review_history
              end
            end
            if checklist&.length&.positive?
              revst = review['checklist'] || {}
              checklist.each do |k, v|
                revst[k] = v['status'] == true ? { status: v['status'], user: current_user.name, updated_at: Time.now.strftime('%d-%m-%Y %H:%M:%S') } : { status: false } unless revst[k] && revst[k]['status'] == v['status']
              end
              review['checklist'] = revst
            end
            review['reviewComments'] = reviewComments if reviewComments.present?
            root.update!(review: review)
          end

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

        desc 'process reviewed publication'
        params do
          requires :id, type: Integer, desc: 'Id'
          requires :type, type: String, desc: 'Type', values: %w[sample reaction collection]
          optional :comments, type: Hash
          optional :comment, type: String
          optional :checklist, type: Hash
        end

        after_validation do
          @root_publication = Publication.find_by(
            element_type: params['type'].classify,
            element_id: params['id']
          ).root
          error!('401 Unauthorized', 401) unless (User.reviewer_ids.include?(current_user.id) && @root_publication.state == Publication::STATE_PENDING) || (@root_publication.review.dig('reviewers')&.include?(current_user&.id)) || (@root_publication.published_by == current_user.id && @root_publication.state == Publication::STATE_REVIEWED)

          embargo = find_embargo_collection(@root_publication) unless params['type'] == 'collection'
          @embargo_pub = embargo.publication if embargo.present?
        end

        post :comments do
          save_comments(@root_publication, params[:comment], params[:checklist], params[:reviewComments], nil, false)
          element = Entities::ReactionEntity.represent(@root_publication.element) if params[:type] == 'reaction'
          element = Entities::SampleEntity.represent(@root_publication.element) if params[:type] == 'sample'
          element = Entities::CollectionEntity.represent(@root_publication.element) if params[:type] == 'collection'

          review_info = repo_review_info(@root_publication, current_user&.id, false)
          his = @root_publication.review&.slice('history') unless User.reviewer_ids.include?(current_user.id) || @root_publication.review.dig('reviewers')&.include?(current_user.id)
          { "#{params[:type]}": element, review: his || @root_publication.review, review_info: review_info }
        end

        post :comment do
          save_comment(@root_publication, params[:comments]) unless params[:comments].nil?
          his = @root_publication.review&.slice('history') unless User.reviewer_ids.include?(current_user.id)
          { review: his || @root_publication.review }
        end

        post :reviewed do
          save_comments(@root_publication, params[:comment], params[:checklist], params[:reviewComments], 'review')
          # element_submit(@root_publication)
          @root_publication.update_state(Publication::STATE_REVIEWED)
          @root_publication.process_element(Publication::STATE_REVIEWED)
          @root_publication.inform_users(Publication::STATE_REVIEWED)
          # @root_publication.element
          @embargo_pub&.refresh_embargo_metadata
          element = Entities::ReactionEntity.represent(@root_publication.element) if params[:type] == 'reaction'
          element = Entities::SampleEntity.represent(@root_publication.element) if params[:type] == 'sample'
          review_info = repo_review_info(@root_publication, current_user&.id, false)
          { "#{params[:type]}": element, review: @root_publication.review, review_info: review_info }
        end

        post :submit do
          save_comments(@root_publication, params[:comment], params[:checklist], params[:reviewComments], 'revision')
          element_submit(@root_publication)
          @root_publication.update_state(Publication::STATE_PENDING)
          @root_publication.process_element(Publication::STATE_PENDING)
          @root_publication.inform_users(Publication::STATE_PENDING)
          @embargo_pub&.refresh_embargo_metadata
          element = Entities::ReactionEntity.represent(@root_publication.element) if params[:type] == 'reaction'
          element = Entities::SampleEntity.represent(@root_publication.element) if params[:type] == 'sample'
          his = @root_publication.review&.slice('history') unless User.reviewer_ids.include?(current_user.id) || @root_publication.review.dig('reviewers')&.include?(current_user.id)
          review_info = repo_review_info(@root_publication, current_user&.id, false)
          { "#{params[:type]}": element, review: his || @root_publication.review, review_info: review_info }
        end

        post :approved do
          approve_comments(@root_publication, params[:comment], params[:checklist], params[:reviewComments], 'approved', false)
          element = Entities::ReactionEntity.represent(@root_publication.element) if params[:type] == 'reaction'
          element = Entities::SampleEntity.represent(@root_publication.element) if params[:type] == 'sample'
          his = @root_publication.review&.slice('history') unless User.reviewer_ids.include?(current_user.id) || @root_publication.review.dig('reviewers')&.include?(current_user.id)
          review_info = repo_review_info(@root_publication, current_user&.id, false)
          { "#{params[:type]}": element, review: his || @root_publication.review, review_info: review_info }
        end

        post :accepted do
          save_comments(@root_publication, params[:comment], params[:checklist], params[:reviewComments], 'accepted', false)
          element_submit(@root_publication)
          public_literature(@root_publication)
          # element_accepted(@root_publication)
          @root_publication.update_state(Publication::STATE_ACCEPTED)
          @root_publication.process_element(Publication::STATE_ACCEPTED)
          @root_publication.inform_users(Publication::STATE_ACCEPTED)
          @embargo_pub&.refresh_embargo_metadata

          element = Entities::ReactionEntity.represent(@root_publication.element) if params[:type] == 'reaction'
          element = Entities::SampleEntity.represent(@root_publication.element) if params[:type] == 'sample'
          review_info = repo_review_info(@root_publication, current_user&.id, false)
          { "#{params[:type]}": element, review: @root_publication.review, message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off', review_info: review_info }
        end
        post :declined do
          save_comments(@root_publication, params[:comment], params[:checklist], params[:reviewComments], 'declined', false)
          @root_publication.update_state('declined')
          @root_publication.process_element('declined')

          ## TO BE HANDLED - remove from embargo collection
          @root_publication.inform_users(Publication::STATE_DECLINED, current_user.id)
          element = Entities::ReactionEntity.represent(@root_publication.element) if params[:type] == 'reaction'
          element = Entities::SampleEntity.represent(@root_publication.element) if params[:type] == 'sample'
          his = @root_publication.review&.slice('history') unless User.reviewer_ids.include?(current_user.id)
          { "#{params[:type]}": element, review: his || @root_publication.review }
        end
      end

      namespace :publishSample do
        desc 'Publish Samples with chosen Dataset'
        params do
          requires :sampleId, type: Integer, desc: 'Sample Id'
          requires :analysesIds, type: Array[Integer], desc: 'Selected analyses ids'
          optional :coauthors, type: Array[String], default: [], desc: 'Co-author (User)'
          optional :reviewers, type: Array[String], default: [], desc: 'reviewers (User)'
          optional :refs, type: Array[Integer], desc: 'Selected references'
          optional :embargo, type: Integer, desc: 'Embargo collection'
          requires :license, type: String, desc: 'Creative Common License'
          requires :addMe, type: Boolean, desc: 'add me as author'
        end

        after_validation do
          @sample = current_user.samples.find_by(id: params[:sampleId])
          @analyses = @sample&.analyses&.where(id: params[:analysesIds])
          @literals = Literal.where(id: params[:refs]) unless params[:refs].nil? || params[:refs].empty?
          ols_validation(@analyses)
          @author_ids = if params[:addMe]
                          [current_user.id] + coauthor_validation(params[:coauthors])
                        else
                          coauthor_validation(params[:coauthors])
                        end
          error!('401 Unauthorized', 401) unless @sample
          error!('404 analyses not found', 404) if @analyses.empty?
          @group_reviewers = coauthor_validation(params[:reviewers])
        end

        post do
          @license = params[:license]
          @publication_tag = create_publication_tag(current_user, @author_ids, @license)
          @embargo_collection = fetch_embargo_collection(params[:embargo], current_user) if params[:embargo].present? && params[:embargo] >= 0
          pub = prepare_sample_data
          pub.process_element
          update_tag_doi(pub.element)
          if col_pub = @embargo_collection&.publication
            col_pub.refresh_embargo_metadata
          end
          pub.inform_users

          @sample.reload
          detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: @sample).detail_levels
          {
            sample: Entities::SampleEntity.represent(@sample, detail_levels: detail_levels),
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end

        put :dois do
          @sample.reserve_suffix
          @sample.reserve_suffix_analyses(@analyses)
          @sample.reload
          @sample.tag_reserved_suffix(@analyses)
          ## { sample: SampleSerializer.new(@sample).serializable_hash.deep_symbolize_keys }
          present @samples, with: Entities::SampleEntity, root: :sample
        end
      end

      # desc: submit reaction data for publication
      namespace :publishReaction do
        desc 'Publish Reaction with chosen Dataset'
        params do
          requires :reactionId, type: Integer, desc: 'Reaction Id'
          requires :analysesIds, type: Array[Integer], desc: 'Selected analyses ids'
          optional :coauthors, type: Array[String], default: [], desc: 'Co-author (User)'
          optional :reviewers, type: Array[String], default: [], desc: 'reviewers (User)'
          optional :refs, type: Array[Integer], desc: 'Selected references'
          optional :embargo, type: Integer, desc: 'Embargo collection'
          requires :license, type: String, desc: 'Creative Common License'
          requires :addMe, type: Boolean, desc: 'add me as author'
        end

        after_validation do
          @scheme_only = false
          @reaction = current_user.reactions.find_by(id: params[:reactionId])
          error!('404 found no reaction to publish', 404) unless @reaction
          @analysis_set = @reaction.analyses.where(id: params[:analysesIds]) | Container.where(id: (@reaction.samples.map(&:analyses).flatten.map(&:id) & params[:analysesIds]))
          ols_validation(@analysis_set)
          @author_ids = if params[:addMe]
                          [current_user.id] + coauthor_validation(params[:coauthors])
                        else
                          coauthor_validation(params[:coauthors])
                        end
          error!('404 found no analysis to publish', 404) unless @analysis_set.present?

          @group_reviewers = coauthor_validation(params[:reviewers])
          # error!('Reaction Publication not authorized', 401)
          @analysis_set_ids = @analysis_set.map(&:id)
          @literals = Literal.where(id: params[:refs]) unless params[:refs].nil? || params[:refs].empty?
        end

        post do
          @license = params[:license]
          @publication_tag = create_publication_tag(current_user, @author_ids, @license)
          @embargo_collection = fetch_embargo_collection(params[:embargo], current_user) if params[:embargo].present? && params[:embargo] >= 0
          pub = prepare_reaction_data
          pub.process_element
          update_tag_doi(pub.element)
          if col_pub = @embargo_collection&.publication
            col_pub.refresh_embargo_metadata
          end
          pub.inform_users

          @reaction.reload
          {
            reaction: Entities::ReactionEntity.represent(@reaction, serializable: true),
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end

        put :dois do
          reaction_products = @reaction.products.select { |s| s.analyses.select { |a| a.id.in? @analysis_set_ids }.count > 0 }
          @reaction.reserve_suffix
          reaction_products.each do |p|
            d = p.reserve_suffix
            et = p.tag
            et.update!(
              taggable_data: (et.taggable_data || {}).merge(reserved_doi: d.full_doi)
            )
          end
          @reaction.reserve_suffix_analyses(@analysis_set)
          @reaction.reload
          @reaction.tag_reserved_suffix(@analysis_set)
          @reaction.reload
          {
            reaction: Entities::ReactionEntity.represent(@reaction, serializable: true),
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end
      end

      namespace :save_repo_authors do
        desc 'Save REPO authors'
        params do
          requires :elementId, type: Integer, desc: 'Element Id'
          requires :elementType, type: String, desc: 'Element Type'
          requires :taggData, type: Hash do
            requires :creators, type: Array[Hash]
            requires :affiliations, type: Hash
            requires :contributors, type: Hash
          end
        end

        after_validation do
          unless User.reviewer_ids.include?(current_user.id)
            @pub = Publication.find_by(element_id: params[:elementId], element_type: params[:elementType], published_by: current_user.id)
            error!('404 No publication found', 404) unless @pub
          end
        end

        post do
          pub = Publication.find_by(element_id: params[:elementId], element_type: params[:elementType])
          declared_params = declared(params, include_missing: false)

          et = ElementTag.find_or_create_by(taggable_id: declared_params[:elementId], taggable_type: declared_params[:elementType])
          tagg_data = declared_params[:taggData] || {}

          tagg_data['author_ids'] = tagg_data['creators']&.map { |cr| cr['id'] }
          tagg_data['affiliation_ids'] = tagg_data['creators']&.map { |cr| cr['affiliationIds'] }.flatten.uniq
          tagg_data['affiliations'] = tagg_data['affiliations']&.select { |k, _| tagg_data['affiliation_ids'].include?(k.to_i) }

          pub_taggable_data = pub.taggable_data || {}
          pub_taggable_data = pub_taggable_data.deep_merge(tagg_data || {})
          pub.update(taggable_data: pub_taggable_data)

          et_taggable_data = et.taggable_data || {}
          pub_tag = et_taggable_data['publication'] || {}
          pub_tag = pub_tag.deep_merge(tagg_data || {})
          et_taggable_data['publication'] = pub_tag
          et.update(taggable_data: et_taggable_data)
        end
      end

      # desc: submit reaction data (scheme only) for publication
      namespace :publishReactionScheme do
        desc 'Publish Reaction Scheme only'
        params do
          requires :reactionId, type: Integer, desc: 'Reaction Id'
          requires :temperature, type: Hash, desc: 'Temperature'
          requires :duration, type: Hash, desc: 'Duration'
          requires :products, type: Array, desc: 'Products'
          optional :coauthors, type: Array[String], default: [], desc: 'Co-author (User)'
          optional :embargo, type: Integer, desc: 'Embargo collection'
          requires :license, type: String, desc: 'Creative Common License'
          requires :addMe, type: Boolean, desc: 'add me as author'
          requires :schemeDesc, type: Boolean, desc: 'publish scheme'
        end

        after_validation do
          @reaction = current_user.reactions.find_by(id: params[:reactionId])
          @scheme_only = true
          error!('404 found no reaction to publish', 404) unless @reaction
          schemeYield = params[:products]&.map { |v| v.slice(:id, :_equivalent) }
          @reaction.reactions_samples.select { |rs| rs.type == 'ReactionsProductSample' }.map do |p|
            py = schemeYield.select { |o| o['id'] == p.sample_id }
            p.equivalent = py[0]['_equivalent'] if py && !py.empty?
            p.scheme_yield = py[0]['_equivalent'] if py && !py.empty?
          end

          @reaction.reactions_samples.select{ |rs| rs.type != 'ReactionsProductSample' }.map do |p|
            p.equivalent = 0
          end
          @reaction.name = ''
          @reaction.purification = '{}'
          @reaction.dangerous_products = '{}'
          @reaction.description = { 'ops' => [{ 'insert' => '' }] } unless params[:schemeDesc]
          @reaction.observation = { 'ops' => [{ 'insert' => '' }] }
          @reaction.tlc_solvents = ''
          @reaction.tlc_description = ''
          @reaction.rf_value = 0
          @reaction.rxno = nil
          @reaction.role = ''
          @reaction.temperature = params[:temperature]
          @reaction.duration = "#{params[:duration][:dispValue]} #{params[:duration][:dispUnit]}" unless params[:duration].nil?
          @author_ids = if params[:addMe]
                          [current_user.id] + coauthor_validation(params[:coauthors])
                        else
                          coauthor_validation(params[:coauthors])
                        end
        end

        post do
          @license = params[:license]
          @publication_tag = create_publication_tag(current_user, @author_ids, @license)
          @embargo_collection = fetch_embargo_collection(params[:embargo], current_user) if params[:embargo].present? && params[:embargo] >= 0
          pub = prepare_reaction_data
          pub.process_element
          pub.inform_users

          @reaction.reload
          {
            reaction: Entities::ReactionEntity.represent(@reaction, serializable: true),
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end
      end

      namespace :embargo do
        helpers do
          def handle_embargo_collections(col)
            col.update_columns(ancestry: current_user.published_collection.id)
            sync_emb_col = col.sync_collections_users.where(user_id: current_user.id)&.first
            sync_published_col = SyncCollectionsUser.joins("INNER JOIN collections ON collections.id = sync_collections_users.collection_id ")
                                                    .where("collections.label='Published Elements'")
                                                    .where("sync_collections_users.user_id = #{current_user.id}").first
            sync_emb_col.update_columns(fake_ancestry: sync_published_col.id)
          end

          def remove_anonymous(col)
            anonymous_ids = col.sync_collections_users.joins("INNER JOIN users on sync_collections_users.user_id = users.id")
            .where("users.type='Anonymous'").pluck(:user_id)
            anonymous_ids.each do |anonymous_id|
              anonymous = Anonymous.find(anonymous_id)
              anonymous.sync_in_collections_users.destroy_all
              anonymous.collections.each { |c| c.really_destroy! }
              anonymous.really_destroy!
            end
          end

          def remove_embargo_collection(col)
            col&.publication.really_destroy!
            col.sync_collections_users.destroy_all
            col.really_destroy!
          end

        end
        desc 'Generate account with chosen Embargo'
        params do
          requires :collection_id, type: Integer, desc: 'Embargo Collection Id'
        end

        after_validation do
          @embargo_collection = Collection.find_by(id: params[:collection_id])
          error!('404 collection not found', 404) unless @embargo_collection
          unless User.reviewer_ids.include?(current_user.id)
            @sync_emb_col = @embargo_collection.sync_collections_users.where(user_id: current_user.id)&.first
            error!('404 found no collection', 404) unless @sync_emb_col
          end
        end

        get :list do
          sample_list = Publication.where(ancestry: nil, element: @embargo_collection.samples).order(updated_at: :desc)
          reaction_list = Publication.where(ancestry: nil, element: @embargo_collection.reactions).order(updated_at: :desc)
          list = sample_list + reaction_list
          elements = []
          list.each do |e|
            element_type = e.element&.class&.name
            u = User.find(e.published_by) unless e.published_by.nil?
            svg_file = e.element.sample_svg_file if element_type == 'Sample'
            title = e.element.short_label if element_type == 'Sample'

            svg_file = e.element.reaction_svg_file if element_type == 'Reaction'
            title = e.element.short_label if element_type == 'Reaction'

            scheme_only = element_type == 'Reaction' && e.taggable_data && e.taggable_data['scheme_only']
            elements.push(
              id: e.element_id, svg: svg_file, type: element_type, title: title,
              published_by: u&.name, submit_at: e.created_at, state: e.state, scheme_only: scheme_only
            )
          end
          { elements: elements, embargo_id: params[:collection_id], current_user: { id: current_user.id, type: current_user.type } }
        end

        post :account do
          begin
            # create Anonymous user
            name_abbreviation = "e#{SecureRandom.random_number(9999)}"
            email = "#{@embargo_collection.id}.#{name_abbreviation}@chemotion.net"
            pwd = Devise.friendly_token.first(8)
            first_name = 'External'
            last_name = 'Chemotion'
            type = 'Anonymous'

            params = { email: email, password: pwd, first_name: first_name, last_name: last_name, type: type, name_abbreviation: name_abbreviation, confirmed_at: Time.now }
            new_obj = User.create!(params)
            new_obj.profile.update!({data: {}})
            # sync collection with Anonymous user
            chemotion_user = User.chemotion_user
            root_label = 'with %s' %chemotion_user.name_abbreviation
            rc = Collection.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, is_locked: true, is_shared: true, label: root_label)

            # Chemotion Collection
            SyncCollectionsUser.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, collection_id: Collection.public_collection_id,
            permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)


            SyncCollectionsUser.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, collection_id: @embargo_collection.id,
            permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)

            # send mail
            if ENV['PUBLISH_MODE'] == 'production'
              PublicationMailer.mail_external_review(current_user, @embargo_collection.label, email, pwd).deliver_now
            end

            { message: 'A temporary account has been created' }
          rescue StandardError => e
            { error: e.message }
          end
        end

        post :release do
          begin
            col_pub = @embargo_collection.publication
            if col_pub.nil? ||  col_pub.published_by != current_user.id
              { error: "only the owner of embargo #{@embargo_collection.label} can perform the release."}
            else
              col_pub.update(accepted_at: Time.now.utc)
              col_pub.refresh_embargo_metadata
              pub_samples = Publication.where(ancestry: nil, element: @embargo_collection.samples).order(updated_at: :desc)
              pub_reactions = Publication.where(ancestry: nil, element: @embargo_collection.reactions).order(updated_at: :desc)
              pub_list = pub_samples + pub_reactions

              check_state = pub_list.select { |pub| pub.state != Publication::STATE_ACCEPTED }
              if check_state.present?
                { error: "Embargo #{@embargo_collection.label} release failed, because not all elements have been 'accepted'."}
              else
                scheme_only_list = pub_list.select { |pub| pub.taggable_data['scheme_only']  == true }
                if pub_list.flatten.length == scheme_only_list.flatten.length
                  col_pub.update(state: 'scheme_only')
                else
                  col_pub.update(state: 'accepted')
                end

                pub_list.each { |pub| element_submit(pub) }
                remove_anonymous(@embargo_collection)
                handle_embargo_collections(@embargo_collection)
                case ENV['PUBLISH_MODE']
                when 'production'
                  if Rails.env.production?
                    ChemotionEmbargoPubchemJob.set(queue: "publishing_embargo_#{@embargo_collection.id}").perform_later(@embargo_collection.id)
                  end
                when 'staging'
                  ChemotionEmbargoPubchemJob.perform_now(@embargo_collection.id)
                else 'development'
                end


                { message: "Embargo #{@embargo_collection.label} has been released" }
              end
            end
          rescue StandardError => e
            { error: e.message }
          end
        end

        post :delete do
          begin
            element_cnt = @embargo_collection.samples.count + @embargo_collection.reactions.count
            if element_cnt.positive?
              { error: "Delete Embargo #{@embargo_collection.label} deletion failed: the collection is not empty. Please refresh your page."}
            else
              remove_anonymous(@embargo_collection)
              remove_embargo_collection(@embargo_collection)
              { message: "Embargo #{@embargo_collection.label} has been deleted" }
            end
          rescue StandardError => e
            { error: e.message }
          end
        end

        post :refresh do
          col_pub = @embargo_collection.publication
          col_pub&.refresh_embargo_metadata
          col_pub
        end

        post :move do
          begin
            # @new_embargo = params[:new_embargo]
            @element = params[:element]
            @new_embargo_collection = fetch_embargo_collection(params[:new_embargo]&.to_i, current_user) if params[:new_embargo].present? && params[:new_embargo]&.to_i >= 0
            case @element['type']
            when 'Sample'
              CollectionsSample
            when 'Reaction'
              CollectionsReaction
            end.remove_in_collection(@element['id'], [@embargo_collection.id])

            case @element['type']
            when 'Sample'
              CollectionsSample
            when 'Reaction'
              CollectionsReaction
            end.create_in_collection(@element['id'], [@new_embargo_collection.id])

            @embargo_collection&.publication&.refresh_embargo_metadata
            @new_embargo_collection&.publication&.refresh_embargo_metadata

            { col_id: @embargo_collection.id,
              new_embargo: @new_embargo_collection.publication,
              is_new_embargo: params[:new_embargo]&.to_i == 0,
              message: "#{@element['type']} [#{@element['title']}] has been moved from Embargo Bundle [#{@embargo_collection.label}] to Embargo Bundle [#{@new_embargo_collection.label}]" }
          rescue StandardError => e
            { error: e.message }
          end
        end
      end
    end
  end
end
