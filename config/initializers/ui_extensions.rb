# frozen_string_literal: true

begin
  ui_extensions_config = Rails.application.config_for(:ui_extensions)
  Rails.application.configure do
    config.u = ui_extensions_config
  end
rescue StandardError => e
  Rails.logger.error "Could not load ui configuration. Error: #{e.message}"
  Rails.application.configure do
    config.u = {}.freeze
  end
end
