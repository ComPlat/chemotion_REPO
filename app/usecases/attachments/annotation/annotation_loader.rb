# frozen_string_literal: true

# Class for loading an annotation of an attachment with the shrine infrastructure
module Usecases
  module Attachments
    module Annotation
      class AnnotationLoader
        def get_annotation_of_attachment(attachment_id)
          att = Attachment.find(attachment_id)
          raise 'could not find attachment' unless att
          raise 'could not find annotation of attachment' unless annotatable?(att.attachment_data)

          att = create_empty_annotation(att) unless annotation_json_present(att.attachment_data)
          location_of_annotation = att.attachment(:annotation)&.url
          annotation = File.open(location_of_annotation, 'rb') if location_of_annotation && File.exist?(location_of_annotation)
          # raise 'could not find annotation of attachment (file not found)' unless annotation

          annotation.read.force_encoding('UTF-8') if annotation
        rescue StandardError => e
          Attachment.logger.error <<~TXT
          ---------  #{self.class.name} get_annotation_of_attachment ------------
            attachment_id: #{attachment_id}

            Error Message:  #{e.message}
            Error:  #{e.backtrace.join("\n")}
          --------------------------------------------------------------------
          TXT
        end

        def annotation_json_present(data)
          data['derivatives']['annotation'] &&
            data['derivatives']['annotation']['id']
        end

        def annotatable?(data)
          data && data['derivatives']
        end

        def create_empty_annotation(att)
          att.attachment_attacher.create_derivatives
          att.update_column('attachment_data', att.attachment_data) # rubocop:disable Rails/SkipsModelValidations

          att
        end
      end
    end
  end
end
