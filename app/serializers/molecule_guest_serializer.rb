class MoleculeGuestSerializer < ActiveModel::Serializer
  attributes :id, :iupac_name, :inchikey, :inchistring, :sum_formular,
    :molecule_svg_file, :molecular_weight, :cano_smiles, :tag, :exact_molecular_weight
end
