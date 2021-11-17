# frozen_string_literal: true

# Entity module
module Entities
  class ReactionPublicationListEntity < Grape::Entity
    expose :id, :reaction_svg_file, :name

    expose :embargo do |obj|
      obj[:embargo] || ''
    end

    expose :taggable_data do |obj|
      obj[:taggable_data] || {}
    end

    expose :pub_id do |obj|
      obj[:pub_id] || ''
    end

    expose :published_at do |obj|
      obj[:published_at] || ''
    end

    expose :ana_cnt do |obj|
      obj[:ana_cnt] || ''
    end
  end
end
