class CollaborationGroupLead < ActiveRecord::Migration[6.1]
  def change
    unless column_exists? :users_collaborators, :is_group_lead
      add_column :users_collaborators, :is_group_lead, :boolean, default: false
    end
  end
end