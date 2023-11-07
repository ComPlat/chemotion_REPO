class AcceptedAncestry < ActiveRecord::Migration[5.2]
  def change
    unless User.chemotion_user.nil?
      chemotion_user = User.chemotion_user
      reviewer_ids = User.reviewer_ids
      sys_accept_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Embargo Accepted from', is_locked: true, is_shared: false)

      embargo_accepted_collection = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Embargo Accepted', is_synchronized: true)
      embargo_accepted_collection.update!(ancestry: "#{sys_accept_from.id}")

      reviewer_ids.each do |rid|
        u = User.find(rid)
        col_attributes = {
          user: u,
          shared_by_id: chemotion_user.id,
          is_locked: true,
          is_shared: true
        }

        rc = Collection.find_or_create_by(col_attributes)
        sync = SyncCollectionsUser.find_or_create_by(user: u, shared_by_id: chemotion_user.id, collection_id: embargo_accepted_collection.id)
        sync.update!(fake_ancestry: rc.id.to_s)
      end
    end
  end
end
