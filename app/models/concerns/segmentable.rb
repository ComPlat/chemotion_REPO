# frozen_string_literal: true

# Segmentable concern
module Segmentable
  extend ActiveSupport::Concern
  included do
    has_many :segments, as: :element, dependent: :destroy
  end

  def copy_segments(**args)
    return if args[:segments].nil?
    segments = save_segments(segments: args[:segments], current_user_id: args[:current_user_id])
    segments.each do |segment|
      properties = segment.properties
      properties['layers'].keys.each do |key|
        layer = properties['layers'][key]
        field_uploads = layer['fields'].select { |ss| ss['type'] == 'upload' }
        field_uploads&.each do |upload|
          idx = properties['layers'][key]['fields'].index(upload)
          files = upload["value"] && upload["value"]["files"]
          files&.each_with_index do |fi, fdx|
            aid = properties['layers'][key]['fields'][idx]['value']['files'][fdx]['aid']
            unless aid.nil?
              copied_att = Attachment.find(aid)&.copy(attachable_type: 'SegmentProps', attachable_id: segment.id, transferred: true)
              unless copied_att.nil?
                copied_att.save!
                properties['layers'][key]['fields'][idx]['value']['files'][fdx]['aid'] = copied_att.id
                properties['layers'][key]['fields'][idx]['value']['files'][fdx]['uid'] = copied_att.identifier
              end
            end
          end
        end
      end
      segment.update!(properties: properties)
    end

  end

  def save_segments(**args)
    return if args[:segments].nil?
    segments = []
    args[:segments].each do |seg|
      klass = SegmentKlass.find_by(id: seg['segment_klass_id'])
      uuid = SecureRandom.uuid
      props = seg['properties']
      props['eln'] = Chemotion::Application.config.version if props['eln'] != Chemotion::Application.config.version
      segment = Segment.find_by(element_type: self.class.name, element_id: self.id, segment_klass_id: seg['segment_klass_id'])
      if segment.present? && (segment.klass_uuid != props['klass_uuid'] || segment.properties != props)
        props['uuid'] = uuid
        props['eln'] = Chemotion::Application.config.version
        props['klass'] = 'Segment'

        segment.update!(properties: props, uuid: uuid, klass_uuid: props['klass_uuid'])
      end
      next if segment.present?

      props['uuid'] = uuid
      props['klass_uuid'] = klass.uuid
      props['eln'] = Chemotion::Application.config.version
      props['klass'] = 'Segment'
      segment = Segment.create!(segment_klass_id: seg['segment_klass_id'], element_type: self.class.name, element_id: self.id, properties: props, created_by: args[:current_user_id], uuid: uuid, klass_uuid: klass.uuid)
      segments.push(segment)
    end
    segments
  end
end
