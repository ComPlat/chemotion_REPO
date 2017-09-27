module Entities
    class CollaboratorEntity < Grape::Entity
      expose :id, :name, :initials, :email, :type
      expose :affiliations
      expose :orcid
      expose :current_affiliations

    def orcid
      object.orcid
    end
  end
end
