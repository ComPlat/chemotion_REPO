# frozen_string_literal: true

module Entities
  class FundingEntity < ApplicationEntity
    expose(
      :id,
      :element_type,
      :element_id,
      :metadata,
    )
  end
end
