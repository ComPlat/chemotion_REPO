# frozen_string_literal: true

module Entities
  module Concerns
    module RepoContainerHelper
      def get_link(container)
        target_container = Container.find(container.extended_metadata['target_id'])
        # Instead of using hash_tree, get the children directly
        target_children = target_container.children
        link = get_analysis(target_container, target_children)
        link.link_id = container.id # attr_accessor link_id on Container
        link
      end

      def get_analysis(container, children)
        # Reuses the existing Container record and decorates it in memory for rendering.
        analysis = container
        analysis.assign_attributes(container.attributes.slice('id', 'container_type', 'name', 'description'))
        analysis.dataset_doi = container.full_doi if container.respond_to? :full_doi
        analysis.pub_id = container.publication&.id if container.respond_to? :publication
        analysis.extended_metadata = container.extended_metadata

        dids = []

        # Map children to Container objects as well
        analysis.children = children.map do |child|
          ds = child
          ds.assign_attributes(child.attributes.slice('id', 'container_type', 'name', 'description'))
          ds.dataset_doi = child.full_doi if child.respond_to? :full_doi
          ds.pub_id = child.publication&.id if child.respond_to? :publication
          ds.extended_metadata = child.extended_metadata
          dids << ds.id
          ds
        end

        # Assign preview_img
        analysis.preview_img = dids

        analysis
      end

      def get_extended_metadata(container)
        ext_mdata = container.extended_metadata
        return ext_mdata unless ext_mdata
        ext_mdata['report'] = ext_mdata['report'] == 'true' || ext_mdata == true
        unless ext_mdata['content'].blank?
          ext_mdata['content'] = JSON.parse(container.extended_metadata['content'])
        end
        unless ext_mdata['hyperlinks'].blank?
          ext_mdata['hyperlinks'] = JSON.parse(container.extended_metadata['hyperlinks'])
        end
        ext_mdata
      end

      def concept_doi
        object&.concept_doi if ENV['REPO_VERSIONING'] == 'true'
      end

      def versions
        return nil unless object.container_type == 'analysis'

        object.versions.map do |container|
          { doi: container.full_doi, id: container.id }
        end
      end

      def dataset_doi
        object.full_doi
      end

      def pub_id
        object.publication&.id
      end
    end
  end
end
