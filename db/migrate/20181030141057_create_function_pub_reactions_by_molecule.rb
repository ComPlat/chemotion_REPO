class CreateFunctionPubReactionsByMolecule < ActiveRecord::Migration[4.2]
  def change
    create_function :pub_reactions_by_molecule
  end
end
