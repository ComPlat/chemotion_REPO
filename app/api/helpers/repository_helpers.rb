module RepositoryHelpers
  extend Grape::API::Helpers

  def update_public_comment(params, current_user)
    pub = Publication.find_by(element_type: params[:type], element_id: params[:id])
    review = pub.review || {}
    review_info = review['info'] || {}
    review_info['comment'] = params[:comment]
    review_info['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')
    review_info['username'] = current_user.name
    review_info['userid'] = current_user.id

    review['info'] = review_info
    pub.update!(review: review)
  rescue StandardError => e
    Publication.repo_log_exception(e, { params: params, user_id: current_user&.id })
    raise
  end

  def update_compound(pub, params, current_user)
    data = pub.taggable_data || {}
    xvial = data['xvial'] || {}
    xvial['num'] = params[:data]
    xvial['comp_num'] = params[:xcomp]
    xvial['username'] = current_user.name
    xvial['userid'] = current_user.id
    xvial['timestamp'] = Time.now.strftime('%d-%m-%Y %H:%M:%S')
    data['xvial'] = xvial
    pub.update!(taggable_data: data)
  rescue StandardError => e
    Publication.repo_log_exception(e, { pub: pub&.id, user_id: current_user&.id, params: params })
    raise
  end

  def metadata_preview(root_publication, current_user)
    mt = []
    root_publication = root_publication
    publications = [root_publication] + root_publication.descendants
    publications.each do |pub|
      next if pub.element.nil?

      mt.push(element_type: pub.element_type, metadata_xml: pub.datacite_metadata_xml)
    end
  rescue StandardError => e
    Publication.repo_log_exception(e, { root_publication: root_publication&.id, user_id: current_user&.id })
    { metadata: mt }
  end

  def metadata_preview_zip(root_publication, current_user)
    publications = [root_publication] + root_publication.descendants
    filename = URI.escape("metadata_#{root_publication.element_type}_#{root_publication.element_id}-#{Time.new.strftime('%Y%m%d%H%M%S')}.zip")
    header('Content-Disposition', "attachment; filename=\"#{filename}\"")
    zip = Zip::OutputStream.write_buffer do |zip|
      publications.each do |pub|
        next if pub.element.nil?

        el_type = pub.element_type == 'Container' ? 'analysis' : pub.element_type.downcase
        zip.put_next_entry URI.escape("metadata_#{el_type}_#{pub.element_id}.xml")
        zip.write pub.datacite_metadata_xml
      end
    end
    zip.rewind
    zip.read
  rescue StandardError => e
    Publication.repo_log_exception(e, { root_publication: root_publication&.id, user_id: current_user&.id })
    raise
  end

  private

end