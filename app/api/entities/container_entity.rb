module Entities
  class ContainerEntity < Grape::Entity
    expose :big_tree, merge: true
    expose :dataset_doi
  #  expose :doi, if: -> (obj, opts) { obj.respond_to? :doi}

    def dataset_doi
      object.full_doi
    end

    def pub_id
      object.publication&.id
    end

    def big_tree(container = object)
      @dataset_ids = {}
      bt = container.attributes.slice('id', 'container_type', 'name')
      bt['children'] = container.hash_tree[container].map do |c1, c2s|
        as = c1.attributes.slice('id', 'container_type', 'name')
        ## mapping analysis element
        as['children'] = c2s.map do |c2, c3s|
          if c2['container_type'] == 'link'
            get_link(c2)
          else
            get_analysis(c2, c3s)
          end
        end
        as
      end

      attachments = Attachment.where_container(@dataset_ids.values.flatten).to_a
      code_logs = CodeLog.where(source_id: @dataset_ids.keys, source: 'container').to_a

      bt.dig('children', 0, 'children')&.each do |container|
        update_analysis(container, attachments, code_logs)
      end
      bt
    end

    private

    def get_link(container)
      target_container = Container.find(container.extended_metadata['target_id'])
      target_children = target_container.hash_tree[target_container]
      link = get_analysis(target_container, target_children)
      link['link_id'] = container.id
      link
    end

    def get_analysis(container, children)
      analysis = container.attributes.slice('id', 'container_type', 'name', 'description')
      analysis['dataset_doi'] = container.full_doi  if container.respond_to? :full_doi
      analysis['pub_id'] = container.publication&.id  if container.respond_to? :publication
      analysis['extended_metadata'] = get_extended_metadata(container)
      dids = []
      ## mapping datasets
      analysis['children'] = children.map do |child, _|
        ds = child.attributes.slice('id', 'container_type', 'name', 'description')
        ds['dataset_doi'] = child.full_doi  if child.respond_to? :full_doi
        ds['pub_id'] = child.publication&.id  if child.respond_to? :publication
        dids << ds['id']
        ds['extended_metadata'] = get_extended_metadata(child)
        ds
      end
      @dataset_ids[analysis['id']] = dids
      analysis['preview_img'] = dids
      analysis
    end

    def update_analysis(analysis, attachments, code_logs)
      analysis['dataset_doi'] = analysis.full_doi if analysis.respond_to? :full_doi
      analysis['pub_id'] = analysis.publication&.id if analysis.respond_to? :publication
      analysis['preview_img'] = preview_img(@dataset_ids[analysis['id']], attachments)
      analysis['code_log'] = code_logs.find { |cl| cl.source_id == analysis['id'] }.attributes
      analysis['children'].each do |ds_entity|
        atts = attachments.select { |a| a.attachable_id == ds_entity['id'] }
        ds_entity['attachments'] = Entities::AttachmentEntity.represent(atts)
        gds = Dataset.find_by(element_type: 'Container', element_id: ds_entity['id'])
        ds_entity['dataset'] = Entities::DatasetEntity.represent(gds) if gds.present?
      end
      analysis
    end

    def preview_img(container_ids, attachments)
      attachments = attachments.select do |a|
        a.thumb == true && a.attachable_type == 'Container' && container_ids.include?(a.attachable_id)
      end

      image_atts = attachments.select do |a_img|
        a_img&.content_type&.match(Regexp.union(%w[jpg jpeg png tiff]))
      end

      image_atts = image_atts.sort_by{ |a_img| a_img[:id] }.reverse

      attachment = image_atts[0] || attachments[0]

      preview = attachment.read_thumbnail if attachment
      result = if preview
        { preview: Base64.encode64(preview), id: attachment.id, filename: attachment.filename }
      else
        { preview: 'not available', id: nil, filename: nil }
      end
      result
    end

    def get_extended_metadata(container)
      ext_mdata = container.extended_metadata || {}
      ext_mdata['report'] = (ext_mdata['report'] == 'true') || (ext_mdata == true)
      ext_mdata['content'] = JSON.parse(ext_mdata['content'])  if ext_mdata['content'].present?
      ext_mdata['hyperlinks'] = JSON.parse(ext_mdata['hyperlinks']) if ext_mdata['hyperlinks'].present?
      ext_mdata
    end
  end
end
