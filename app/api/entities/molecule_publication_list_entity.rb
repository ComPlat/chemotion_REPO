# frozen_string_literal: true

# Entity module
module Entities
  class MoleculePublicationListEntity < Grape::Entity
    expose :id, :tag, :iupac_name, :sum_formular, :cano_smiles, :inchikey, :inchistring , :molecule_svg_file, :sample_svg_file, :sid
    # expose :segments, using: Entities::SegmentEntity

    expose :embargo do |obj|
      obj[:embargo] || ''
    end

    # expose :tag do |obj|
    #   obj[:tag] || {}
    # end

    expose :ana_cnt do |obj|
      obj[:ana_cnt] || ''
    end

    expose :publication do |obj|
      obj[:publication] || {}
    end
  end
end
