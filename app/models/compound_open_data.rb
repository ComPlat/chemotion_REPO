# == Schema Information
#
# Table name: compound_open_data_locals
#
#  x_cano_smiles    :string
#  x_created_at     :datetime
#  x_data           :jsonb
#  x_external_label :string
#  x_inchikey       :string
#  x_name           :string
#  x_short_label    :string
#  x_stereo         :jsonb
#  x_sum_formular   :string
#  x_updated_at     :datetime
#  x_id             :integer
#  x_sample_id      :integer
#

class CompoundOpenData < ApplicationRecord
  default_scope { order(x_created_at: :desc) }
end
