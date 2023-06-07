class MoleculeListSerializer < ActiveModel::Serializer
  attributes :id, :iupac_name, :inchikey, :inchistring, :sum_formular,
              :molecule_svg_file, :created_at, :updated_at,
              :is_partial, :cano_smiles, :density, :molecular_weight, :exact_molecular_weight, :chem_repo, :cas

end
