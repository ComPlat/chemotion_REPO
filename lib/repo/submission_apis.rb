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


    def self.duplicate_literals(element, literals)
      literals&.each do |lit|
        attributes = {
          literature_id: lit.literature_id,
          element_id: element.id,
          element_type: lit.element_type,
          category: 'detail',
          user_id: lit.user_id,
          litype: lit.litype
        }
        Literal.create(attributes)
      end
    rescue StandardError => e
      log_exception(e, method: __method__)
      raise e
    end

    def self.duplicate_fundings(new_element, original_element, current_user_id)
      return unless original_element.fundings.present?

      original_element.fundings.each do |funding|
        Funding.create!(
          element_type: new_element.class.name,
          element_id: new_element.id,
          metadata: funding.metadata,
          created_by: current_user_id
        )
      end
    rescue StandardError => e
      Rails.logger.error(e)
      raise e
    end

  end
end