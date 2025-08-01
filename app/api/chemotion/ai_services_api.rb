# frozen_string_literal: true

module Chemotion
  class AiServicesAPI < Grape::API
    resource :ai_services do
      before do
        error!('401 Unauthorized', 401) if current_user.blank?
      end

      resource :translate do
        desc 'Translate text to English using TranslationService'
        params do
          requires :text, type: String, desc: 'Text to translate'
        end
        post do
          service = TranslationService.new(params[:text])
          translated_text = service.translate

          if translated_text.present?
            { translated_text: translated_text, success: true }
          else
            error!({ error: 'Translation failed', success: false }, 500)
          end
        rescue StandardError => e
          Rails.logger.error("Translation API error: #{e.message}")
          error!({ error: e.message, success: false }, 500)
        end
      end

      resource :transcribe do
        desc 'Transcribe audio file to text using TranscriptionService'
        params do
          requires :file, type: File, desc: 'Audio file to transcribe'
          optional :language, type: String, desc: 'Language code (e.g., en, de)', default: 'en'
        end
        post do
          audio_file = params[:file]
          language = params[:language] || 'en'

          service = TranscriptionService.new(audio_file, language)
          result = service.transcribe

          if result[:error]
            error!({ error: result[:error], success: false }, 500)
          else
            { transcription: result, success: true }
          end
        rescue StandardError => e
          Rails.logger.error("Transcription API error: #{e.message}")
          error!({ error: e.message, success: false }, 500)
        end
      end
    end
  end
end
