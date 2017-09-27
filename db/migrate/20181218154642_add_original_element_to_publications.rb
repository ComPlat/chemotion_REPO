class AddOriginalElementToPublications < ActiveRecord::Migration
  def change
    add_column :publications, :original_element_type, :string
    add_column :publications, :original_element_id, :integer
  end
end
