class SyncCollectionReactionDetailLevel10 < ActiveRecord::Migration
  def change
    unless User.chemotion_user.nil?
      SyncCollectionsUser.where(shared_by_id: User.chemotion_user.id).each{|s| s.update(reaction_detail_level: 10) }
    end
  end
end
