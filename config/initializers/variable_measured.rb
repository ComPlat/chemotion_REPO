# frozen_string_literal: true

begin
  variable_measured_config = Rails.application.config_for(:variable_measured)
  Rails.application.configure do
    config.m = variable_measured_config
  end
rescue StandardError => e
  Rails.logger.error "Could not load variable measured. Error: #{e.message}"
  Rails.application.configure do
    config.m = {}.freeze
  end
end
