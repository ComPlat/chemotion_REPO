class DecoupledInchikey < ActiveRecord::Migration[6.1]
  def change
    molecule = Molecule.find_by(inchikey: 'DUMMY')
    if molecule
      molecule.update_columns(inchikey: 'DECOUPLED')
    end
  end
end
