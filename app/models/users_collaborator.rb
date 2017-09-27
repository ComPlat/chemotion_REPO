# == Schema Information
#
# Table name: users_collaborators
#
#  id              :integer          not null, primary key
#  user_id         :integer
#  collaborator_id :integer
#

class UsersCollaborator < ActiveRecord::Base
end
