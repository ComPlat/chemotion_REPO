# frozen_string_literal: true

module DataCiteFundingReferences
  extend ActiveSupport::Concern

  def render_funding_references(funding_references)
    return '' if funding_references.blank?

    xml = []
    xml << '<fundingReferences>'
    funding_references.each do |ref|
      xml << build_funding_reference_xml(ref)
    end
    xml << '</fundingReferences>'
    xml.join("\n")
  end

  private

  def build_funding_reference_xml(ref)
    xml = []
    xml << '  <fundingReference>'
    xml << funder_name_xml(ref)
    xml << funder_identifier_xml(ref)
    xml << award_number_xml(ref)
    xml << award_title_xml(ref)
    xml << '  </fundingReference>'
    xml.compact.join("\n")
  end

  def funder_name_xml(ref)
    return if ref[:funderName].blank?

    "    <funderName>#{ref[:funderName]}</funderName>"
  end

  def funder_identifier_xml(ref)
    return if ref[:funderIdentifier].blank?

    "    <funderIdentifier funderIdentifierType=\"#{ref[:funderIdentifierType]}\">#{ref[:funderIdentifier]}</funderIdentifier>"
  end

  def award_number_xml(ref)
    return if ref[:awardNumber].blank?

    if ref[:awardUri].present?
      "    <awardNumber awardURI=\"#{ref[:awardUri]}\">#{ref[:awardNumber]}</awardNumber>"
    else
      "    <awardNumber>#{ref[:awardNumber]}</awardNumber>"
    end
  end

  def award_title_xml(ref)
    return if ref[:awardTitle].blank?

    "    <awardTitle>#{ref[:awardTitle]}</awardTitle>"
  end
end
