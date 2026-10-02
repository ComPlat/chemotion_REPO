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
            error!('404 This embargo has been released.', 404) unless e_col.parent_id == current_user.publication_embargo_collection&.id
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

      # desc: create a minimal sample from the public welcome-page "New Entry" form
      # and drop it into the review pipeline so reviewers can see it.
      namespace :quickEntry do
        helpers RepositoryHelpers
        helpers SubmissionHelpers
        desc 'Create a minimum sample and send it for review via Quick Entry'
        params do
          optional :name, type: String, default: '', desc: 'Sample name'
          optional :molfile, type: String, desc: 'Molfile (preferred over smiles)'
          optional :smiles, type: String, desc: 'SMILES string (used if molfile is blank)'
          optional :target_amount_value, type: Float, default: 0.0, desc: 'Target amount value'
          optional :target_amount_unit, type: String, default: 'g', desc: 'Target amount unit (e.g. g, mg, mol)'
          optional :purity, type: Float, default: 1.0, desc: 'Purity (0..1)'
          optional :description, type: String, default: '', desc: 'Free-text description'
          optional :external_label, type: String, default: '', desc: 'External label'
          optional :melting_point_lowerbound, type: Float, desc: 'Lower bound of melting point (°C)'
          optional :melting_point_upperbound, type: Float, desc: 'Upper bound of melting point (°C)'
          optional :boiling_point_lowerbound, type: Float, desc: 'Lower bound of boiling point (°C)'
          optional :boiling_point_upperbound, type: Float, desc: 'Upper bound of boiling point (°C)'
          optional :license, type: String, default: 'CC BY-SA', desc: 'Creative Commons License'
          optional :orcid, type: String, desc: 'Author ORCID iD'
          optional :coauthors, type: Array[String], default: [], desc: 'Collaborator user IDs to add as co-authors'
          optional :reviewers, type: Array[String], default: [], desc: 'Collaborator user IDs to add as additional reviewers'
          optional :add_group_lead, type: Boolean, default: false, desc: 'Also include current user group leads as authors'
          optional :analyses_meta, type: String, desc: 'JSON-encoded analysis entries: [{name, type, instrument, content, file_count}]'
          optional :analyses, type: Array[File], desc: 'Analytical files, flat order matching analyses_meta file_counts'
          optional :references_meta, type: String, desc: 'JSON-encoded reference entries: [{title, doi, url, isbn, litype}]'
        end
        post do
          missing_structure = params[:molfile].blank? && params[:smiles].blank?
          error!('400 Provide either molfile or smiles', 400) if missing_structure

          if params[:orcid].present?
            orcid_val = params[:orcid].strip
            error!('400 Invalid ORCID format', 400) unless orcid_val.match?(/\A\d{4}-\d{4}-\d{4}-\d{3}[0-9X]\z/)
            providers = current_user.providers || {}
            if providers['orcid'] != orcid_val
              providers['orcid'] = orcid_val
              current_user.update!(providers: providers)
            end
          end

          coauthor_ids = coauthor_validation(params[:coauthors]) || []
          reviewer_ids = coauthor_validation(params[:reviewers]) || []

          references = []
          if params[:references_meta].present?
            begin
              references = Array(JSON.parse(params[:references_meta]))
            rescue JSON::ParserError
              error!('400 Invalid references_meta JSON', 400)
            end
            references.each_with_index do |ref, idx|
              next if [ref['title'], ref['doi'], ref['url'], ref['isbn']].any? { |v| v.to_s.strip.present? }

              error!("400 Reference ##{idx + 1}: provide at least a title, DOI, URL, or ISBN", 400)
            end
          end

          entries = []
          if params[:analyses_meta].present?
            begin
              parsed = JSON.parse(params[:analyses_meta])
              entries = Array(parsed)
            rescue JSON::ParserError
              error!('400 Invalid analyses_meta JSON', 400)
            end
          end

          uploaded_files = Array(params[:analyses]).select { |f| f.is_a?(Hash) && f[:tempfile] }
          if entries.empty? && uploaded_files.any?
            entries = uploaded_files.map do |file|
              { 'name' => File.basename(file[:filename].to_s, '.*'), 'file_count' => 1 }
            end
          end

          error!('400 At least one analysis is required', 400) if entries.empty?
          entries.each_with_index do |entry, idx|
            kind = entry['type'].to_s
            error!("400 Analysis ##{idx + 1}: please select an analysis type", 400) unless kind.match?(/\A\w{3,4}:\d{6,7}\s\|\s\w+/)
            error!("400 Analysis ##{idx + 1}: instrument is required", 400) if entry['instrument'].to_s.strip.empty?
            content_value = entry['content']
            content_text = if content_value.is_a?(Hash) && content_value['ops']
                             Array(content_value['ops']).map { |op| op['insert'].to_s }.join
                           else
                             content_value.to_s
                           end
            error!("400 Analysis ##{idx + 1}: content is required", 400) if content_text.strip.empty?
            error!("400 Analysis ##{idx + 1}: please attach at least one file", 400) if entry['file_count'].to_i < 1
          end

          staging_dir = nil
          analysis_entries = []
          if entries.any?
            staging_dir = Rails.root.join('tmp', 'quick_entry', SecureRandom.hex(12))
            FileUtils.mkdir_p(staging_dir)
            file_cursor = 0
            entries.each_with_index do |entry, idx|
              file_count = entry['file_count'].to_i
              entry_files = uploaded_files.slice(file_cursor, file_count) || []
              file_cursor += file_count

              staged = entry_files.map do |file|
                safe_name = "#{SecureRandom.hex(6)}_#{File.basename(file[:filename].to_s)}"
                dest = staging_dir.join(safe_name)
                FileUtils.cp(file[:tempfile].path, dest)
                {
                  filename: file[:filename],
                  path: dest.to_s,
                  content_type: file[:type],
                }
              end

              analysis_entries << {
                name: entry['name'].to_s,
                type: entry['type'].to_s,
                instrument: entry['instrument'].to_s,
                content: entry['content'],
                files: staged,
              }
            end
          end

          job_payload = {
            user_id: current_user.id,
            name: params[:name],
            external_label: params[:external_label].to_s,
            target_amount_value: params[:target_amount_value],
            target_amount_unit: params[:target_amount_unit],
            purity: params[:purity],
            description: params[:description].to_s,
            molfile: params[:molfile],
            smiles: params[:smiles],
            melting_point_lowerbound: params[:melting_point_lowerbound],
            melting_point_upperbound: params[:melting_point_upperbound],
            boiling_point_lowerbound: params[:boiling_point_lowerbound],
            boiling_point_upperbound: params[:boiling_point_upperbound],
            license: params[:license],
            coauthor_ids: coauthor_ids,
            reviewer_ids: reviewer_ids,
            add_group_lead: params[:add_group_lead] ? true : false,
            analysis_entries: analysis_entries,
            references: references,
            staging_dir: staging_dir&.to_s,
          }

          QuickEntrySubmissionJob.send(perform_method, job_payload)

          { status: 'queued', creation_source: 'quick_entry' }
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
          @sample = current_user.versions_collection.samples.find_by(id: params[:id]) unless @sample
          error!('You do not have permission to publish this sample', 403) unless @sample

          analyses = @sample&.analyses&.where(id: params[:analysesIds])
          links = @sample&.links&.where(id: params[:analysesIds])

          # To fix issue: Relation passed to #or must be structurally compatible. Incompatible values: [:joins]
          # Use Ruby Merge instead of ActiveRecord #or (Limitation: Performance, Sorting, DB Query Optimization)
          @analyses = (analyses.to_a + links.to_a).uniq # Avoid duplication
          ols_validation(@analyses)
          error!('No analysis data available for publication', 404) if @analyses.empty?

          @author_ids = if params[:addMe]
                          [current_user.id] + coauthor_validation(params[:coauthors])
                        else
                          coauthor_validation(params[:coauthors])
                        end

          if ENV['REPO_VERSIONING'] == 'true'
            previous_version = @sample&.tag&.taggable_data['previous_version']
            ## if previous_license && previous_license != params[:license]
            if previous_version && previous_version['license'] != params[:license]
              error!('License does not match previous version', 400)
            end
          end

          @author_ids |= current_user.group_leads.pluck(:id) if params[:addGroupLead]
        end

        post do
          declared_params = declared(params, include_missing: false)
          SubmittingJob.send(perform_method, declared_params, 'Sample', @author_ids, current_user.id)
          @sample.reload
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
          @reaction = current_user.versions_collection.reactions.find_by(id: params[:id]) unless @reaction
          error!('You do not have permission to publish this reaction', 404) unless @reaction

          @analysis_set = @reaction.analyses.where(id: params[:analysesIds]) | @reaction&.links&.where(id: params[:analysesIds]) \
                          | Container.where(id: (@reaction.samples.map(&:analyses).flatten.map(&:id) & params[:analysesIds])) \
                          | Container.where(id: (@reaction.samples.map(&:links).flatten.map(&:id) & params[:analysesIds]))
          ols_validation(@analysis_set)
          error!('No analysis data available for publication', 404) unless @analysis_set.present?

          @author_ids = if params[:addMe]
                          [current_user.id] + coauthor_validation(params[:coauthors])
                        else
                          coauthor_validation(params[:coauthors])
                        end

          if ENV['REPO_VERSIONING'] == 'true'
            previous_version = @reaction&.tag&.taggable_data['previous_version']
            ## if previous_license && previous_license != params[:license]
            if previous_version && previous_version['license'] != params[:license]
              error!('License does not match previous version', 400)
            end
          end
          @author_ids |= current_user.group_leads.pluck(:id) if params[:addGroupLead]
        end
        post do
          declared_params = declared(params, include_missing: false)
          declared_params[:scheme_only] = false
          SubmittingJob.send(perform_method, declared_params, 'Reaction', @author_ids, current_user.id)
          @reaction.reload
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
          @reaction = current_user.versions_collection.reactions.find_by(id: params[:id]) unless @reaction
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
          @reaction.reload
          send_message_and_tag(@reaction, current_user)
        end
      end

      namespace :create_new_version do
        desc 'Create a new version of a published Sample'
        params do
          requires :id, type: Integer, desc: 'id'
          requires :type, type: String, desc: 'type', values: %w[samples reactions containers]
          optional :parent_id, type: Integer, desc: 'parent id'
          optional :parent_type, type: String, desc: 'parent type', values: %w[sample reaction]
          optional :link_id, type: Integer, desc: 'link id'
          optional :schemeOnly, type: Boolean, desc: 'schemeOnly', default: false
          optional :is_async, type: Boolean, desc: 'perform job method', default: false
        end
        after_validation do
          error!('400 type not supported', 400) if ENV['REPO_VERSIONING'] != 'true'

          @scheme_only = params[:schemeOnly] || false
          @id = params[:id]
          @element_type = params[:type]
          if params[:type] == 'containers'
            @element =  current_user.versions_collection.send(:"#{params[:parent_type]}s").find_by(id: params[:parent_id], created_by: current_user.id)
          else
            @element = Collection.public_collection.send(@element_type).find_by(id: @id, created_by: current_user.id)
          end
          error!('401 Unauthorized', 401) unless @element

          ## Analysis only
          if params[:type] == 'containers'
            @link = @element.links.find_by(id: params[:link_id]) if params[:link_id]
            error!('401 Unauthorized', 401) unless @link or @link&.extended_metadata['target_id'] != params[:id]

            # look for the actual container
            @analysis = Container.find_by(id: params[:id])
            error!('401 Unauthorized', 401) unless @analysis
          end

          ## Product only
          if params[:parent_id] && params[:type] == 'samples'
            @parent = Collection.public_collection.reactions.find_by(id: params[:parent_id]) ||
            current_user.versions_collection.reactions.find_by(id: params[:parent_id]) ||
            error!('Reaction not found', 404)

            error!('Sample not part of reaction', 400) unless @parent.samples.exists?(@element.id)
          end
        end
        post do
          # method = ENV['PUBLISH_MODE'] == 'production' ? :perform_later : :perform_now
          method = params[:is_async] ? :perform_later : :perform_now
          method = :perform_now unless ENV['PUBLISH_MODE'] == 'production'

          VersioningJob.send(method, params[:type], @element, @parent, @analysis, @link, current_user, @scheme_only)
          { newVerCol: current_user.version_sync_collection }
        end
      end

      namespace :createNewSampleVersion do
        desc 'Create a new version of a published Sample'
        params do
          requires :sampleId, type: Integer, desc: 'Sample Id'
          optional :reactionId, type: Integer, desc: 'Reaction Id'
        end

        after_validation do
          error!('400 type not supported', 400) if ENV['REPO_VERSIONING'] != 'true'

          # look for the sample in all public samples created by the current user
          @sample = Collection.public_collection.samples.find_by(id: params[:sampleId], created_by: current_user.id)
          error!('401 Unauthorized', 401) unless @sample

          # look for an optional reaction in the public collection or the versions_collection of the current user
          unless params[:reactionId].nil?
            @reaction = Collection.public_collection.reactions.find_by(id: params[:reactionId])
            unless @reaction
              @reaction = current_user.versions_collection.reactions.find_by(id: params[:reactionId])
            end

            error!('400 reaction not found', 404) unless @reaction
            error!('400 sample not part of reaction', 404) unless @reaction.samples.find_by(id: @sample.id)
          end
        end

        post do
          new_sample = Repo::VersionHandler.create_new_sample_version(@sample, @reaction, current_user)
          entities = Entities::SampleEntity.represent(new_sample, serializable: true)
          {
            sample: entities,
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end
      end

      namespace :createNewReactionVersion do
        desc 'Create a new version of a published Sample'
        params do
          requires :reactionId, type: Integer, desc: 'Reaction Id'
        end
        after_validation do
          error!('400 type not supported', 400) if ENV['REPO_VERSIONING'] != 'true'

          @scheme_only = false
          @reaction = Collection.public_collection.reactions.find_by(id: params[:reactionId], created_by: current_user.id)
          error!('401 Unauthorized', 401) unless @reaction
        end
        post do
          method = params[:is_async] ? :perform_later : :perform_now
          method = :perform_now unless ENV['PUBLISH_MODE'] == 'production'

          VersioningJob.send(method, @reaction, current_user, @scheme_only)
          { newVerCol: current_user.version_sync_collection }
        end
      end

      namespace :createNewReactionSchemeVersion do
        desc 'Create a new version of a published scheme only reaction'
        params do
          requires :reactionId, type: Integer, desc: 'Reaction Id'
        end

        after_validation do
          error!('400 type not supported', 400) if ENV['REPO_VERSIONING'] != 'true'

          @scheme_only = true
          @reaction = Collection.scheme_only_reactions_collection.reactions.find_by(id: params[:reactionId], created_by: current_user.id)
          error!('401 Unauthorized', 401) unless @reaction
        end

        post do
          new_reaction = Repo::VersionHandler.create_new_reaction_version
          {
            reaction: Entities::ReactionEntity.represent(new_reaction, serializable: true),
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end
      end

      namespace :createAnalysisVersion do
        desc 'Create a new version of a linked analysis'
        params do
          requires :analysisId, type: Integer, desc: 'Analysis Id'
          requires :linkId, type: Integer, desc: 'Link Id'
          requires :parentType, type: String, desc: 'Parent Type'
          requires :parentId, type: Integer, desc: 'Parent Id'
        end

        after_validation do
          error!('400 type not supported', 400) if ENV['REPO_VERSIONING'] != 'true'

          # look for the element in the versions samples/reactions created by the current user
          if params[:parentType] == 'sample'
            @element =  current_user.versions_collection.samples.find_by(id: params[:parentId], created_by: current_user.id)
          elsif params[:parentType] == 'reaction'
            @element =  current_user.versions_collection.reactions.find_by(id: params[:parentId], created_by: current_user.id)
          end
          error!('401 Unauthorized', 401) unless @element

          # look for the link in the containers links (mainly for validation)
          @link = @element.links.find_by(id: params[:linkId])
          error!('401 Unauthorized', 401) unless @link or @link&.extended_metadata['target_id'] != params[:analysisId]

          # look for the actual container
          @analysis = Container.find_by(id: params[:analysisId])
          error!('401 Unauthorized', 401) unless @analysis
        end

        post do
          # duplicate the linked container for the element
          Repo::VersionHandler.create_new_container_version(@element, @analysis, current_user)

          # remove the link
          Container.destroy(@link.id)

          # return the sample or the reaction
          if params[:parentType] == 'sample'
            {
              sample: SampleSerializer.new(@element).serializable_hash.deep_symbolize_keys,
              message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
            }
          elsif params[:parentType] == 'reaction'
            {
              reaction: Entities::ReactionEntity.represent(@element, serializable: true),
              message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
            }
          end
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
          reviewer_auth = User.reviewer_ids.include?(current_user.id) && (@root_publication.state == Publication::STATE_PENDING || @root_publication.state == Publication::STATE_ACCEPTED)
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

        post :revert do
          process_review(extract_action)
        end

        post :declined do
          process_review(extract_action)
        end
      end

      # namespace :revert_publication_state do
      #   helpers ReviewHelpers

      #   desc 'Revert publication state from accepted to pending'
      #   params do
      #     requires :id, type: Integer, desc: 'Element ID'
      #     requires :type, type: String, desc: 'Element Type (Sample or Reaction)'
      #     requires :reason, type: String, desc: 'Reason for reverting'
      #   end

      #   before do
      #     # Only reviewers can revert publication states
      #     @is_reviewer = User.reviewer_ids.include?(current_user.id)
      #     error!('Unauthorized. Only reviewers can revert publication states.', 401) unless @is_reviewer
      #   end

      #   after_validation do
      #     @publication = Publication.find_by(
      #       element_type: params[:type].classify,
      #       element_id: params[:id],
      #       ancestry: '/'
      #     )

      #     error!('Publication not found', 404) unless @publication
      #     error!('Publication must be in accepted state to revert', 400) unless @publication.state == Publication::STATE_ACCEPTED
      #   end

      #   post do
      #     begin
      #       byebug
      #       # Store the revert information in the review history
      #       review_data = @publication.review || {}
      #       review_data['history'] ||= []
      #       review_data['history'] << {
      #         action: 'reverted',
      #         state: 'pending',
      #         username: current_user.name,
      #         userid: current_user.id,
      #         comment: params[:reason],
      #         timestamp: Time.now.strftime('%d-%m-%Y %H:%M:%S'),
      #       }
      #       review_data['history'] << {
      #         action: 'reviewing',
      #         state: 'pending',
      #         type: 'reviewed',
      #       }

      #       @publication.review = review_data
      #       @publication.save!

      #       # Update the publication state to pending
      #       @publication.update_state(Publication::STATE_PENDING)

      #       # Move element back to reviewing collection
      #       element = @publication.element
      #       if element.present?
      #         reviewing_col = Collection.element_to_review_collection
      #         pub_user = User.with_deleted.find(@publication.published_by)
      #         pending_col = pub_user.pending_collection

      #         # Remove from accepted collection
      #         accepted_col = Collection.embargo_accepted_collection
      #         if element.is_a?(Reaction)
      #           CollectionsReaction.where(reaction_id: element.id, collection_id: accepted_col.id).destroy_all
      #         elsif element.is_a?(Sample)
      #           CollectionsSample.where(sample_id: element.id, collection_id: accepted_col.id).destroy_all
      #         end

      #         # Add to reviewing collection
      #         if element.is_a?(Reaction)
      #           reviewing_col.each do |col|
      #             CollectionsReaction.find_or_create_by!(
      #               reaction_id: element.id,
      #               collection: col,
      #             )
      #           end
      #         elsif element.is_a?(Sample)
      #           reviewing_col.each do |col|
      #             CollectionsSample.find_or_create_by!(
      #               sample_id: element.id,
      #               collection: col,
      #             )
      #           end
      #         end
      #       end

      #       # Send notification to submitter
      #       submitter = User.with_deleted.find(@publication.published_by)
      #       if submitter.present?
      #         # You can add email notification here if needed
      #         # PublicationMailer.revert_notification(submitter, @publication, params[:reason], current_user).deliver_later
      #       end

      #       {
      #         success: true,
      #         message: "Publication reverted to pending state successfully",
      #         publication_id: @publication.id,
      #         element_id: @publication.element_id,
      #         element_type: @publication.element_type,
      #         new_state: Publication::STATE_PENDING
      #       }
      #     rescue StandardError => e
      #       Publication.repo_log_exception(e, {
      #         params: params,
      #         user_id: current_user&.id,
      #         publication_id: @publication&.id
      #       })
      #       { error: e.message }
      #     end
      #   end
      # end

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
