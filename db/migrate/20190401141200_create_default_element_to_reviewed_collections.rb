class CreateDefaultElementToReviewedCollections < ActiveRecord::Migration[4.2]
 def change

   chemotion_user = User.chemotion_user
   reviewer_ids = User.reviewer_ids

   reviewer_ids.each do |rid|
       u = User.find_by(id: rid)
       next unless u.present?

       sys_review_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Reviewed Publication from', is_locked: true, is_shared: false)
       sys_review_collection = Collection.create(user: chemotion_user, label: 'Reviewed', ancestry: "#{sys_review_from.id}")

       col_attributes = {
         user: u,
         shared_by_id: chemotion_user.id,
         is_locked: true,
         is_shared: true
       }

       rc = Collection.find_by(col_attributes)
       SyncCollectionsUser.find_or_create_by(user: u, shared_by_id: chemotion_user.id, collection_id: sys_review_collection.id,
         permission_level: 3, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)

   end
 end
end
