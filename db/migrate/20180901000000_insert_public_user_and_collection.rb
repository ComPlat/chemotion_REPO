class InsertPublicUserAndCollection < ActiveRecord::Migration[4.2]
  class User < ActiveRecord::Base
    self.inheritance_column = nil
    devise :database_authenticatable
  end

  def change
    attributes = {
      email: 'public.user@eln.edu',
      first_name: 'Public',
      last_name: 'User',
      password: 'PleaseChangeYourPassword',
      name_abbreviation: 'CI',  # needs to be exactly that string
    }
    user = User.create!(attributes)
    user.update!(account_active: true) if column_exists?(:users, :account_active)
    user.update!(confirmed_at: DateTime.now) if column_exists?(:users, :account_active)

    Profile.create!(user_id: user.id)

    Collection.find_or_create_by(user_id: user.id, label: 'chemotion')
  end
end
