# frozen_string_literal: true

# Helper for public API
module PublicHelpers
  extend Grape::API::Helpers
  include ApplicationHelper

  def send_notification(attachment, user, status, has_error = false)
    data_args = { 'filename': attachment.filename, 'comment': 'the file has been updated' }
    level = 'success'
    if has_error
      data_args['comment'] = ' an error has occurred, the file is not changed.'
      level = 'error'
    elsif status == 4
      data_args['comment'] = ' file has not changed.'
      level = 'info'
    elsif @status == 7
      data_args['comment'] = ' an error has occurred while force saving the document, please review your changes.'
      level = 'error'
    end
    Message.create_msg_notification(
      channel_subject: Channel::EDITOR_CALLBACK, message_from: user.id,
      data_args: data_args, attach_id: attachment.id, research_plan_id: attachment.attachable_id, level: level
    )
  end

  def de_encode_json(json, key = '', viv = '', encode = true)
    if encode
      encode_json(json)
    else
      decode_json(json, key, viv)
    end
  end

  def convert_to_3d(molfile)
    molecule_viewer = Matrice.molecule_viewer
    if molecule_viewer.blank? || molecule_viewer[:chembox_endpoint].blank?
      { molfile: molfile }
    else
      options = { timeout: 10, body: { mol: molfile }.to_json, headers: { 'Content-Type' => 'application/json' } }
      response = HTTParty.post(molecule_viewer[:chembox_endpoint], options)
      response.code == 200 ? { molfile: response.parsed_response } : { molfile: molfile }
    end
  end

  def raw_file(att)
    Base64.encode64(att.read_file)
  rescue StandardError
    nil
  end

  def raw_file_obj(att)
    {
      id: att.id,
      file: raw_file(att),
      predictions: JSON.parse(att.get_infer_json_content),
    }
  end

  def add_to_zip_and_update_file_text(zip, filename, file_content)
    zip.put_next_entry filename
    zip.write file_content
    "#{filename} #{Digest::MD5.hexdigest(file_content)}\n"
  end

  def export_and_add_to_zip(container_id, zip)
    return '' if Labimotion::Dataset.find_by(element_id: container_id, element_type: 'Container').blank?
    export = Labimotion::ExportDataset.new
    export.export(container_id)
    export.spectra(container_id)
    export_file_name = export.res_name(container_id)
    zip.put_next_entry export_file_name
    export_file_content = export.read
    export_file_checksum = Digest::MD5.hexdigest(export_file_content)
    zip.write export_file_content
    "#{export_file_name} #{export_file_checksum}\n"
  end

  def prepare_and_export_dataset(container_id)
    env['api.format'] = :binary
    export = Labimotion::ExportDataset.new
    export.export(container_id)
    export.spectra(container_id)

    content_type('application/vnd.ms-excel')
    ds_filename = export.res_name(container_id)
    filename = URI.encode_www_form_component(ds_filename)
    header('Content-Disposition', "attachment; filename=\"#{filename}\"")

    export.read
  end
end
