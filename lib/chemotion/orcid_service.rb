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
      person = record['person']
      person = OpenStruct.new(
        given_names: person['name']['given_names'],
        family_name: person['name']['family_name']
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
