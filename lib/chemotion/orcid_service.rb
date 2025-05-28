# frozen_string_literal: true

# Chemotion module
module Chemotion
  # Services to call ORCID APIs
  module OrcidService
    def self.record_person(orcid)
      return nil unless valid_format?(orcid)
      
      record = Orcid.record_seg(orcid, 'person')
      return nil if record.nil?

      record = Nokogiri::XML(record).to_xml
      record = Hash.from_xml(record).as_json
      emails = record.dig('person', 'emails', 'email')
      email = emails['email'] if emails.is_a?(Hash)
      email = emails.first['email'] if emails.is_a?(Array)

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
    
    def self.valid_format?(orcid_id)
      # ORCID IDs follow the format: 0000-0000-0000-0000
      orcid_id.to_s.match?(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)
    end
    
    # Check if names from ORCID record match user's names in the system
    # Handles umlaut equivalents (ä = ae, ö = oe, ü = ue)
    # @param user [User] The user object
    # @param orcid_data [OpenStruct] The ORCID data with person information
    # @return [Boolean] True if names match
    def self.names_match?(user, orcid_data)
      return false unless orcid_data&.person
      
      user_first_name = normalize_name(user.first_name.to_s)
      user_last_name = normalize_name(user.last_name.to_s)
      orcid_first_name = normalize_name(orcid_data.person.given_names.to_s)
      orcid_last_name = normalize_name(orcid_data.person.family_name.to_s)
      
      # Check for exact match
      exact_match = user_first_name == orcid_first_name && user_last_name == orcid_last_name
      
      # Check for equivalence with umlaut substitutions
      umlaut_match = names_equivalent?(user_first_name, orcid_first_name) && 
                    names_equivalent?(user_last_name, orcid_last_name)
      
      exact_match || umlaut_match
    end
    
    # Normalize a name for comparison (lowercase, trim whitespace)
    # @param name [String] The name to normalize
    # @return [String] The normalized name
    def self.normalize_name(name)
      name.downcase.strip
    end
    
    # Check if two names are equivalent considering umlaut substitutions
    # @param name1 [String] First name to compare
    # @param name2 [String] Second name to compare
    # @return [Boolean] True if names are equivalent
    def self.names_equivalent?(name1, name2)
      return true if name1 == name2
      return false if name1.blank? || name2.blank?
      
      # Convert umlaut to equivalent in both directions and compare
      umlaut_to_equivalent = {
        'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue',
        'Ä' => 'Ae', 'Ö' => 'Oe', 'Ü' => 'Ue',
        'ß' => 'ss',
      }
      
      name1_normalized = name1.dup
      name2_normalized = name2.dup
      
      # Replace umlauts with their equivalents
      umlaut_to_equivalent.each do |umlaut, equivalent|
        name1_normalized = name1_normalized.gsub(umlaut, equivalent)
        name2_normalized = name2_normalized.gsub(umlaut, equivalent)
      end
      
      # Also check the reverse - if someone has "ae" in their name but ORCID has "ä"
      equivalent_to_umlaut = umlaut_to_equivalent.invert
      
      name1_reverse = name1.dup
      name2_reverse = name2.dup
      
      equivalent_to_umlaut.each do |equivalent, umlaut|
        name1_reverse = name1_reverse.gsub(equivalent, umlaut)
        name2_reverse = name2_reverse.gsub(equivalent, umlaut)
      end
      
      # Check all combinations
      name1_normalized == name2_normalized || 
      name1_normalized == name2 || 
      name1 == name2_normalized ||
      name1_reverse == name2 ||
      name1 == name2_reverse ||
      name1_reverse == name2_reverse
    end
  end
end
