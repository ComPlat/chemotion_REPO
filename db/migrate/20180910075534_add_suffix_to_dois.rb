class AddSuffixToDois < ActiveRecord::Migration
  def change
    add_column :dois, :suffix, :string
    # remove_index(:dois, name: 'index_on_dois') if index_exists?(:dois, name: 'index_on_dois') 
    add_index(:dois, :suffix, unique: true)
  end
end
