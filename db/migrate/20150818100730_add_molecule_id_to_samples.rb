class AddMoleculeIdToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :molecule_id, :integer unless column_exists?(:samples, :molecule_id)
    add_index :samples, :molecule_id, name: "index_samples_on_sample_id" unless index_exists?(:samples, :molecule_id, name: "index_samples_on_sample_id")
  end
end
