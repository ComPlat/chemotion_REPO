class AddReactionsSamplesSchemeYield < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions_samples, :scheme_yield, :float
  end
end
