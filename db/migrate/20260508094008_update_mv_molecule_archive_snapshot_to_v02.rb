# frozen_string_literal: true

class UpdateMvMoleculeArchiveSnapshotToV02 < ActiveRecord::Migration[6.1]
  # No-op: the create migration already builds mv_molecule_archive_snapshot and its
  # delta/union views at version 2. Kept rather than deleted so databases that
  # recorded it stay consistent and `rails db:migrate:status` shows no
  # "NO FILE" gaps.
  def up; end

  def down; end
end
