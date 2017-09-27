namespace :data do
  desc 'Copy image file to public folder'
  task ver_20190128000004_copy_image_to_public: :environment do
    attachments = Attachment.joins("inner join containers on containers.id = attachments.attachable_id")
    .joins("inner join publications on publications.element_id = containers.parent_id")
    .where("attachments.attachable_type = 'Container' and containers.container_type = 'dataset' and publications.element_type = 'Container' and publications.state = 'completed'")

    attachments.each do |att|
      # copy publication image file to public/images/publications/{attachment.id}/{attachment.filename}
      if MimeMagic.by_path(att.filename)&.type&.start_with?("image")
        file_path = File.join('public/images/publications/', att.id.to_s, '/', att.filename)
        public_path = File.join('public/images/publications/', att.id.to_s)
        FileUtils.mkdir_p(public_path)
        File.write(file_path, att.store.read_file.force_encoding("utf-8")) if att.store.file_exist?
      end
    end
  end
end
