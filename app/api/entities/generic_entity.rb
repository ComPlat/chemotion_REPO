# frozen_string_literal: true

# Entity module
module Entities
  class GenericEntity < Grape::Entity
    expose :id, :is_active, :label, :desc, :place, :released_at

    expose :element_klass_id do |obj|
      obj[:element_klass_id] || 0
    end

    expose :klass_name do |obj|
      obj[:name] || ''
    end

    expose :ols_term_id do |obj|
      obj[:ols_term_id] || ''
    end

    expose :icon_name do |obj|
      obj[:icon_name] || ''
    end

    expose :klass_prefix do |obj|
      obj[:klass_prefix] || ''
    end

    expose :is_generic do |obj|
      obj[:is_generic] || true
    end

    expose :uuid do |obj|
      obj[:uuid] || ''
    end

    expose :properties_release do |obj|
      obj[:properties_release] || {}
    end

    expose :element_klass do |obj|
      if obj[:element_klass_id]
        Entities::GenericEntity.represent(obj.element_klass)
      else
        {}
      end
    end

    expose :identifier do |obj|
      obj[:identifier] || ''
    end
  end
end
