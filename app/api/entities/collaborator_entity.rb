module Entities
    class CollaboratorEntity < Grape::Entity
      expose :id, :name, :initials, :email, :type
      expose :affiliations
    end
  end
