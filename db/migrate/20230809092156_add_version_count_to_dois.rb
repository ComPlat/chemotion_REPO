class AddVersionCountToDois < ActiveRecord::Migration[5.2]
  def change
    add_column :dois, :version_count, :int, :default => 0

    remove_index(:dois, [:inchikey, :molecule_count, :analysis_type, :analysis_count])
    add_index(:dois, [:inchikey, :molecule_count, :analysis_type, :analysis_count, :version_count], unique: true, name: 'index_on_dois')
  end
end