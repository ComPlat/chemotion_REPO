# frozen_string_literal: true

class CreateMvMoleculeArchiveSnapshot < ActiveRecord::Migration[6.1]
  # Creates the snapshot directly at version 2 so a fresh database builds and
  # populates the MV once; the later `_to_v02` migration is a no-op.
  def up
    create_view :mv_molecule_archive_snapshot, version: 2, materialized: true

    add_index :mv_molecule_archive_snapshot, :molecule_id, unique: true,
              name: 'idx_mv_mol_archive_snapshot_molecule_id'
    add_index :mv_molecule_archive_snapshot, :year_published,
              name: 'idx_mv_mol_archive_snapshot_year'
    add_index :mv_molecule_archive_snapshot, :max_published_at,
              name: 'idx_mv_mol_archive_snapshot_max_published_at'
    add_index :mv_molecule_archive_snapshot, :provider,
              name: 'idx_mv_mol_archive_snapshot_provider'
    add_index :mv_molecule_archive_snapshot, :group_label,
              name: 'idx_mv_mol_archive_snapshot_group'
    add_index :mv_molecule_archive_snapshot, :embargo_label,
              name: 'idx_mv_mol_archive_snapshot_embargo'
    add_index :mv_molecule_archive_snapshot, :has_analyses,
              name: 'idx_mv_mol_archive_snapshot_has_analyses'
  end

  def down
    drop_view :mv_molecule_archive_snapshot, materialized: true
  end
end
