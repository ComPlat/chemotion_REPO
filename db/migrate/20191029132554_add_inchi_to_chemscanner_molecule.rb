class AddInchiToChemscannerMolecule < ActiveRecord::Migration
  def change
    add_column :chemscanner_molecules, :inchistring, :string
    add_column :chemscanner_molecules, :inchikey, :string
  end
end
