class AddPublishedAtPublications < ActiveRecord::Migration
def change
  add_column :publications, :published_by, :integer
  add_column :publications, :published_at, :datetime
  Publication.find_each do |p|
    p.published_at = p.taggable_data['published_at'] unless p.taggable_data['published_at'].nil?
    p.published_by = p.taggable_data['published_by']
    p.save!
  end
end
end