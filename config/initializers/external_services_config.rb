# frozen_string_literal: true

# Configuration manager for external services
class ExternalServicesConfig
  CONFIG_FILE = Rails.root.join('config', 'external_services.yml')

  class << self
    def config
      @config ||= load_config
    end

    def nmrxiv
      @nmrxiv_config ||= config.dig('nmrxiv') || {}
    end

    def nmrxiv_enabled?
      nmrxiv['enable_nmrxiv_service'] == true
    end

    def nmrxiv_base_url
      nmrxiv['base_url']
    end

    def nmrxiv_upload_url
      return nil unless nmrxiv_base_url && nmrxiv['upload_endpoint']

      "#{nmrxiv_base_url}#{nmrxiv['upload_endpoint']}"
    end

    def nmrxiv_timeout
      nmrxiv['timeout'] || 30
    end

    def nmrxiv_retry_attempts
      nmrxiv['retry_attempts'] || 3
    end

    # Repository Tracker configuration methods
    def repo_tracker
      @repo_tracker_config ||= config.dig('repo_tracker') || {}
    end

    def repo_tracker_enabled?
      repo_tracker['enable_service'] == true
    end

    def repo_tracker_base_url
      repo_tracker['base_url']
    end

    def repo_tracker_username
      repo_tracker['username']
    end

    def repo_tracker_password
      repo_tracker['password']
    end

    def repo_tracker_client_id
      repo_tracker['client_id']
    end

    def repo_tracker_name
      repo_tracker['tracker_name']
    end

    def nmrxiv_tracker_name
      repo_tracker['nmrxiv_tracker_name']
    end

    def repo_tracker_abbr
      repo_tracker['tracker_abbr']
    end

    def repo_tracker_oauth_endpoint
      return nil unless repo_tracker_base_url && repo_tracker['oauth_endpoint']

      "#{repo_tracker_base_url}#{repo_tracker['oauth_endpoint']}"
    end

    def repo_tracker_tracking_endpoint
      return nil unless repo_tracker_base_url && repo_tracker['tracking_endpoint']

      "#{repo_tracker_base_url}#{repo_tracker['tracking_endpoint']}"
    end

    def repo_tracker_retry_attempts
      repo_tracker['retry_attempts'] || 3
    end

    def reload!
      @config = nil
      @nmrxiv_config = nil
      @repo_tracker_config = nil
      load_config
    end

    private

    def load_config
      return {} unless File.exist?(CONFIG_FILE)

      raw_config = YAML.load_file(CONFIG_FILE, aliases: true)
      environment = Rails.env.to_s

      if raw_config[environment]
        raw_config[environment]
      else
        Rails.logger.warn "External services configuration not found for environment '#{environment}', using default"
        raw_config['default'] || {}
      end
    rescue => e
      Rails.logger.error "Failed to load external services configuration: #{e.message}"
      {}
    end
  end
end
