# frozen_string_literal: true

# == Schema Information
#
# Table name: affiliations
#
#  id                    :integer          not null, primary key
#  cat                   :string
#  company               :string
#  country               :string
#  deleted_at            :datetime
#  department            :string
#  domain                :string
#  from                  :date
#  group                 :string
#  organization          :string
#  original_organization :string
#  to                    :date
#  created_at            :datetime
#  updated_at            :datetime
#  ror_id                :string
#
# Indexes
#
#  index_affiliations_on_ror_id  (ror_id)
#

class Affiliation < ApplicationRecord
  validates :organization, presence: true

  has_many :user_affiliations, dependent: :destroy
  has_many :users, through: :user_affiliations

  def output_array_full
    [group, department, organization, country]
  end

  def output_full
    output_array_full.map{|e| !e.blank? && e || nil}.compact.join(', ')
  end
end
