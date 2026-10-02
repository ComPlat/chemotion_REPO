require 'httparty'

module Repo
  class NmrxivService
    include HTTParty

    def nmrxiv_logger
      LoggerConfig.nmrxiv_logger
    end

    def initialize
      base_url = ExternalServicesConfig.nmrxiv_base_url || 'https://dev.nmrxiv.org/api'
      self.class.base_uri base_url
    end

    def authenticate(username, password)
      response = self.class.post('/auth/login', {
        body: {
          email: username,
          password: password
        }.to_json,
        headers: {
          'Content-Type' => 'application/json',
          'Accept' => 'application/json'
        }
      })

      handle_response(response) do |data|
        {
          success: true,
          access_token: data['access_token'],
          refresh_token: data['refresh_token'],
          expires_at: calculate_expires_at(data['expires_in']),
          user_info: data['user']
        }
      end
    end

    def refresh_token(refresh_token)
      response = self.class.post('/auth/refresh', {
        body: {
          refresh_token: refresh_token
        }.to_json,
        headers: {
          'Content-Type' => 'application/json',
          'Accept' => 'application/json'
        }
      })

      handle_response(response) do |data|
        {
          success: true,
          access_token: data['access_token'],
          refresh_token: data['refresh_token'],
          expires_at: calculate_expires_at(data['expires_in'])
        }
      end
    end

    def validate_token(access_token)
      response = self.class.get('/auth/validate', {
        headers: {
          'Authorization' => "Bearer #{access_token}",
          'Accept' => 'application/json'
        }
      })

      handle_response(response) do |data|
        {
          success: true,
          valid: true,
          user_info: data['user']
        }
      end
    end

    def get_user_projects(access_token)
      response = self.class.get('/projects', {
        headers: {
          'Authorization' => "Bearer #{access_token}",
          'Accept' => 'application/json'
        }
      })

      handle_response(response) do |data|
        {
          success: true,
          projects: data['projects'] || data
        }
      end
    end

    private

    def handle_response(response)
      case response.code
      when 200, 201
        data = response.parsed_response
        if block_given?
          yield(data)
        else
          { success: true, data: data }
        end
      when 401
        { success: false, error: 'Unauthorized - Invalid credentials or token' }
      when 400
        error_message = response.parsed_response.dig('message') || 'Bad request'
        { success: false, error: error_message }
      when 403
        error_message = response.parsed_response.dig('message') || 'Forbidden - You do not have permission to access this resource'
        { success: false, error: error_message }
      when 404
        { success: false, error: 'Endpoint not found' }
      when 500
        { success: false, error: 'Internal server error' }
      else
        { success: false, error: "HTTP #{response.code}: #{response.parsed_response.dig('message') || 'Bad request'}" }
      end
    rescue JSON::ParserError
      { success: false, error: 'Invalid JSON response' }
    rescue StandardError => e
      nmrxiv_logger.error "NMRXiv API Error: #{e.message}"
      nmrxiv_logger.error(e.backtrace.join("\n"))
      { success: false, error: e.message }
    end

    def calculate_expires_at(expires_in)
      return nil unless expires_in

      Time.current + expires_in.to_i.seconds
    end
  end
end
