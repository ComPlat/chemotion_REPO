# frozen_string_literal: true

stt = {}

if File.exist? Rails.root.join('config', 'stt.yml')
  stt = begin
    Rails.application.config_for(:stt)
  rescue StandardError
    {}
  end
  if stt.present?
    Rails.application.configure do
      config.stt = ActiveSupport::OrderedOptions.new
      config.stt.config = stt
    end
  end
end
