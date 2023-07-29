# frozen_string_literal: true

module Entities
  class ContainerEntity < ApplicationEntity
    THUMBNAIL_CONTENT_TYPES = %w[image/jpg image/jpeg image/png image/tiff].freeze
    expose(
      :id,
      :name,
      :container_type,
      :description,
      :extended_metadata,
    )
    expose :preview_img, if: ->(object, _options) { object.container_type == 'analysis' }

    expose :attachments, using: 'Entities::AttachmentEntity'
    expose :code_log, using: 'Entities::CodeLogEntity'
    expose :children, using: 'Entities::ContainerEntity'
    expose :dataset, using: 'Labimotion::DatasetEntity'
    expose :dataset_doi

    def dataset_doi
      object.full_doi
    end

    def pub_id
      object.publication&.id
    end

    def extended_metadata
      return unless object.extended_metadata

      report = (object.extended_metadata['report'] == 'true' || object.extended_metadata == 'true')
      {}.tap do |metadata|
        metadata[:report] = report
        metadata[:status] = object.extended_metadata['status']
        metadata[:kind] = object.extended_metadata['kind']
        metadata[:index] = object.extended_metadata['index']
        metadata[:instrument] = object.extended_metadata['instrument']
        metadata[:dataset_doi] = object.full_doi  if object.respond_to? :full_doi
        metadata[:pub_id] = object.publication&.id  if object.respond_to? :publication

        if object.extended_metadata['content'].present?
          metadata[:content] =
            JSON.parse(object.extended_metadata['content'])
        end
        if object.extended_metadata['hyperlinks'].present?
          metadata[:hyperlinks] =
            JSON.parse(object.extended_metadata['hyperlinks'])
        end
      end
    end

    private

    def preview_img(container_ids, attachments)
      attachments = attachments.select do |a|
        a.thumb == true && a.attachable_type == 'Container' && container_ids.include?(a.attachable_id)
      end

      image_atts = attachments.select do |a_img|
        a_img&.content_type&.match(Regexp.union(%w[jpg jpeg png tiff]))
      end

      attachments_with_thumbnail = Attachment.where(
        thumb: true,
        attachable_type: 'Container',
        attachable_id: object.children.where(container_type: :dataset),
      )
      return no_preview_image_available unless attachments_with_thumbnail.exists?

      atts_with_thumbnail = attachments_with_thumbnail.where(
        "attachment_data -> 'metadata' ->> 'mime_type' in (:value)",
        value: THUMBNAIL_CONTENT_TYPES,
      ).order(updated_at: :desc)

      combined_image_attachment = atts_with_thumbnail.where('filename LIKE ?', '%combined%').first

      latest_image_attachment = atts_with_thumbnail.first

      attachment = combined_image_attachment || latest_image_attachment || attachments_with_thumbnail.first
      preview_image = attachment.read_thumbnail
      return no_preview_image_available unless preview_image

      {
        preview: Base64.encode64(preview_image),
        id: attachment.id,
        filename: attachment.filename,
      }
    end

    def no_preview_image_available
      { preview: 'not available', id: nil, filename: nil }
    end
  end
end
