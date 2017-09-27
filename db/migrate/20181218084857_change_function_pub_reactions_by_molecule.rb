class ChangeFunctionPubReactionsByMolecule < ActiveRecord::Migration
  def change
    create_function :pub_reactions_by_molecule
  end
end
