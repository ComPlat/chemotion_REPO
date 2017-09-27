namespace :data do
  desc 'Upgrade publication tag'
  # auhor = Person instance
  # obsolete:
  # author_names: authors.map(&:name),
  # affiliation_ids: authors.map(&:current_affiliations).map { |as| as.map(&:id) },
  #
  # added:
  # creators: [{
  #   id: author.id,
  #   givenName: author.first_name,
  #   familyName: author.last_name,
  #   name:  author.name,
  #   orcid: author.orcid,
  #   affiliationIds:[]
  # }],
  #
  # unchanged:
  # published_by: authors[0].id,
  # author_ids: authors.map(&:id),
  # affilations: { id: full_affiliation_name }
  # queued_at: DateTime
  task ver_20180509000000_publication_tag_upgrade: :environment do
    published_samples = Collection.public_collection.samples.includes({molecule: [:tag]},:tag)
    published_samples.map do |s|
      taggable_data = s.tag.taggable_data
      tag = taggable_data['publication']
      mt = s.molecule.tag
      mt_data = mt.taggable_data || {}
      mt_data['chemotion'] = {}
      doi = nil
      last_published_at = nil
      if tag.present?
        tag['doi'] =~ /10\.\d+\/(\w|-)+/
        doi = $&
        if tag['published_at']
          t = DateTime.parse(tag['published_at'])
          last_published_at = t if (!last_published_at || t > last_published_at)
        end
      end
      mt_data['chemotion']['doi'] = doi if doi
      mt_data['chemotion']['chemotion_first'] = mt_data['chemotion_first'] if mt_data['chemotion_first']
      mt_data['chemotion']['last_published_at'] = last_published_at if last_published_at
      mt.update_columns(taggable_data: mt_data)
    end
  end
end
