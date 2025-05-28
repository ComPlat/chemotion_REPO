class CreateConcepts < ActiveRecord::Migration[6.1]
  def change
    create_table :concepts do |t|
      t.jsonb :taggable_data
      t.integer :doi_id
      t.text :metadata_xml
      t.datetime :deleted_at
      t.timestamps
    end
  end
end