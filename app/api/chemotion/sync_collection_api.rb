# frozen_string_literal: true

module Chemotion
  # API for synchronized collections
  class SyncCollectionAPI < Grape::API
    resource :syncCollections do
      rescue_from ActiveRecord::RecordNotFound do |_error|
        message = 'Could not find sync Collection'
        error!(message, 404)
      end

      desc 'Return sync collection by id'
      params do
        requires :id, type: Integer, desc: 'Collection id'
      end
      route_param :id, requirements: { id: /[0-9]*/ } do
        get do
          scu = current_user.all_sync_in_collections_users.find(params[:id])

          present scu, with: Entities::SyncCollectionsUserEntity, root: 'sync_collections_user'
        end
      end

      namespace :publication do
        desc "Return the 'All' collection of the current user"
        get do
          current_user.sync_published_collection
        end
      end

      namespace :review do
        desc "Return the 'All' collection of the current user"
        get do
          if User.reviewer_ids.include?(current_user.id)
            current_user.sync_element_to_review_collection
          else
            current_user.sync_reviewing_collection
          end
        end
      end

      namespace :take_ownership do
        desc 'Take ownership of collection with specified sync_collections_user id'
        params do
          requires :id, type: Integer, desc: 'SyncCollectionsUSer id'
        end
        route_param :id do
          before do
            error!('401 Unauthorized', 401) unless SyncCollectionPolicy.new(current_user, SyncCollectionsUser.find(params[:id])).take_ownership?
          end

          post do
            Usecases::Sharing::TakeOwnership.new(params.merge(current_user_id: current_user.id, is_sync: true)).execute!
            { success: true } # to prevent serializing the result of the usecase
          end
        end
      end

      get_child = proc do |children, collections|
        children.each do |obj|
          child = collections.select { |dt| dt['ancestry'] == obj['id'].to_s }
          get_child.call(child, collections) if child.count.positive?
          obj[:children] = child if child.count.positive?
        end
      end

      handle_review = proc do |collections|
        cols = []
        collections.each do |col|
          unless col['label'] == 'Reviewing' || col['label'] == 'Pending Publications' || col['label'] == 'Element To Review' || col['label'] == 'Reviewed' || col['label'] == 'Embargo Accepted'
            cols.push(col)
            next
          end
          oc = SyncCollectionsUser.find(col['id'])&.collection
          sc = (oc&.samples&.joins(:publication)&.where('publications.ancestry is null') || []).length
          rc = (oc&.reactions&.joins(:publication)&.where('publications.ancestry is null') || []).length
          next if (sc + rc).zero?

          col['label'] = col['label'] + ",S#{sc},R#{rc}" if col['label'] == 'Reviewing' || col['label'] == 'Element To Review' || col['label'] == 'Reviewed'
          cols.push(col)
        end
        cols
      end

      desc 'Return all remote serialized collections'
      get :sync_remote_roots do
        collections = Collection.joins(:sync_collections_users)
                                .where([' sync_collections_users.user_id in (select user_ids(?)) and NOT sync_collections_users.shared_by_id = ? ', current_user.id, current_user.id])
                                .select(
                                  <<~SQL
                                    sync_collections_users.id, collections.label, collections.shared_by_id,collections.is_locked,
                                    sync_collections_users.reaction_detail_level, sync_collections_users.sample_detail_level,
                                    sync_collections_users.screen_detail_level, sync_collections_users.wellplate_detail_level,
                                    sync_collections_users.element_detail_level,
                                    user_as_json(collections.user_id) as temp_sharer,
                                    sync_collections_users.fake_ancestry as ancestry, sync_collections_users.permission_level,
                                    user_as_json(sync_collections_users.user_id) as temp_user
                                  SQL
                                ).as_json
        root_ancestries = []
        collections = handle_review.call(collections)
        collections.each do |obj|
          root_ancestries.push(obj['ancestry'])
        end

        root_ancestries.map!(&:to_i)
        col_tree = Collection.remote(current_user.id).where(id: root_ancestries)
                             .where([' user_id in (select user_ids(?))', current_user.id]).order('shared_by_id')
                             .select(
                               <<~SQL
                                 id, user_id, label, ancestry, shared_by_id, permission_level,is_locked,
                                 shared_user_as_json(collections.user_id,#{current_user.id}) as shared_to,
                                 reaction_detail_level, sample_detail_level, screen_detail_level, wellplate_detail_level, element_detail_level,
                                 user_as_json(collections.shared_by_id) as shared_by
                               SQL
                             ).as_json

        col_tree.each do |obj|
          child = collections.select { |dt| dt['ancestry'] == obj['id'].to_s }
          obj[:children] = child if child.count.positive?
        end
        present col_tree, with: Entities::CollectionSyncEntity, root: 'syncCollections'
      end

      desc 'Update Sync collection'
      params do
        requires :id, type: Integer
        requires :collection_attributes, type: Hash do
          requires :permission_level, type: Integer
          requires :sample_detail_level, type: Integer
          requires :reaction_detail_level, type: Integer
          requires :wellplate_detail_level, type: Integer
          requires :screen_detail_level, type: Integer
          requires :element_detail_level, type: Integer
        end
      end

      put ':id' do
        sync = SyncCollectionsUser.where(id: params[:id], shared_by_id: current_user.id).first
        sync&.update!(params[:collection_attributes])

        present sync || {}, using: Entities::SyncCollectionsUserEntity, root: 'sync_collections_user'
      end

      desc 'Create Sync collections'
      params do
        requires :collection_attributes, type: Hash do
          requires :permission_level, type: Integer
          requires :sample_detail_level, type: Integer
          requires :reaction_detail_level, type: Integer
          requires :wellplate_detail_level, type: Integer
          requires :screen_detail_level, type: Integer
          requires :element_detail_level, type: Integer
        end
        requires :user_ids, type: Array
        requires :id, type: Integer
      end

      after_validation do
        c = Collection.where(is_shared: false, id: params[:id], user_id: current_user.id).first
        if c
          samples =   c.samples
          reactions = c.reactions
          wellplates = c.wellplates
          screens = c.screens

          top_secret_sample = samples.pluck(:is_top_secret).any?
          top_secret_reaction = reactions.flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_wellplate = wellplates.flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_screen = screens.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any?

          is_top_secret = top_secret_sample || top_secret_wellplate || top_secret_reaction || top_secret_screen

          error!('401 Unauthorized', 401) if is_top_secret
        end
      end

      post do
        uids = params[:user_ids].map do |user_id|
          val = user_id[:value].to_s.downcase
          if /^[0-9]+$/.match?(val)
            val.to_i
          # elsif val =~ Devise::email_regexp
          else
            User.where(email: val).pluck :id
          end
        end.flatten.compact.uniq

        params[:user_ids] = uids
        Usecases::Sharing::SyncWithUsers.new(params, current_user).execute!

        c = Collection.find_by(id: params[:id])
        message = Message.create_msg_notification(
          channel_subject: Channel::SYNCHRONIZED_COLLECTION_WITH_ME,
          message_from: current_user.id, message_to: uids,
          data_args: { synchronized_by: current_user.name, collection_name: c.label }, level: 'info'
        )

        present message, using: Entities::MessageEntity
      end

      desc 'delete sync by id'
      params do
        requires :id, type: Integer
        requires :is_syncd, type: Boolean
      end

      delete ':id' do
        user = if params[:is_syncd]
          SyncCollectionsUser.where(id: params[:id], user_id: current_user.id).first
        else
          SyncCollectionsUser.where(id: params[:id], shared_by_id: current_user.id).first
        end&.destroy

        present user || {}, using: Entities::SyncCollectionsUserEntity, root: 'sync_collections_user'
      end
    end
  end
end
