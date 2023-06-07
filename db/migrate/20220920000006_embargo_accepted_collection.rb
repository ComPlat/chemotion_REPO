class EmbargoAcceptedCollection < ActiveRecord::Migration[5.2]
  def change
    chemotion_user = User.chemotion_user
    reviewer_ids = User.reviewer_ids
    embargo_accepted_collection = Collection.create(user_id: chemotion_user.id, label: 'Embargo Accepted', is_synchronized: true)

    reviewer_ids.each do |uid|
      SyncCollectionsUser.find_or_create_by(user_id: uid, shared_by_id: chemotion_user.id, collection_id: embargo_accepted_collection.id,
        permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10)
    end

    list = Publication.where(state: ['accepted'], element_type: ['Sample', 'Reaction'])

    list.each do |pub|
      element = pub.element
      case pub.element_type
      when 'Sample'
        CollectionsSample
      when 'Reaction'
        CollectionsReaction
      end.insert_in_collection(
        element.id,
        [embargo_accepted_collection.id]
      )
    end
  end
end
