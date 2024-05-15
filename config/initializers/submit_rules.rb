# frozen_string_literal: true

begin
  exception_config = Rails.application.config_for(:submit_rules)
  Rails.application.configure do
    config.x = exception_config
  end
rescue StandardError => e
  Rails.logger.error "Could not load exception configuration. Error: #{e.message}"
  Rails.application.configure do
    config.x = {}.freeze
  end
end
