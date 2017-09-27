class UpdateRepositoryUserLayoutDefault < ActiveRecord::Migration
  def change
    change_column :users, :layout, :hstore, default: {
      sample: 1,
      reaction: 2
    }
  end
end
