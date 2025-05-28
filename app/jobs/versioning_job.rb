# frozen_string_literal: true

class VersioningJob < ApplicationJob
  include ActiveJob::Status
  queue_as :versioning

  def max_attempts
    1
  end

  VALID_TYPES = %w[reactions samples containers].freeze

  def perform(type, element, parent, analysis, link, current_user, scheme_only)
    raise ArgumentError, "Invalid type: #{type}" unless VALID_TYPES.include?(type)

    if type == 'containers'
      Repo::VersionHandler.create_new_containers_version(element, analysis, link, current_user)
    else
      method_name = "create_new_#{type}_version"
      Repo::VersionHandler.send(method_name, element, parent, scheme_only, current_user)
    end
  rescue => e
    Rails.logger.error("Versioning failed for #{type}: #{e.message}")
    raise
  end
end