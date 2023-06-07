class AddAncestryToPublications < ActiveRecord::Migration[4.2]
  def change
    add_column :publications, :ancestry, :string
    add_index :publications, :ancestry
  end
end
