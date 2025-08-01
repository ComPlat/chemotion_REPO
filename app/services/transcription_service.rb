# frozen_string_literal: true

require 'faraday'
require 'json'

class TranscriptionService
  def initialize(audio_file, language = 'en')
    @audio_file = audio_file
    @language = language
    stt_config = Rails.configuration.stt&.config || {}
    @api_key = stt_config[:authorization]
    @api_url = stt_config.dig(:transcribe, :api) || 'https://ki-toolbox.scc.kit.edu/api/v1/audio/transcriptions'
  end

  def transcribe
    conn = Faraday.new(url: @api_url) do |f|
      f.request :multipart
      f.response :logger, Rails.logger, { headers: true, bodies: true } if Rails.env.development?
      f.adapter Faraday.default_adapter
      f.options.timeout = 60 # Audio processing may take longer
      f.options.open_timeout = 10
    end

    # Handle file from Grape params (it comes as a hash with :tempfile, :filename, :type)
    file_path = @audio_file[:tempfile].path
    file_type = @audio_file[:type]
    file_name = @audio_file[:filename]

    # Create multipart payload
    payload = {
      file: Faraday::UploadIO.new(file_path, file_type, file_name)
    }

    # Only include language parameter if it's not 'auto'
    payload[:language] = @language unless @language == 'auto'

    response = conn.post do |req|
      req.headers['Authorization'] = "Bearer #{@api_key}"
      req.headers['accept'] = 'application/json'
      req.body = payload
    end

    if response.success?
      JSON.parse(response.body)
    else
      Rails.logger.error("Transcription API error: #{response.status} - #{response.body}")
      { error: "API returned status #{response.status}", text: '' }
    end
  rescue StandardError => e
    Rails.logger.error("Transcription error: #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
    { error: e.message, text: '' }
  end
end
