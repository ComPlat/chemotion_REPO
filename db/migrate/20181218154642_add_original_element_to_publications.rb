class AddOriginalElementToPublications < ActiveRecord::Migration[4.2]
  def change
    add_column :publications, :original_element_type, :string
    add_column :publications, :original_element_id, :integer
  end
end
