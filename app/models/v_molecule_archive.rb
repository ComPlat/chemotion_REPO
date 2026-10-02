# frozen_string_literal: true

# == Schema Information
#
# Table name: v_molecule_archive
#
#  contributor_ids   :integer          is an Array
#  embargo_label     :text
#  group_label       :text
#  has_analyses      :boolean
#  max_published_at  :datetime
#  mol_cano_smiles   :string
#  mol_inchikey      :string
#  mol_inchistring   :string
#  mol_iupac_name    :string
#  mol_sum_formular  :string
#  provider          :text
#  publication_count :bigint
#  publication_ids   :integer          is an Array
#  sample_ids        :integer          is an Array
#  xvial_count       :integer
#  year_published    :integer
#  molecule_id       :integer          primary key
#
class VMoleculeArchive < ApplicationRecord
  self.table_name = 'v_molecule_archive'
  self.primary_key = :molecule_id

  def readonly?
    true
  end
end
