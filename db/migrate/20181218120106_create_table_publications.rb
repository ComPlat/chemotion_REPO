class CreateTablePublications < ActiveRecord::Migration
  def change
    create_table :publications do |t|
      t.string :state
      t.jsonb :metadata, default: {}
      t.jsonb :taggable_data, default: {}
      t.jsonb :dois, default: {}
      t.string :element_type
      t.integer :element_id
      t.integer :doi_id
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
    end
  end
end
