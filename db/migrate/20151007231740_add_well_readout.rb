class AddWellReadout < ActiveRecord::Migration[4.2]
  def change
    add_column :wells, :readout, :string, null: true  unless column_exists?(:wells, :readout)
    add_column :wells, :additive, :string, null: true unless column_exists?(:wells, :additive)
  end
end
