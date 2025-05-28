# frozen_string_literal: true

class Funding < ApplicationRecord
  acts_as_paranoid

  belongs_to :fundable, polymorphic: true, foreign_key: :element_id, foreign_type: :element_type
  belongs_to :creator, class_name: 'User', foreign_key: :created_by, inverse_of: false
  belongs_to :deleter, class_name: 'User', foreign_key: :deleted_by, optional: true, inverse_of: false

  validates :element_type, presence: true, inclusion: { in: %w[Sample Reaction Collection] }
  validate :funding_data_present

  scope :by_element, ->(element_type, element_id) { where(element_type: element_type, element_id: element_id) }

  # Convenience methods to access funding data from metadata
  def funder_name
    metadata['funderName']
  end

  def funder_identifier
    metadata['funderIdentifier']
  end

  def funder_identifier_type
    metadata['funderIdentifierType']
  end

  def award_number
    metadata['awardNumber']
  end

  def award_title
    metadata['awardTitle']
  end

  def award_uri
    metadata['awardUri']
  end

  private

  def funding_data_present
    required_fields = ['funderName']

    if metadata.blank?
      errors.add(:metadata, 'cannot be blank')
      return
    end

    required_fields.each do |field|
      errors.add(:metadata, "must include #{field}") if metadata[field].blank?
    end
  end
end
