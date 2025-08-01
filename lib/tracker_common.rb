# frozen_string_literal: true

module TrackerCommon
  module_function

  def extract_hostname_without_tld
    url = ENV['PUBLIC_URL'] || 'ChemotionRepository'
    return 'ChemotionRepository' if url.nil? || url.empty? || url == 'ChemotionRepository'

    begin
      uri = URI.parse(url)
      hostname = uri.host
      return 'ChemotionRepository' if hostname.nil?

      # Remove 'www.' if present
      hostname = hostname.sub(/^www\./, '')

      # Remove the last part (TLD)
      parts = hostname.split('.')
      return hostname if parts.length <= 1

      parts[0..-2].join('.')
    rescue URI::InvalidURIError
      'ChemotionRepository'
    end
  end
end
