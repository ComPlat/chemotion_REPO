# frozen_string_literal: true

require 'securerandom'
module Chemotion
  # Repository API
  class RepositoryAPI < Grape::API
    include Grape::Kaminari
    helpers RepoParamsHelpers
    helpers RepositoryHelpers

    namespace :repository do
      before do
        error!('404 user not found', 404) unless current_user
      end

      after_validation do
        @is_reviewer = User.reviewer_ids.include?(current_user.id)
        @is_embargo_viewer = User.embargo_viewer_ids.include?(current_user.id)
      end

      namespace :review_list do
        helpers ReviewHelpers
        desc 'Get review list'
        params do
          use :get_review_list_params
        end
        before do
        end
        paginate per_page: 10, offset: 0, max_per_page: 100
        get do
          get_review_list(params, current_user, @is_reviewer)
        end
      end

      ## Get embargo selection list for submission
      namespace :embargo_list do
        helpers EmbargoHelpers
        desc 'Get embargo list'
        params do
          optional :is_submit, type: Boolean, default: false, desc: 'Publication submission'
        end
        before do
        end
        get do
          embargo_select_list(params[:is_submit], current_user, @is_reviewer, @is_embargo_viewer)
        end
      end

      namespace :assign_embargo do
        helpers EmbargoHelpers
        desc 'assign to an embargo bundle'
        params do
          use :assign_embargo_params
        end
        after_validation do
          declared_params = declared(params, include_missing: false)
          @element = declared_params[:element]
          @embargo_id = declared_params[:new_embargo]
          pub = Publication.find_by(element_type: @element['type'], element_id: @element['id'])
          error!('404 Publication not found', 404) unless pub
          error!("404 Publication state must be #{Publication::STATE_REVIEWED}", 404) unless pub.state == Publication::STATE_REVIEWED
          error!('401 Unauthorized', 401) unless pub.published_by == current_user.id
          if @embargo_id.to_i.positive?
            e_col = Collection.find(@embargo_id.to_i)
            error!('404 This embargo has been released.', 404) unless e_col.ancestry.to_i == current_user.publication_embargo_collection.id
          end
        end
        post do
          embargo = Repo::EmbargoHandler.find_or_create_embargo(@embargo_id.to_i, current_user) if @embargo_id.to_i >= 0
          assign_embargo(@element, embargo, current_user, @embargo_id.to_i.zero?)
        rescue StandardError => e
          { error: e.message }
        end
      end

      ## TO BE CHECKED
      resource :compound do
        # helpers RepositoryHelpers
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
            update_compound(@pub, params, current_user)
          end
        end
      end

      resource :comment do
        # helpers RepositoryHelpers
        desc 'Publication comment (public)'
        params do
          requires :id, type: Integer, desc: 'Element id'
          optional :type, type: String, values: %w[Reaction Sample Container Collection]   ### TO BE CHECKED (Collection)
          requires :pageId, type: Integer, desc: 'Page Element id'
          optional :pageType, type: String, values: %w[reactions molecules]
          optional :comment, type: String
        end
        after_validation do
          @pub = Publication.find_by(element_type: params[:type], element_id: params[:id])
          error!('404 No data found', 404) unless @pub

          element_check = params[:type] == 'Container' ? @pub.root.element : @pub.element
          element_policy = ElementPolicy.new(current_user, element_check)
          error!('401 Unauthorized', 401) unless element_policy.read? || User.reviewer_ids.include?(current_user.id)
        end
        post 'user_comment' do
          PublicationMailer.mail_user_comment(current_user, params[:id], params[:type], params[:pageId], params[:pageType], params[:comment]).deliver_now
        end
        post 'reviewer' do
          update_public_comment(params, current_user)
        end
      end

      resource :reaction do
        helpers ReviewHelpers
        desc 'Return Reviewing serialized reaction'
        params do
          requires :id, type: Integer, desc: 'Reaction id'
        end
        after_validation do
          @reaction = Reaction.find_by(id: params[:id])
          error!('404 No data found', 404) unless @reaction

          element_policy = ElementPolicy.new(current_user, @reaction)
          error!('401 Unauthorized', 401) unless element_policy.read? || User.reviewer_ids.include?(current_user.id)

          @publication = @reaction.publication
          error!('404 No data found', 404) if @publication.nil?

          error!('401 The submission has been published', 401) if @publication.state == 'completed'
        end
        get do
          fetch_reviewing_reaction(@reaction, @publication, current_user)
        end
      end

      resource :sample do
        helpers ReviewHelpers
        desc 'Return Review serialized Sample'
        params do
          requires :id, type: Integer, desc: 'Sample id'
        end
        after_validation do
          @sample = Sample.find_by(id: params[:id])
          error!('401 No data found', 401) unless @sample

          element_policy = ElementPolicy.new(current_user, @sample)
          error!('401 Unauthorized', 401) unless element_policy.read? || User.reviewer_ids.include?(current_user.id)

          @publication = @sample.publication
          error!('401 No data found', 401) if @publication.nil?
          error!('401 The submission has been published', 401) if @publication.state == 'completed'
        end
        get do
          fetch_reviewing_sample(@sample, @publication, current_user)
        end
      end

      resource :metadata do
        # helpers RepositoryHelpers
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
          error!('401 Unauthorized', 401) unless User.reviewer_ids.include?(current_user.id) || @root_publication.published_by == current_user.id || (@root_publication.review['reviewers'] && @root_publication.review['reviewers'].include?(current_user.id))
        end
        post :preview do
          metadata_preview(@root_publication, current_user)
        end
        post :preview_zip do
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          metadata_preview_zip(@root_publication, current_user)
        end
      end

      namespace :review_search_options do
        helpers ReviewHelpers
        desc 'Find matched review values'
        params do
          requires :type, type: String, allow_blank: false, desc: 'Type', values: %w[All Submitter Embargo]
          optional :element_type, type: String, desc: 'Type', values: %w[All Samples Reactions]
          optional :state, type: String, desc: 'Type', values: %w[All reviewed accepted pending]
        end
        get do
          review_advanced_search(params, current_user)
        end
      end

      # desc: submit sample data for publication
      namespace :publishSample do
        helpers SubmissionHelpers
        desc 'Publish Samples with chosen Dataset'
        params do
          use :publish_sample_params
        end
        after_validation do
          @sample = current_user.samples.find_by(id: params[:id])
          error!('You do not have permission to publish this sample', 403) unless @sample

          @analyses = @sample&.analyses&.where(id: params[:analysesIds])
          ols_validation(@analyses)
          error!('No analysis data available for publication', 404) if @analyses.empty?

          @author_ids = if params[:addMe]
                          [current_user.id] + coauthor_validation(params[:coauthors])
                        else
                          coauthor_validation(params[:coauthors])
                        end
          @author_ids |= current_user.group_leads.pluck(:id) if params[:addGroupLead]
        end
        post do
          declared_params = declared(params, include_missing: false)
          SubmittingJob.send(perform_method, declared_params, 'Sample', @author_ids, current_user.id)
          send_message_and_tag(@sample, current_user)
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
        helpers SubmissionHelpers
        desc 'Publish Reaction with chosen Dataset'
        params do
          use :publish_reaction_params
        end
        after_validation do
          @reaction = current_user.reactions.find_by(id: params[:id])
          error!('You do not have permission to publish this reaction', 404) unless @reaction

          @analysis_set = @reaction.analyses.where(id: params[:analysesIds]) | Container.where(id: (@reaction.samples.map(&:analyses).flatten.map(&:id) & params[:analysesIds]))
          ols_validation(@analysis_set)
          error!('No analysis data available for publication', 404) unless @analysis_set.present?

          @author_ids = if params[:addMe]
                          [current_user.id] + coauthor_validation(params[:coauthors])
                        else
                          coauthor_validation(params[:coauthors])
                        end
          @author_ids |= current_user.group_leads.pluck(:id) if params[:addGroupLead]
        end
        post do
          declared_params = declared(params, include_missing: false)
          declared_params[:scheme_only] = false
          SubmittingJob.send(perform_method, declared_params, 'Reaction', @author_ids, current_user.id)
          send_message_and_tag(@reaction, current_user)
        end

        put :dois do
          analysis_set_ids = @analysis_set&.map(&:id)
          reserve_reaction_dois(@reaction, @analysis_set, analysis_set_ids)
        end
      end

      # desc: submit reaction data (scheme only) for publication
      namespace :publishReactionScheme do
        helpers SubmissionHelpers
        desc 'Publish Reaction Scheme only'
        params do
          use :publish_reaction_scheme_params
        end
        after_validation do
          @reaction = current_user.reactions.find_by(id: params[:id])
          error!('You do not have permission to publish this reaction', 404) unless @reaction

          @author_ids = if params[:addMe]
            [current_user.id] + coauthor_validation(params[:coauthors])
          else
            coauthor_validation(params[:coauthors])
          end
        end
        post do
          declared_params = declared(params, include_missing: false)
          declared_params[:scheme_only] = true
          SubmittingJob.send(perform_method, declared_params, 'Reaction', @author_ids, current_user.id)
          send_message_and_tag(@reaction, current_user)
        end
      end
      namespace :reviewing do
        helpers ReviewHelpers
        helpers RepoCommentHelpers

        desc 'process reviewed publication'
        params do
          use :reviewing_params
        end

        helpers do
          def process_review(action)
            Repo::ReviewProcess.new(params, current_user.id, action).process
          end

          def extract_action
            env['api.endpoint'].routes.first.pattern.origin[/[^\/]+$/]
          end
        end

        before do
          @root_publication = Publication.find_by(element_type: params['type'].classify,element_id: params['id']).root
          reviewer_auth = User.reviewer_ids.include?(current_user.id) && @root_publication.state == Publication::STATE_PENDING
          grouplead_auth = @root_publication.review&.dig('reviewers')&.include?(current_user&.id) && @root_publication.state == Publication::STATE_PENDING
          submitter_auth = (@root_publication.published_by == current_user.id || @root_publication.review&.dig('submitters')&.include?(current_user&.id)) && @root_publication.state == Publication::STATE_REVIEWED
          error!('Unauthorized. The operation cannot proceed.', 401) unless reviewer_auth || grouplead_auth || submitter_auth
        end

        post :comment do
          process_review(extract_action)
        end

        post :comments do
          process_review(extract_action)
        end

        post :reviewed do
          process_review(extract_action)
        end

        post :submit do
          process_review(extract_action)
        end

        post :approved do
          process_review(extract_action)
        end

        post :accepted do
          process_review(extract_action)
        end

        post :declined do
          process_review(extract_action)
        end
      end

      namespace :save_repo_authors do
        helpers ReviewHelpers
        desc 'Save REPO authors'
        params do
          use :save_repo_authors_params
        end

        after_validation do
          if User.reviewer_ids.include?(current_user.id)
            @pub = Publication.find_by(element_id: params[:elementId], element_type: params[:elementType])
          else
            @pub = Publication.find_by(element_id: params[:elementId], element_type: params[:elementType], published_by: current_user.id)
          end
          if @pub.nil?
            pub_tmp = Publication.find_by(element_id: params[:elementId], element_type: params[:elementType])
            if pub_tmp&.review&.dig('submitters')&.include?(current_user.id)
              @pub = pub_tmp
            end
          end
          error!('404 No publication found', 404) unless @pub
        end

        post do
          save_repo_authors(params, @pub, current_user)
        end
      end

      namespace :save_repo_labels do
        helpers UserLabelHelpers
        desc 'Save REPO user labels'
        params do
          use :save_repo_labels_params
        end
        after_validation do
          if @is_reviewer
            @publication = Publication.find_by(element_id: params[:elementId], element_type: params[:elementType])
          else
            @publication = Publication.find_by(element_id: params[:elementId], element_type: params[:elementType], published_by: current_user.id)
          end
          error!('404 No publication found', 404) unless @publication
        end
        post do
          element = @publication.element
          update_element_labels(@publication.element, params[:user_labels], current_user.id)
        end
      end

      namespace :embargo do
        helpers EmbargoHelpers
        desc 'Generate account with chosen Embargo'
        params do
          requires :collection_id, type: Integer, desc: 'Embargo Collection Id'
        end

        after_validation do
          @embargo_collection = Collection.find_by(id: params[:collection_id])
          error!('Collection not found', 404) unless @embargo_collection

          unless User.reviewer_ids.include?(current_user.id)
            @sync_emb_col = @embargo_collection.sync_collections_users.where(user_id: current_user.id)&.first
            error!('Collection not found!', 404) unless @sync_emb_col
          end
        end

        get :list do
          embargo_list(@embargo_collection, current_user)
        end

        post :account do
          create_anonymous_user(@embargo_collection, current_user)
        end

        post :release do
          Repo::EmbargoHandler.release_embargo(@embargo_collection.id, current_user.id)
        end

        post :delete do
          Repo::EmbargoHandler.delete(@embargo_collection.id, current_user.id)
        end

        post :refresh do
          col_pub = @embargo_collection.publication
          col_pub&.refresh_embargo_metadata
          col_pub
        end

        post :move do
          begin
            move_embargo(@embargo_collection, params, current_user)
          rescue StandardError => e
            { error: e.message }
          end
        end
      end
    end
  end
end
