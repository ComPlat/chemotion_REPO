# frozen_string_literal: true

# A helper for submission
module EmbargoHelpers
  extend Grape::API::Helpers

  def refresh_embargo_metadata(col_id)
    pub = Publication.find_by(element_type: 'Collection', element_id: col_id)
    col = pub&.element
    if col.present?
      ps = Publication.where(element_type: 'Sample', ancestry: nil, element_id: col.samples&.pluck(:id))
      pr = Publication.where(element_type: 'Reaction', ancestry: nil, element_id: col.reactions&.pluck(:id))

      creators = []
      author_ids = []
      affiliation_ids = []
      contributors = {}
      affiliations = []
      eids = []
      dois = []

      (ps + pr)&.each do |pu|
        if pu.taggable_data['scheme_only']  == true
        else
          eids.push(pu.id)
          dois.push({ id: pu.id, element_type: pu.element_type, element_id: pu.element_id, doi: pu.doi.full_doi }) if pu.doi.present?
          ctag = pu.taggable_data || {}
          creators << ctag["creators"]
          author_ids << ctag["author_ids"]
          affiliation_ids << ctag["affiliation_ids"]
          contributors = ctag["contributors"]
        end
      end
      affiliations = Affiliation.where(id: affiliation_ids.flatten)
      affiliations_output = {}
      affiliations.each do |aff|
        affiliations_output[aff.id] = aff.output_full
      end

      tag = pub.taggable_data || {}
      tag["creators"] = creators.flatten.uniq
      tag["author_ids"] = author_ids.flatten.uniq
      tag["affiliation_ids"] = affiliation_ids.flatten.uniq
      tag["contributors"] = contributors
      tag["affiliations"] = affiliations_output
      tag["eids"] = eids
      tag["element_dois"] = dois
      pub.update!(taggable_data: tag)
      pub.persit_datacite_metadata_xml!
      pub
    end
  end

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
    has_embargo_col && has_embargo_col.length > 0 ? has_embargo_col.first.label : ''
  end

  def create_embargo()
  end

end
