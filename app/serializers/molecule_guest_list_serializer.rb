# frozen_string_literal: true

# molecule list class for guest
class MoleculeGuestListSerializer < ActiveModel::Serializer
  attributes :id, :iupac_name, :inchikey, :inchistring, :sum_formular, :molecule_svg_file, :tag, :sample_svg_file, :xvial_count, :xvial_com
end
