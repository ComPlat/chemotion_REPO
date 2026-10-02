class AddMissingAttributesToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :purity, :float unless column_exists?(:samples, :purity)
    add_column :samples, :solvent, :string, :default => "" unless column_exists?(:samples, :solvent)
    add_column :samples, :impurities, :string, :default => "" unless column_exists?(:samples, :impurities)
    add_column :samples, :location, :string, :default => "" unless column_exists?(:samples, :location)
  end
end
