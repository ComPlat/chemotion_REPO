module Repo
  class SubmissionApis
    def self.update_tag_doi(element)
      unless element.nil? || element&.doi.nil? || element&.tag.nil?
        mds = Datacite::Mds.new
        et = element.tag
        tag_data = (et.taggable_data && et.taggable_data['publication']) || {}
        tag_data['doi'] = "#{mds.doi_prefix}/#{element&.doi.suffix}"
        et.update!(
          taggable_data: (et.taggable_data || {}).merge(publication: tag_data)
        )
        if element&.class&.name == 'Reaction'
          element&.publication.children.each do |child|
            next unless child&.element&.class&.name == 'Sample'

            Repo::SubmissionApis.update_tag_doi(child.element)
          end
        end
      end
    rescue StandardError => e
      Rails.logger.error(e)
      raise e
    end

  end
end