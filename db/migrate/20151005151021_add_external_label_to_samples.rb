class AddExternalLabelToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :external_label, :string, default: ""  unless column_exists?(:samples, :external_label)
  end
end
