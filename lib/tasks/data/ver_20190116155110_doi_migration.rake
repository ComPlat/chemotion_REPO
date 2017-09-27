namespace :data do
  desc 'doi migration'
  task ver_20190116155110_doi_migration: :environment do
    begin
      log_file = File.open(
        Rails.root.join('log', 'ver_20190116155110_doi_migration.log'),
        'a'
      )
    KIT_DOI = '10.14272/'
    proc_taggable = Proc.new do |type, id, parent_type, parent_id|

      tag = ElementTag.where(taggable_type: type, taggable_id: id).first
      parent_tag = ElementTag.where(taggable_type: parent_type, taggable_id: parent_id).first unless parent_type.nil? || parent_id.nil?
      return {} unless tag && tag.taggable_data && tag.taggable_data['publication']
      if type === 'Sample'
        doi = Doi.where(doiable_type: type, doiable_id: id).first
      else
        doi = Doi.where(doiable_type: parent_type, doiable_id: parent_id).first
      end

      taggable_data = {
        doi: KIT_DOI + doi.suffix,
        creators: tag.taggable_data['publication']['creators'] || (parent_tag && parent_tag.taggable_data['publication']['creators']),
        queued_at: tag.taggable_data['publication']['queued_at'] || (parent_tag && parent_tag.taggable_data['publication']['queued_at']),
        author_ids: tag.taggable_data['publication']['author_ids'] || (parent_tag && parent_tag.taggable_data['publication']['author_ids']),
        doi_reg_at: tag.taggable_data['publication']['doi_reg_at'],
        chem_first: tag.taggable_data['publication']['chem_first'] || (parent_tag && parent_tag.taggable_data['publication']['chem_first']),
        pubchem_reg_at: tag.taggable_data['publication']['pubchem_reg_at'],
        affiliations: tag.taggable_data['publication']['affiliations'] || (parent_tag && parent_tag.taggable_data['publication']['affiliations']),
        published_at: tag.taggable_data['publication']['published_at'],
        published_by: tag.taggable_data['publication']['published_by'],
        sample_version: tag.taggable_data['publication']['sample_version']
      }
      taggable_data.merge!(analysis_doi: tag.taggable_data['publication']['analysis_doi'])  if type === 'Container'
      taggable_data.merge!(dataset_version: tag.taggable_data['publication']['dataset_version'])  if type === 'Container'
      taggable_data
    end

    proc_metaxml = Proc.new do |doi_path|
      datacite_url = 'https://api.datacite.org/works/'
      target = datacite_url + doi_path
      connection = Faraday.new(url: target) do |f|
        f.use FaradayMiddleware::FollowRedirects
        f.adapter :net_http
      end
      resp = connection.get { |req| req.url('/works/' + doi_path) }
      Base64.decode64 JSON.parse(resp.body)['data']['attributes']['xml'] unless JSON.parse(resp.body)['data'].nil?
    end
    log_file.write "~~~~~~#{Time.now.to_s}~~~~~~~\n"
    CollectionsSample.where(collection_id: 103).find_each(batch_size: 10) do |cs|
      log_file.write("Sample #{cs.sample_id}: start\n")
      sleep(1.second)
      s = Sample.find(cs.sample_id)
      pub = Publication.find_by(element_type: 'Sample', element_id: s.id)

      if pub.present?
        log_file.write "Sample #{s.id}: already existing publication #{pub.id}\n "
        next
      end

      ## only process the publication tag exist!
      tag = ElementTag.where(taggable_type: 'Sample', taggable_id: s.id).first
      next if tag.taggable_data['publication'].nil?

      doi = Doi.where(doiable_type: 'Sample', doiable_id: s.id).first
      next if doi.nil?
      # pub.doi = doi unless doi.nil?

      pub = Publication.create!(
        state: 'start',
        element_id: s.id,
        element_type: 'Sample',
        doi: doi
      )

      orig_elements = ElementTag.where(["taggable_type=(?) and taggable_data->>'public_sample' = (?)", 'Sample', s.id.to_s]).first
      unless orig_elements.nil?
        pub.original_element_type = 'Sample'
        pub.original_element_id = orig_elements.taggable_id
      end

      pub.taggable_data = proc_taggable.call('Sample', s.id)

      #doi_path = pub.taggable_data['doi']
      doi_path = KIT_DOI + doi.suffix
      log_file.write "query datacite: #{Time.now.to_s}\n"
      sleep(0.5.second)
      pub.metadata_xml = proc_metaxml.call(doi_path)
      log_file.write("DIDNOT GET METADATA FROM DATACITE") unless pub.metadata_xml.present?
      pub.state = 'completed ver_20190116155110' unless pub.metadata_xml.nil?

      pub.save!
      log_file.write "#{pub.element_type} #{pub.element_id}: done with publication #{pub.id}\n "
      s.analyses&.each do |a|

        a_doi = Doi.where(doiable_type: 'Container', doiable_id: a.id).first
        next if a_doi.nil?

        pa = Publication.create!(
          state: 'start',
          element_id: a.id,
          element_type: 'Container',
          ancestry: pub.id.to_s,
          doi: a_doi
        )

        pa.taggable_data = proc_taggable.call('Container', a.id, 'Sample', s.id)

        unless orig_elements.nil?
          os = Sample.find(orig_elements.taggable_id)

          orig_analysis = os&.analyses&.select{ |oa| oa.extended_metadata['index'] == a.extended_metadata['index'] }
          if (orig_analysis&.length > 0)
            pa.original_element_type = 'Container'
            pa.original_element_id = orig_analysis[0].id
          end
        end

        # doi_path = pa.taggable_data['doi']
        doi_path = KIT_DOI + a_doi.suffix
        log_file.write "query datacite: #{Time.now.to_s}\n"
        pa.metadata_xml = proc_metaxml.call(doi_path)
        log_file.write("DIDNOT GET METADATA FROM DATACITE") unless pa.metadata_xml.present?
        pa.state = 'completed ver_20190116155110' unless pa.metadata_xml.nil?
        pa.save!
        log_file.write "#{pa.element_type} #{pa.element_id}: done with publication #{pa.id}\n "
      end
    end
    ensure
      log_file.close
    end
  end
end
