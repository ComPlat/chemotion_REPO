class AddAncestryToPublications < ActiveRecord::Migration
  def change
    add_column :publications, :ancestry, :string
    add_index :publications, :ancestry
  end
end
