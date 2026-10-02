# frozen_string_literal: true

class CreateVMoleculeArchiveDelta < ActiveRecord::Migration[6.1]
  # Version 2 to match the snapshot's column shape.
  def change
    create_view :v_molecule_archive_delta, version: 2
  end
end
