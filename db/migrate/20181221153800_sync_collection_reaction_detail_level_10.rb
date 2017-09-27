class SyncCollectionReactionDetailLevel10 < ActiveRecord::Migration
  def change
    SyncCollectionsUser.where(shared_by_id: User.chemotion_user.id).each{|s| s.update(reaction_detail_level: 10) }
  end
end
