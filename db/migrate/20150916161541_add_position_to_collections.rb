class AddPositionToCollections < ActiveRecord::Migration[4.2]
  def change
    add_column :collections, :position, :integer unless column_exists?(:collections, :position)
  end
end
