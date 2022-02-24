class UpdateRepositoryUserLayoutDefault < ActiveRecord::Migration[4.2]
  def change
    change_column :users, :layout, :hstore, default: {
      sample: 1,
      reaction: 2
    }
  end
end
