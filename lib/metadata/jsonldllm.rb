require 'json'
require 'open-uri'
require 'nokogiri'

module Metadata
  class Jsonldllm

    def self.reaction_ext(json, reaction)
      json['rfValue'] = reaction.rf_value
      json['tlcSolvents'] = reaction.tlc_solvents
      json['tlcDesc'] = reaction.tlc_description
      json['temperature'] = reaction.temperature
      json['duration'] = reaction.duration
      json['reactionStatus'] = reaction.status
      json['reactionType'] = reaction.rxno
      # if reaction.segments.present?
      #   seglist= reaction.segments.map do |segment|
      #     klass = SegmentKlass.find_by(id: segment.segment_klass_id)
      #     data = {}
      #     { klass.label: data }
      #   end
      #   json['segments'] = seglist
      # end
      json
    end


    def self.sample_ext(json, sample, reaction)
      value = sample.real_amount_value.nil? ||sample.real_amount_value.zero? ? sample.target_amount_value : sample.real_amount_value
      unit = sample.real_amount_value.nil? ||sample.real_amount_value.zero? ? sample.target_amount_unit : sample.real_amount_unit
      has_molarity = !sample.molarity_value.nil? && sample.molarity_value > 0.0 && (sample.density === 0.0) || false
      has_density = !sample.density.nil? && sample.density > 0.0 && (sample.molarity_value === 0.0) || false

      molarity = sample.molarity_value && sample.molarity_value.to_f || 1.0
      density = sample.density && sample.density.to_f || 1.0
      purity = sample.purity && sample.purity.to_f || 1.0
      molecular_weight = sample.molecule.molecular_weight && sample.molecule.molecular_weight.to_f || 1.0

      json['amount_g'] = unit === 'g'? value : unit === 'mg'? value.to_f / 1000.0 : unit === 'mol' ?  (value / purity) * molecular_weight : unit === 'l' && !has_molarity && !has_density ? 0 : has_molarity ? value * molarity * molecular_weight : value * density * 1000
      json['amount_l'] = unit === 'l'? value : !has_molarity && !has_density ? 0 : has_molarity ? (json['amount_g'].to_f * purity) / (molarity * molecular_weight) : has_density ? json['amount_g'].to_f / (density * 1000) : 0
      json['amount_mol'] = unit === 'mol'? value : has_molarity ? json['amount_l'] * molarity : json['amount_g'].to_f * purity / molecular_weight
      json['molarity'] = molarity
      json['density'] = density

      json['amount_mg'] = json['amount_g'] * 1000
      json['amount_ml'] = json['amount_l'] * 1000
      json['amount_mmol'] = json['amount_mol'] * 1000

      return json if reaction.nil?

      rs = ReactionsSample.find_by(reaction_id: reaction.id, sample_id: sample.id)
      return json if rs.nil?

      json['rs_type'] = rs.type
      json['equiv'] = rs.equivalent&.to_f&.round(2) unless rs.type == 'ReactionsSolventSample'
      json
    end

    def self.all_samples(reaction, sample)

      # metadata_xml
      json = {}
      json['@context'] = 'https://schema.org'
      json['@type'] = 'ChemicalSubstance'
      json['@id'] = sample.id
      json['identifier'] = sample.id
      json['name'] = sample.molecule_name&.name
      json['alternateName'] = sample.molecule.inchistring
      # json['image'] = element.sample_svg_file
      json['image'] = 'https://www.chemotion-repository.net/images/samples/' + sample.sample_svg_file  if sample&.sample_svg_file.present?
      json['description'] = Metadata::Jsonldllm.json_ld_description(sample.description)
      #json['author'] = json_ld_authors(pub.taggable_data)
      json['hasBioChemEntityPart'] = Metadata::Jsonldllm.json_ld_moelcule_entity(sample)
      json = Metadata::Jsonldllm.sample_ext(json, sample, reaction)
      json
      # formatted_json = JSON.pretty_generate(json)
      # formatted_json
    end


    def self.json_ld_description(desc)
      REXML::Text.new(Nokogiri::HTML( Chemotion::QuillToHtml.new.convert(desc.to_json)).text, false, nil, false).to_s
      #persit_datacite_metadata_xml! unless metadata_xml.present?
      #xml_data = Nokogiri::XML(metadata_xml)
      #desc = xml_data.search('description')&.text&.strip
      #desc
    end

    def self.json_ld_moelcule_entity(element)
      mol = element.molecule
      json = {}
      json['@type'] = 'MolecularEntity'
      json['smiles'] = mol.cano_smiles
      json['inChIKey'] = mol.inchikey
      json['inChI'] = mol.inchistring
      json['name'] = element.molecule_name&.name
      json['molecularFormula'] = mol.sum_formular
      json['molecularWeight'] = Metadata::Jsonldllm.json_ld_molecular_weight(mol)
      json['iupacName'] = mol.iupac_name
      json
    end

    def self.json_ld_molecular_weight(mol)
      json ={}
      json['@type'] = 'QuantitativeValue'
      json['value'] = mol.molecular_weight
      json['unitCode'] = 'g/mol'
      json
    end

  end
end
