module Entities
    class DoiEntity < Grape::Entity
      expose :id, :inchikey, :suffix, :full_doi
    end
  end
