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
  task ver_20180618000000_publication_tag_upgrade_3: :environment do
    published_samples = Collection.public_collection.samples.includes({molecule: [:tag]},:tag)
    published_samples.map do |s|
      taggable_data = s.tag.taggable_data
      s.analyses.each do |ana|
        doi = ana.get_doi
        data = ana.tag&.taggable_data
        data['publication']['analysis_doi'] = doi if data && data['publication']
        ana.tag&.update(taggable_data: data)
      end
    end
  end
end
