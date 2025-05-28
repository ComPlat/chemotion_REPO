# frozen_string_literal: true

# Helper for public API
module AffiliationHelpers
  extend Grape::API::Helpers
  include ApplicationHelper

  def lookup_ror_data(organization_name, country)
    return nil if organization_name.blank?

    # require_relative '../../lib/ror/ror_api_client'

    # Try to find ROR ID by organization name
    RorApiClient.search_organization(organization_name, country)
  end

  # Map a country name to ISO standardized name
  def standardize_country_name(country_name)
    return nil if country_name.blank?

    # Try to find the country by name
    country = ISO3166::Country.find_country_by_name(country_name)

    # If found, return the standardized name, otherwise return original
    country ? country.name : country_name
  end

end