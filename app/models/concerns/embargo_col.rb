module EmbargoCol
  extend ActiveSupport::Concern
  def refresh_embargo_metadata
    return if element_type != 'Collection' || element.nil?

    # Fetch publications for samples and reactions with preloaded doi
    ps = Publication.where(element_type: 'Sample', ancestry: nil, element_id: element.samples&.pluck(:id)).includes(:doi)
    pr = Publication.where(element_type: 'Reaction', ancestry: nil, element_id: element.reactions&.pluck(:id)).includes(:doi)

    creators = []
    author_ids = []
    affiliation_ids = []
    contributors = {}
    eids = []
    dois = []

    (ps + pr)&.each do |pu|
      next if pu.taggable_data['scheme_only'] == true

      eids.push(pu.id)
      dois.push({ id: pu.id, element_type: pu.element_type, element_id: pu.element_id, doi: pu.doi.full_doi, state: pu.state }) if pu.doi.present?
      ctag = pu.taggable_data || {}
      creators << ctag["creators"]
      author_ids << ctag["author_ids"]
      affiliation_ids << ctag["affiliation_ids"]
      contributors = ctag["contributors"]
    end

    et = ElementTag.find_or_create_by(taggable_id: element_id, taggable_type: element_type)
    et_taggable_data = et.taggable_data || {}
    if et_taggable_data['publication'].present?
      creators << et_taggable_data['publication']["creators"] if et_taggable_data['publication']["creators"] .present?
      author_ids << et_taggable_data['publication']["author_ids"] if et_taggable_data['publication']["author_ids"] .present?
      affiliation_ids << et_taggable_data['publication']["affiliation_ids"] if et_taggable_data['publication']["affiliation_ids"] .present?
    end

    affiliations = Affiliation.where(id: affiliation_ids.flatten)
    affiliations_output = {}
    affiliations.each do |aff|
      affiliations_output[aff.id] = aff.output_full
    end

    tag = taggable_data || {}
    tag["creators"] = creators.flatten.uniq
    tag["author_ids"] = author_ids.flatten.uniq
    tag["affiliation_ids"] = affiliation_ids.flatten.uniq
    tag["contributors"] = contributors
    tag["affiliations"] = affiliations_output
    tag["eids"] = eids
    tag["element_dois"] = dois
    update!(taggable_data: tag)
    persit_datacite_metadata_xml!
  end
end
