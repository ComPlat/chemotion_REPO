# frozen_string_literal: true

# A helper for submission
module EmbargoHelpers
  extend Grape::API::Helpers

  def fetch_embargo_collection(cid, current_user)
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
        taggable_data: { label: new_embargo_col.label, col_doi: d.full_doi }
      )
      new_embargo_col
    else
      Collection.find(cid)
    end
  end



  def find_embargo_collection(root_publication)
    has_embargo_col = root_publication.element&.collections&.select { |c| c['ancestry'].to_i == User.find(root_publication.published_by).publication_embargo_collection.id }
    has_embargo_col && has_embargo_col.length > 0 ? has_embargo_col.first : OpenStruct.new(label: '')
  end

  def create_embargo()
  end

end
