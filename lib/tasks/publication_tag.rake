namespace :publication_tag do
  desc 'regerate the authors\'names to display with published samples'
  task reprint_name: :environment do
    Collection.public_collection.samples.includes(:molecule, :tag).each do |s|
      td = s.tag.taggable_data
      tag = td['publication']
      next unless tag
      if (a = tag['published_by']).is_a?(Integer)
        tag['published_by'] = [a]
      end
      tag['author_ids'] = tag['published_by'] unless tag['author_ids']
      a_ids = tag['author_ids']
      authors = Person.where(id: a_ids)
                      .includes(:affiliations)
                      .order("position(users.id::text in '#{a_ids}')")
      tag['author_names'] = authors.map(&:name)
      print "%i %s \n" % [s.id, tag['author_names'].join(' - ')]
      s.tag.update!(taggable_data: td.merge(publication: tag))
    end
  end

  desc 'regerate the sample doi in the publication tag of published samples'
  task reprint_doi: :environment do
    Collection.public_collection.samples.includes(:molecule, :tag).each do |s|
      td = s.tag.taggable_data
      tag = td['publication']
      next unless tag
      tag['doi'] ||= s.generate_doi tag['sample_version']
      print "%i %s \n" % [s.id, tag['doi']]
      s.tag.update!(taggable_data: td.merge(publication: tag))
    end
  end

  desc 'regerate affiliations in the publication tag of published samples\
    with authors current_affiliations'
  task reprint_affiliations_from_current: :environment do
    Collection.public_collection.samples.includes(:molecule, :tag).each do |s|
      td = s.tag.taggable_data
      tag = td['publication']
      next unless tag
      a_ids = tag['author_ids']
      authors = Person.where(id: a_ids)
                      .includes(:affiliations)
                      .order("position(users.id::text in '#{a_ids}')")
      affiliations = authors.map(&:current_affiliations)
      affiliations_output = {}
      affiliations.flatten.each do |aff|
        affiliations_output[aff.id] = aff.output_full
      end
      tag['affiliation_ids'] = affiliations.map { |as| as.map(&:id) }
      tag['affiliations'] = affiliations_output
      print "%i %s \n" % [s.id, tag['affiliation_ids']]
      print "%i %s \n" % [s.id, tag['affiliations']]
      s.tag.update!(taggable_data: td.merge(publication: tag))
    end
  end

  desc 'regerate affiliation displayed names in published sample tags'
  task reprint_affiliations_from_aff_id: :environment do
    Collection.public_collection.samples.includes(:molecule, :tag).each do |s|
      td = s.tag.taggable_data
      tag = td['publication']
      next unless tag
      affiliations = Affiliation.where(
        id: tag['affiliation_ids'].flatten.compact
      )
      affiliations_output = {}
      affiliations.flatten.each do |aff|
        affiliations_output[aff.id] = aff.output_full
      end
      tag['affiliations'] = affiliations_output
      s.tag.update!(taggable_data: td.merge(publication: tag))
    end
  end
end
