# frozen_string_literal: true

# Entity module
module Entities
  class MoleculePublicationListEntity < Grape::Entity
    expose :id, :tag, :iupac_name, :sum_formular, :cano_smiles, :inchikey, :inchistring , :molecule_svg_file, :sample_svg_file, :sid

    expose :embargo do |obj|
      obj[:embargo] || ''
    end

    # expose :tag do |obj|
    #   obj[:tag] || {}
    # end

    expose :author_name do |obj|
      obj[:author_name] || ''
    end

    expose :pub_id do |obj|
      obj[:pub_id] || ''
    end

    expose :published_at do |obj|
      obj[:published_at] || ''
    end

    expose :ana_cnt do |obj|
      obj[:ana_cnt] || ''
    end

  end
end
