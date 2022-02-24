class UpdateSampleCollectionTag < ActiveRecord::Migration[4.2]
  def change
    Sample.find_each do |s|
      s.update_tag!(collection_tag: true)
    end
  end
end
