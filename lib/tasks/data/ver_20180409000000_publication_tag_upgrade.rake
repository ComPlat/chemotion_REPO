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
  task ver_20180409000000_publication_tag_upgrade: :environment do
    published_samples = Collection.public_collection.samples.includes(:molecule,:tag)
    published_samples.map do |s|
      taggable_data = s.tag.taggable_data
      tag = taggable_data['publication']
      next unless tag
      author_ids = (tag['author_ids'] || [])
      tag['creators'] = author_ids.map { |author_id|
        author = Person.find_by(id: author_id)
        next unless author
        {
          id: author.id,
          givenName: author.first_name,
          familyName: author.last_name,
          name: author.name,
          orcid: author.orcid,
          affiliationIds: author.current_affiliations.map(&:id)
        }
      }.compact
      s.tag.update!(taggable_data: taggable_data.merge(publication: tag))
    end
  end
end
