# frozen_string_literal: true

# == Schema Information
#
# Table name: template_submissions
#
#  id                                                                                     :bigint           not null, primary key
#  deleted_at(The deletion time of the submission)                                        :datetime
#  metadata(Additional metadata about the klass info and submission)                      :jsonb            not null
#  origin(The origin of the submission)                                                   :string           not null
#  state(The state of the submission (0: pending, 1: approved, 2: rejected, 3: released)) :integer          default("pending"), not null
#  template(The template data submitted)                                                  :jsonb            not null
#  template_klass(The type of template submitted)                                         :string           not null
#  created_at(The creation time of the submission)                                        :datetime         not null
#  updated_at(The last update time of the submission)                                     :datetime
#
# Indexes
#
#  idx_template_submissions_metadata  (metadata) USING gin
#  idx_template_submissions_template  (template) USING gin
#

class TemplateSubmission < ApplicationRecord
  acts_as_paranoid

  # State enum
  enum state: {
    pending: 0,
    approved: 1,
    rejected: 2,
    released: 3,
  }

  # Validations
  validates :template_klass, presence: true
  validates :template, presence: true
  validates :metadata, presence: true
  validates :origin, presence: true
  validates :state, presence: true

  # Scopes
  scope :by_template_klass, ->(klass) { where(template_klass: klass) }
  scope :by_state, ->(state) { where(state: state) }
  scope :by_origin, ->(origin) { where(origin: origin) }
  scope :recent, -> { order(created_at: :desc) }
end
