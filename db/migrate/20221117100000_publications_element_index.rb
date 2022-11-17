class PublicationsElementIndex < ActiveRecord::Migration[5.2]
  def change
    add_index :publications, [:element_type, :element_id, :deleted_at], name: 'publications_element_idx'
  end
end
