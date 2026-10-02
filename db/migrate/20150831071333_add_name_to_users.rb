class AddNameToUsers < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :name, :string unless column_exists?(:users, :name)
  end
end
