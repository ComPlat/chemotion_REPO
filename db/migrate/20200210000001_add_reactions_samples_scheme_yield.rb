class AddReactionsSamplesSchemeYield < ActiveRecord::Migration
  def change
    add_column :reactions_samples, :scheme_yield, :float
  end
end
