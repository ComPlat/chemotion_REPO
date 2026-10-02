class AddDescriptionAttrToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :description, :text, :default => "" unless column_exists?(:samples, :description)
  end
end
