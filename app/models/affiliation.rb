# frozen_string_literal: true

# == Schema Information
#
# Table name: affiliations
#
#  id                   :integer          not null, primary key
#  company              :string
#  country              :string
#  organization         :string
#  department           :string
#  group                :string
#  created_at           :datetime
#  updated_at           :datetime
#  from                 :date
#  to                   :date
#  domain               :string
#  cat                  :string
#  ror_id               :string
#  original_organization :string
#

class Affiliation < ApplicationRecord
  acts_as_paranoid
  validates :organization, presence: true
  validate :organization_is_valid_institution
  validates :organization, length: { minimum: 8, message: "is too short (minimum is 8 characters)" }

  has_many :user_affiliations, dependent: :destroy
  has_many :users, through: :user_affiliations

  # Association to ROR organization if we have local copies
  belongs_to :ror_organization, foreign_key: :ror_id, primary_key: :ror_id, optional: true

  # Custom validation to ensure organization is valid (no URLs, emails, etc.)
  def organization_is_valid_institution
    return unless organization.present?

    # Common words/patterns that indicate non-institutional entries
    non_institution_patterns = [
      # URLs and web-related patterns
      /www\./, /http/, /\.com/, /\.org/, /\.net/, /\.edu/,

      # Email patterns
      /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,

      # Special characters that shouldn't appear in institution names
      /@/, /\//, /#/, /\$/, /\&/, /\*/, /\+/, /=/, /~/,
      /\d{4,}/, # Long number sequences

      # Social media handles and symbols
      /@\w+/, /twitter/i, /facebook/i, /instagram/i, /linkedin/i,

      # Personal/informal indicators
      /private/i, /personal/i, /self employed/i, /self-employed/i,
      /freelance/i, /independent/i, /none/i, /n\/a/i,

      # Test or placeholder entries
      /test/i, /no org/i, /noorg/i, /^\s*-+\s*$/, /example/i, /demo/i,

      # Commercial terms
      /cheap/i, /goods/i, /shopping/i, /store/i, /market/i, /buy/i, /sell/i,

      # Domain TLDs
      /\.\w{2,4}\b/,

      # Special placeholders
      /^n\/?a$|^nil$|^null$/i
    ]

    # Check for invalid patterns
    non_institution_patterns.each do |pattern|
      if organization.match?(pattern)
        errors.add(:organization, "appears to be invalid. Please enter a valid educational or research institution name")
        return
      end
    end
  end

  def output_array_full
    [department, organization, country]
  end

  def output_full
    output_array_full.map{|e| !e.blank? && e || nil}.compact.join(', ')
  end

  # Look up ROR data for this affiliation
  def lookup_ror_data
    return if organization.blank?

    begin
      # Otherwise use the API
      result = RorApiClient.search_organization(organization, country)

      if result && result[:ror_id].present?
        update(
          ror_id: result[:ror_id],
          original_organization: organization,
          organization: result[:name] || organization,
          country: result[:country] || country
        )
        return true
      end
    rescue => e
      puts "Error looking up ROR data for affiliation #{id} (#{organization}): #{e.message}"
      puts e.backtrace.join("\n")
    end

    false
  end

  # Helper to get ROR URL
  def ror_url
    ror_id.present? ? "https://ror.org/#{ror_id}" : nil
  end

  # Helper to get organizational details from ROR
  def fetch_ror_details
    return nil if ror_id.blank?
    RorApiClient.get_by_ror_id(ror_id)
  end
end
