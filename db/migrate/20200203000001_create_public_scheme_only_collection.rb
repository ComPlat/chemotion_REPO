class CreatePublicSchemeOnlyCollection < ActiveRecord::Migration
  def change
    chemotion_user = User.chemotion_user
    public_scheme_reaction = Collection.scheme_only_reactions_collection || Collection.create(user: chemotion_user, label: 'Scheme-only reactions', is_shared: false, is_locked: false, is_synchronized: true)

    users = User.where(type: 'Person')
    users.each do |u|
      root_collection_attributes = {
        user: u,
        shared_by_id: chemotion_user.id,
        is_locked: true,
        is_shared: true
      }

      rc = Collection.find_by(root_collection_attributes)
      SyncCollectionsUser.find_or_create_by(user: u, shared_by_id: chemotion_user.id, collection_id: public_scheme_reaction.id, permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    end
  end
end
