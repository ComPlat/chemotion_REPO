class AddFirstNameAndLastNameToUsers < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :first_name, :string, null: false  unless column_exists?(:users, :first_name)
    add_column :users, :last_name, :string, null: false unless column_exists?(:users, :last_name)
  end
end
