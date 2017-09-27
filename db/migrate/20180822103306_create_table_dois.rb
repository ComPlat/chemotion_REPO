class CreateTableDois < ActiveRecord::Migration
  def change
    create_table :dois do |t|
      t.integer :molecule_id
      t.string :inchikey
      t.integer :molecule_count
      t.integer :analysis_id
      t.string :analysis_type 
      t.integer :analysis_count
      t.jsonb :metadata, default: {}
      t.boolean :minted, default: false
      t.datetime :minted_at
      t.timestamps null: false
      t.integer :doiable_id
      t.string :doiable_type
    end

    add_foreign_key :dois, :molecules
    add_index(:dois, [:inchikey, :molecule_count, :analysis_type, :analysis_count], unique: true, name: 'index_on_dois')
  end
end
