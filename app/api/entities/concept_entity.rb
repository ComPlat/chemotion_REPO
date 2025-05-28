module Entities
  class ConceptEntity < Grape::Entity
    expose :id
    expose :doi, using: Entities::DoiEntity
  end
end