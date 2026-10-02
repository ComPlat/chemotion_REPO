# frozen_string_literal: true

module RepoContainer
  extend ActiveSupport::Concern

  included do
    attr_accessor :dataset_doi, :pub_id, :preview_img, :link_id
    has_many :fundings, as: :fundable, foreign_key: :element_id, foreign_type: :element_type, dependent: :destroy

    scope :links_for_root, ->(root_id) {
      where(container_type: 'link').joins(
        "inner join container_hierarchies ch on ch.generations = 2 and ch.ancestor_id = #{root_id} and ch.descendant_id = containers.id "
      )
    }

    scope :analyses_container, ->(id) {
      where(container_type: 'analyses').joins(
        <<~SQL
          inner join container_hierarchies ch
          on (ch.ancestor_id = #{id} and ch.descendant_id = containers.id)
          or (ch.descendant_id = #{id} and ch.ancestor_id = containers.id)
        SQL
      )
    }
  end

  class_methods do

  end

  def remove_from_previous_version
    previous_version = self.tag&.taggable_data['previous_version']
    if previous_version
      previous_element = Container.find_by(id: previous_version['id'])
      previous_element.untag_as_previous_version
    end
  end

end
