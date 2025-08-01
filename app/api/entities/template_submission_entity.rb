# frozen_string_literal: true

module Entities
  class TemplateSubmissionEntity < ApplicationEntity
    expose :id
    expose :template_klass
    expose :template
    expose :metadata
    expose :origin
    expose :state
    expose :created_at
    expose :updated_at
    expose :deleted_at

    expose :state_label do |submission|
      submission.state.to_s.humanize
    end
  end
end
