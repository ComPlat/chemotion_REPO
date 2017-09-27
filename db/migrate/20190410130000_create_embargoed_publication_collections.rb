class CreateEmbargoedPublicationCollections < ActiveRecord::Migration
  def change
    chemotion_user = User.chemotion_user
    user_ids = User.where(type: 'Person').pluck(:id)

    user_ids.each do |uid|
      u = User.find(uid)
      sys_ready_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Embargoed Publications from', is_locked: true, is_shared: false)
      sys_ready_collection = Collection.create(user: chemotion_user, label: 'Embargoed Publications', ancestry: "#{sys_ready_from.id}")

      root_label = "with %s" %chemotion_user.name_abbreviation
      rc = Collection.find_by(user: u, shared_by_id: chemotion_user.id, is_locked: true, is_shared: true)
      rc = Collection.create!(user: u, shared_by_id: chemotion_user.id, is_locked: true, is_shared: true, label: root_label) if rc.nil?

      SyncCollectionsUser.find_or_create_by(user: u, shared_by_id: chemotion_user.id, collection_id: sys_ready_collection.id,
        permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    end
  end
end