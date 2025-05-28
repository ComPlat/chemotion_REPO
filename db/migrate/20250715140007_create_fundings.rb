class CreateFundings < ActiveRecord::Migration[6.1]
  def change
    create_table :fundings do |t|
      t.string :element_type, null: false
      t.integer :element_id, null: false
      t.jsonb :metadata, null: false, default: {}
      t.datetime :created_at, null: false
      t.integer :created_by, null: false
      t.datetime :deleted_at
      t.integer :deleted_by
    end

    add_index :fundings, %i[element_type element_id]
    add_index :fundings, :metadata, using: :gin
  end
end
