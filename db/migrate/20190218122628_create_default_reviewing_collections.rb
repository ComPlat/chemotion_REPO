class CreateDefaultReviewingCollections < ActiveRecord::Migration
 def change
   chemotion_user = User.chemotion_user
  users = User.where(type: 'Person')
   users.each do |u|
     sys_reviewing_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Reviewing Publication from')
     sys_reviewing_collection = u.reviewing_collection || Collection.create(user: chemotion_user, label: 'Reviewing', ancestry: "#{sys_reviewing_from.id}")

     root_collection_attributes = {
       user: u,
       shared_by_id: chemotion_user.id,
       is_locked: true,
       is_shared: true
     }

     rc = Collection.find_by(root_collection_attributes)
     SyncCollectionsUser.find_or_create_by(user: u, shared_by_id: chemotion_user.id, collection_id: sys_reviewing_collection.id, permission_level: 3, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
   end
 end
end
