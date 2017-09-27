module Entities
  class PublicationEntity < Grape::Entity
    expose :element_id, :element_type, :taggable_data
    expose :svg
    expose :analysis_type
    expose :children, as: 'children', using: Entities::PublicationEntity
    expose :dois

    def dois
      # od = object.descendants&.sort { |x, y| y.id <=> x.id }
      # dois = od&.map{ |o| o.taggable_data['doi'] }

      ([object] + object.descendants)&.map{ |o| o.doi.full_doi }
    end
    def svg
      s = object.element&.reaction_svg_file if object.element_type == 'Reaction'
      s = object.element&.sample_svg_file if object.element_type == 'Sample'
      s
    end
    def analysis_type
      analysis_type = object.element&.extended_metadata['kind'] if object.element_type == 'Container'
    end
  end
end
