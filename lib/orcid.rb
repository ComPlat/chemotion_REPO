# frozen_string_literal: true

# Class for interacting with the ORCID API
class Orcid
  require 'httparty'

  # Fetch a specific segment of an ORCID record
  # @param orcid [String] The ORCID ID
  # @param segment [String] The record segment to fetch (e.g., 'person', 'employments')
  # @return [String, nil] The XML response or nil if request failed
  def self.record_seg(orcid, segment)
    begin
      response = HTTParty.get(
        "https://pub.orcid.org/v3.0/#{orcid}/#{segment}",
        headers: { 'Accept' => 'application/xml' }
      )
      
      if response.code == 200
        return response.body
      else
        Rails.logger.error("Error fetching ORCID segment: #{response.code} - #{response.message}")
        return nil
      end
    rescue StandardError => e
      Rails.logger.error("ORCID API Error: #{e.message}")
      return nil
    end
  end
end
