module Repo
  class EmbargoHandler
    def self.find_or_create_embargo(cid, current_user)
      if (cid == 0)
        chemotion_user = User.chemotion_user
        new_col_label = current_user.initials + '_' + Time.now.strftime('%Y-%m-%d')
        col_check = Collection.where([' label like ? ', new_col_label + '%'])
        new_col_label = new_col_label << '_' << (col_check&.length + 1)&.to_s if col_check&.length.positive?
        new_embargo_col = Collection.create!(user: chemotion_user, label: new_col_label, ancestry: current_user.publication_embargo_collection.id)
        SyncCollectionsUser.find_or_create_by(user: current_user, shared_by_id: chemotion_user.id, collection_id: new_embargo_col.id,
        permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10,
        fake_ancestry: current_user.publication_embargo_collection.sync_collections_users.first.id.to_s)
        #embargo = Embargo.create!(name: new_embargo_col.label, collection_id: new_embargo_col.id, created_by: current_user.id)
        d = Doi.create_for_element!(new_embargo_col)
        Publication.create!(
          state: Publication::STATE_PENDING,
          element: new_embargo_col,
          published_by: current_user.id,
          doi: d,
          concept: c,
          taggable_data: { label: new_embargo_col.label, col_doi: d.full_doi }
        )
        new_embargo_col
      else
        Collection.find(cid)
      end
    rescue StandardError => e
      Repo::EmbargoHandler.logger.error ["[find_or_create_embargo] cid: #{cid}, current_user: #{current_user&.id}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    end

    def self.release_embargo(embargo_collection_id, user_id)
      embargo_collection = Collection.find(embargo_collection_id)
      return { error: 'Embargo collection not found' } if embargo_collection.nil?

      current_user = User.find(user_id)
      return { error: 'User not found' } if current_user.nil?

      col_pub = embargo_collection.publication
      is_submitter = col_pub&.review&.dig('submitters')&.include?(current_user.id) || col_pub&.published_by == current_user.id
      return { error: "only the owner of embargo #{embargo_collection.label} can perform the release."} if col_pub.nil? ||  !is_submitter

      col_pub.update(accepted_at: Time.now.utc)
      col_pub.refresh_embargo_metadata
      pub_samples = Publication.where(ancestry: nil, element: embargo_collection.samples).order(updated_at: :desc)
      pub_reactions = Publication.where(ancestry: nil, element: embargo_collection.reactions).order(updated_at: :desc)
      pub_list = pub_samples + pub_reactions

      check_state = pub_list.select { |pub| pub.state != Publication::STATE_ACCEPTED }
      return { error: "Embargo #{embargo_collection.label} release failed, because not all elements have been 'accepted'."} if check_state.present?

      scheme_only_list = pub_list.select { |pub| pub.taggable_data['scheme_only']  == true }
      if pub_list.flatten.length == scheme_only_list.flatten.length
        col_pub.update(state: 'scheme_only')
      else
        col_pub.update(state: 'accepted')
      end

      pub_list.each do |pub|
        params = { id: pub.element_id, type: pub.element_type }
        Repo::ReviewProcess.new(params, current_user.id, 'release').element_submit(pub)
      end
      Repo::EmbargoHandler.remove_anonymous(embargo_collection)
      Repo::EmbargoHandler.handle_embargo_collections(embargo_collection, current_user)
      case ENV['PUBLISH_MODE']
      when 'production'
        if Rails.env.production?
          ChemotionEmbargoPubchemJob.set(queue: "publishing_embargo_#{embargo_collection.id}").perform_later(embargo_collection.id)
        end
      when 'staging'
        ChemotionEmbargoPubchemJob.perform_now(embargo_collection.id)
      else 'development'
      end
      { message: "Embargo #{embargo_collection.label} has been released" }
    rescue StandardError => e
      Repo::EmbargoHandler.logger.error ["[release_embargo] embargo_collection_id: #{embargo_collection_id}, user_id: #{user_id}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      Message.create_msg_notification(
        channel_id: Channel.find_by(subject: Channel::SUBMITTING)&.id,
        message_from: User.find_by(name_abbreviation: 'CHI')&.id,
        autoDismiss: 5,
        message_content: { 'data': "release_embargo exception, User: [#{user_id}], embargo_collection_id: [#{embargo_collection_id}], got error, #{e.message}" },
      )
      { error: e.message }
    end

    def self.delete(embargo_collection_id, user_id)
      embargo_collection = Collection.find(embargo_collection_id)
      return { error: 'Embargo collection not found' } if embargo_collection.nil?

      current_user = User.find(user_id)
      return { error: 'User not found' } if current_user.nil?

      element_cnt = embargo_collection.samples.count + embargo_collection.reactions.count
      if element_cnt.positive?
        { error: "Delete Embargo #{embargo_collection.label} deletion failed: the collection is not empty. Please refresh your page."}
      else
        Repo::EmbargoHandler.remove_anonymous(embargo_collection)
        Repo::EmbargoHandler.remove_embargo_collection(embargo_collection)
        { message: "Embargo #{embargo_collection.label} has been deleted" }
      end
    rescue StandardError => e
      Repo::EmbargoHandler.logger.error ["[delete embargo] embargo_collection_id: #{embargo_collection_id}, user_id: #{user_id}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      { error: e.message }
    end

    ### private methods

    def self.remove_anonymous(col)
      anonymous_ids = col.sync_collections_users.joins("INNER JOIN users on sync_collections_users.user_id = users.id")
      .where("users.type='Anonymous'").pluck(:user_id)
      anonymous_ids.each do |anonymous_id|
        anonymous = Anonymous.find(anonymous_id)
        anonymous.sync_in_collections_users.destroy_all
        anonymous.collections.each { |c| c.really_destroy! }
        anonymous.really_destroy!
      end
    rescue StandardError => e
      Repo::EmbargoHandler.logger.error ["[remove_anonymous] col_id: #{col&.id}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    end

    def self.remove_embargo_collection(col)
      col&.publication.really_destroy!
      col.sync_collections_users.destroy_all
      col.really_destroy!
    end

    def self.handle_embargo_collections(col, current_user)
      col.update_columns(ancestry: current_user.published_collection.id)
      sync_emb_col = col.sync_collections_users.where(user_id: current_user.id)&.first
      sync_published_col = SyncCollectionsUser.joins("INNER JOIN collections ON collections.id = sync_collections_users.collection_id ")
                                              .where("collections.label='Published Elements'")
                                              .where("sync_collections_users.user_id = #{current_user.id}").first
      sync_emb_col.update_columns(fake_ancestry: sync_published_col.id)
    rescue StandardError => e
      Repo::EmbargoHandler.logger.error ["[handle_embargo_collections] col_id: #{col&.id}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      raise e
    end

    def self.logger
      @@embargo_logger ||= Logger.new(Rails.root.join('log/embargo.log')) # rubocop:disable Style/ClassVars
    end

  end
end

