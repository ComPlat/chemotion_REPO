# frozen_string_literal: true

require 'faraday'
require 'json'

class TranslationService
  def initialize(text)
    @text = text
    stt_config = Rails.configuration.stt&.config || {}
    @api_key = stt_config[:authorization]
    @api_url = stt_config.dig(:translate, :api) || 'https://ki-toolbox.scc.kit.edu/api/v1/chat/completions'
    @model = stt_config.dig(:translate, :model) || 'azure.gpt-4.1-mini'
    @sys_prompt = stt_config.dig(:translate, :prompt) || "You are a professional translator. Translate the user's text accurately into English. Preserve all meaning, tone, and formatting. Do not explain, summarize, or comment. Output only the translated text."
  end

  def translate
    conn = Faraday.new(url: @api_url) do |f|
      f.request :json
      f.response :logger, Rails.logger, { headers: true, bodies: true } if Rails.env.development?
      f.adapter Faraday.default_adapter
      f.options.timeout = 15 # seconds
      f.options.open_timeout = 5
    end

    response = conn.post do |req|
      req.headers['Authorization'] = "Bearer #{@api_key}"
      req.headers['Content-Type'] = 'application/json'
      req.body = {
        model: @model,
        messages: [
          { role: 'system', content: @sys_prompt },
          { role: 'user', content: @text },
        ],
        temperature: 0.0, # ensures the model will reliably translate the text without adding creative variations
      }
    end

    parsed = JSON.parse(response.body)
    parsed.dig('choices', 0, 'message', 'content')
  rescue StandardError => e
    Rails.logger.error("Translation error: #{e.message}")
    nil
  end
end
