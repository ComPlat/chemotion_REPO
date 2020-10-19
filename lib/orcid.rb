# frozen_string_literal: true

# ORCID APIs
module Orcid
  include HTTParty

  ORCID_API_VERSION = ENV['ORCID_API_VERSION'] || '3.0'

  def self.orcid_token
    ENV['ORCID_P_TOKEN']
  end

  def self.orcid_host
    'https://pub.orcid.org'
  end

  def self.record_seg(orcid, seg)
    url = "[HOST]/[VER]/[ORCID]/#{seg}"
    url = url.sub('[HOST]', orcid_host).sub('[VER]', ORCID_API_VERSION).sub('[ORCID]', orcid)
    auth = 'Bearer ' + orcid_token
    options = { headers: { 'Authorization' => auth } }
    begin
      res = HTTParty.get(url, options)
      return nil unless res.code == 200

      res.body.presence&.strip
    rescue StandardError => e
      Rails.logger.error "[RESCUE EXCEPTION] of [record_seg] with orcid [#{orcid}], seg [#{seg}], exception [#{e.inspect}]"
      return nil
    end
  end
end
