module Entities
  class CollaboratorEntity < Grape::Entity
    expose :id, :name, :initials, :email, :type, :first_name, :last_name
    expose :affiliations
    expose :orcid
    expose :current_affiliations
    expose :is_group_lead do |user, _|
      # First check for the instance variable
      if user.instance_variable_defined?('@is_group_lead')
        user.instance_variable_get('@is_group_lead')
      # Then fall back to the database relation if available
      elsif user.respond_to?(:users_collaborators) && user.users_collaborators.present?
        user.users_collaborators.first&.is_group_lead || false
      else
        false
      end
    end

    def orcid
      object.orcid
    end
  end
end
