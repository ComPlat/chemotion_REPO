class EmbargoElementState < ActiveRecord::Migration[6.1]
  def change
    Publication.where(element_type: 'Collection').each do |pub|
      taggable_data = pub.taggable_data || {}
      element_dois = taggable_data['element_dois'] || []
      element_dois.map do |doi|
        sub_pub = Publication.find_by(doi: doi['id'])
        if sub_pub.present?
          doi['state'] = sub_pub.state
        end
        doi
      end
      taggable_data['element_dois'] = element_dois
      pub.update_columns(taggable_data: taggable_data)
    end

    Publication.where(element_type: 'Collection', state: ['reviewed', 'pending', 'accepted']).each do |pub|
      pub.refresh_embargo_metadata
    end
  end
end
