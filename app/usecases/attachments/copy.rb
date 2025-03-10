# frozen_string_literal: true

module Usecases
  module Attachments
    class Copy
      ## For REPO
      def self.gen_file(att)
        copy_io = att.attachment_attacher.get.to_io
        new_file = File.new(copy_io.path)

        attacher = att.attachment_attacher
        attacher.attach new_file

        att.file_path = new_file.path
        att.save
      end

      def self.execute!(attachments, element, current_user_id)
        attachments.each do |attach|
          original_attach = Attachment.find attach[:id]
          copy_attach = Attachment.new(
            attachable_id: element.id,
            attachable_type: element.class.name,
            aasm_state: original_attach.aasm_state,
            con_state: original_attach.con_state,
            created_by: current_user_id,
            created_for: current_user_id,
            filename: original_attach.filename,
          )
          copy_attach.save

          copy_io = original_attach.attachment_attacher.get.to_io
          attacher = copy_attach.attachment_attacher
          attacher.attach copy_io
          copy_attach.file_path = copy_io.path
          copy_attach.save

          update_annotation(original_attach.id, copy_attach.id) if (original_attach.attachment_data && original_attach.attachment_data['derivatives'])

          if element.instance_of?(::ResearchPlan)
            element.update_body_attachments(original_attach.identifier, copy_attach.identifier)
          end
        end
      end

      def self.update_annotation(original_attach_id, copy_attach_id)
        loader = Usecases::Attachments::Annotation::AnnotationLoader.new
        svg = loader.get_annotation_of_attachment(original_attach_id)

        if svg.present?
          updater = Usecases::Attachments::Annotation::AnnotationUpdater.new
          updater.updated_annotated_string(svg, copy_attach_id)
        end
      rescue StandardError => e
        Attachment.logger.error <<~TXT
        ---------  #{self.class.name} update_annotation ------------
           original_attach_id: #{original_attach_id}
           copy_attach_id: #{copy_attach_id}

          Error Message:  #{e.message}
          Error:  #{e.backtrace.join("\n")}
        --------------------------------------------------------------------
        TXT
      end
    end
  end
end
