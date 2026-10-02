# frozen_string_literal: true

class CreateVMoleculeArchive < ActiveRecord::Migration[6.1]
  # Union of the snapshot and delta views; must run after both exist, and its
  # version matches theirs.
  def change
    create_view :v_molecule_archive, version: 2
  end
end
