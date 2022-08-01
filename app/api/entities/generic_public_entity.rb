# frozen_string_literal: true

# Entity module
module Entities
  class GenericPublicEntity < GenericEntity
    unexpose :id
    unexpose :is_active
    unexpose :place
    unexpose :element_klass_id
    unexpose :ols_term_id
    unexpose :is_generic
    unexpose :uuid
    unexpose :properties_release
    unexpose :element_klass
  end
end
