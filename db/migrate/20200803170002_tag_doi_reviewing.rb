class TagDoiReviewing < ActiveRecord::Migration
  def change
    mds = Datacite::Mds.new

    Publication.where(state: ['pending','reviewed','accepted']).each do |pub|
      element = pub.element
      next if element.nil? || element.doi.nil? || element.tag.nil?
      et = element.tag
      tag_data = (et.taggable_data && et.taggable_data['publication']) || {}
      tag_data['doi'] = "#{mds.doi_prefix}/#{element&.doi.suffix}"
      et.update!(
        taggable_data: (et.taggable_data || {}).merge(publication: tag_data)
      )  
    end
    rescue Exception => e
  end
end

