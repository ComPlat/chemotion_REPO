class MoleculeGuestListSerializer < ActiveModel::Serializer
  attributes :id, :iupac_name, :inchikey, :inchistring, :sum_formular,
              :molecule_svg_file, :tag, :sample_svg_file
end
