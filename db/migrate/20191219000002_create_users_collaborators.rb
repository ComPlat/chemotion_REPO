class CreateUsersCollaborators < ActiveRecord::Migration[4.2]
  def change
    create_table :users_collaborators do |t|
      t.integer :user_id
      t.integer :collaborator_id
    end
  end
end
