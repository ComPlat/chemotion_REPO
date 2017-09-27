class UpdateSampleCollectionTag < ActiveRecord::Migration
  def change
    Sample.find_each do |s|
      s.update_tag!(collection_tag: true)
    end
  end
end
