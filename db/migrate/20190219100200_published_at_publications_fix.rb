class PublishedAtPublicationsFix < ActiveRecord::Migration
def change
  list = Publication.where(published_at: nil)
  list.each do |p|
    p.update_columns(published_at: p.taggable_data['published_at']) unless p.taggable_data['published_at'].nil?
    p.update_columns(published_by: p.taggable_data['published_by']) unless p.taggable_data['published_by'].nil?
  end
end
end
