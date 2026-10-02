# == Schema Information
#
# Table name: users_collaborators
#
#  id              :integer          not null, primary key
#  is_group_lead   :boolean          default(FALSE)
#  collaborator_id :integer
#  user_id         :integer
#

class UsersCollaborator < ApplicationRecord
  belongs_to :user
  belongs_to :collaborator, class_name: 'User', foreign_key: 'collaborator_id'
end
