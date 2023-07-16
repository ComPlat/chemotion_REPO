# == Schema Information
#
# Table name: matrices
#
#  id          :integer          not null, primary key
#  name        :string           not null
#  enabled     :boolean          default(FALSE)
#  label       :string
#  include_ids :integer          default([]), is an Array
#  exclude_ids :integer          default([]), is an Array
#  configs     :jsonb            not null
#  created_at  :datetime
#  updated_at  :datetime
#  deleted_at  :datetime
#
# Indexes
#
#  index_matrices_on_name  (name) UNIQUE
#
class Matrice < ApplicationRecord
  acts_as_paranoid
  after_create :gen_json

  after_update :reload_initializer, if: -> { (saved_change_to_configs? || saved_change_to_enabled?) && name == 'moleculeViewer' }

  def self.gen_matrices_json
    mx = pluck(:name, :id).to_h || {}
  rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
    mx = {}
  ensure
    File.write(
      Rails.root.join('config', 'matrices.json'),
      mx.to_json.concat("\n")
    )
  end

  def self.extra_rules
    configs = find_by(name: 'userProvider')&.configs || {}
    configs.dig('extra_rules', 'enable') == true ? configs['extra_rules'] : {}
  end

  private

  def gen_json
    Matrice.gen_matrices_json
  end

  def reload_initializer
    load Rails.root.join('config/initializers/molecule_viewer.rb') if Rails.application.initialized?
  end
end
