# frozen_string_literal: true

# == Schema Information
#
# Table name: mv_molecule_archive_snapshot
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
# Indexes
#
#  idx_mv_mol_archive_snapshot_embargo           (embargo_label)
#  idx_mv_mol_archive_snapshot_group             (group_label)
#  idx_mv_mol_archive_snapshot_has_analyses      (has_analyses)
#  idx_mv_mol_archive_snapshot_max_published_at  (max_published_at)
#  idx_mv_mol_archive_snapshot_molecule_id       (molecule_id) UNIQUE
#  idx_mv_mol_archive_snapshot_provider          (provider)
#  idx_mv_mol_archive_snapshot_year              (year_published)
#
class MvMoleculeArchiveSnapshot < ApplicationRecord
  self.table_name = 'mv_molecule_archive_snapshot'
  self.primary_key = :molecule_id

  def readonly?
    true
  end

  def self.refresh(concurrently: true)
    Scenic.database.refresh_materialized_view(:mv_molecule_archive_snapshot,
                                              concurrently: concurrently,
                                              cascade: false)
  end
end
