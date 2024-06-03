# frozen_string_literal: true

# Chemotion module
module Chemotion
  # Services to call ORCID APIs
  module OrcidService
    def self.record_person(orcid)
      record = Orcid.record_seg(orcid, 'person')
      return nil if record.nil?

      record = Nokogiri::XML(record).to_xml
      record = Hash.from_xml(record).as_json
      emails = record.dig('person', 'emails', 'email')
      email = email['email'] if emails.is_a?(Hash)
      email = email = emails.first['email'] if emails.is_a?(Array)

      person = OpenStruct.new(
        given_names: record.dig('person', 'name', 'given_names'),
        family_name: record.dig('person', 'name', 'family_name'),
        email: email
      )
      result = OpenStruct.new(person: person)
      result
    end

    def self.record_employments(orcid)
      record = Orcid.record_seg(orcid, 'employments')
      return nil if record.nil?

      record = Nokogiri::XML(record).to_xml
      record = Hash.from_xml(record).as_json
      record['employments']['affiliation_group']
    end
  end
end
