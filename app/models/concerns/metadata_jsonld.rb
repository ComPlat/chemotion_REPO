# frozen_string_literal: true
require 'json'
require 'open-uri'
require 'nokogiri'

module MetadataJsonld
  extend ActiveSupport::Concern

  def json_ld_sample(pub = self)
    # metadata_xml
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'ChemicalSubstance'
    json['@id'] = "https://doi.org/#{pub.doi.full_doi}"
    json['identifier'] = "CRS-#{pub.id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{pub.doi.suffix}"
    json['name'] = pub.element.molecule_name&.name
    json['alternateName'] = pub.element.molecule.inchistring
    # json['image'] = element.sample_svg_file
    json['image'] = 'https://www.chemotion-repository.net/images/samples/' + pub.element.sample_svg_file
    json['description'] = json_ld_description(pub.element.description)
    #json['author'] = json_ld_authors(pub.taggable_data)
    json['hasBioChemEntityPart'] = json_ld_moelcule_entity(pub)
    json['subjectOf'] = json_ld_subjectOf(pub)
    #json_object = JSON.parse(json)
    #JSON.pretty_generate(json_object)
    json
    # formatted_json = JSON.pretty_generate(json)
    # formatted_json
  end


  def json_ld_reaction
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'CreativeWork'
    json['@id'] = "https://doi.org/#{doi.full_doi}"
    json['identifier'] = "CRR-#{id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{doi.suffix}"
    json['additionalType'] = 'Reaction'
    json['name'] = element.rinchi_short_key
    json['creator'] = json_ld_authors(taggable_data)
    json['description'] = json_ld_description(element.description)
    json['license'] = rights_data[:rightsURI]
    json['datePublished'] = published_at&.strftime('%Y-%m-%d')
    json['dateCreated'] = created_at&.strftime('%Y-%m-%d')
    json['publisher'] = json_ld_publisher
    json['provider'] = json_ld_publisher
    json['keywords'] = 'chemical reaction: structures conditions'
    json['citation'] = json_ld_citations(element.literatures, element.id)
    json['subjectOf'] = json_ld_reaction_has_part
    json
  end

  def json_ld_embargo
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'Study'
    # json['startDate'] = embargo_start_date&.strftime('%Y-%m-%d')
    json
  end

  def json_ld_lab_protocol
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'LabProtocol'
    json['@id'] = "https://doi.org/#{doi.full_doi}"
    json
  end

  def json_ld_reaction_has_part
    json = []
    children&.each do |pub|
      json.push(json_ld_sample(pub)) if pub.element_type == 'Sample'
      json.push(json_ld_analysis(pub)) if pub.element_type == 'Container'
    end
    json
  end

  def json_ld_reaction_has_part_product
  end

  def json_ld_description(desc)
    REXML::Text.new(Nokogiri::HTML( Chemotion::QuillToHtml.new.convert(desc.to_json)).text, false, nil, false).to_s
    #persit_datacite_metadata_xml! unless metadata_xml.present?
    #xml_data = Nokogiri::XML(metadata_xml)
    #desc = xml_data.search('description')&.text&.strip
    #desc
  end

  def json_ld_container
    json_ld_analysis
  end


  def json_ld_subjectOf(pub = self)
    arr = []
    arr.push(json_ld_creative_work(pub))
    pub.children&.each do |ana|
      arr.push(json_ld_analysis(ana))
    end
    arr
  end

  def json_ld_analysis(pub = self)
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'Dataset'
    json['@id'] = "https://doi.org/#{pub.doi.full_doi}"
    json['identifier'] = "CRD-#{pub.id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{pub.doi.suffix}"
    json['name'] = pub.element.extended_metadata['kind'] || ''
    json['creator'] = json_ld_authors(pub.taggable_data)
    json['description'] = json_ld_analysis_description(pub)
    json
  end

  def json_ld_analysis_description(pub)
    #xml_data = Nokogiri::XML(metadata_xml)
    #desc = xml_data.search('description')&.text&.strip
    #desc
    element = pub.element
    kind = 'dataset for ' + (element.extended_metadata['kind'] || '')&.split('|').pop + '\n'
    desc = element.extended_metadata['description'] || '' + '\n'
    content = REXML::Text.new(Nokogiri::HTML( Chemotion::QuillToHtml.new.convert(element.extended_metadata['content'] || '')).text, false, nil, false).to_s

    kind + desc + content
  end

  def json_ld_creative_work(pub = self)
    json = {}
    json['@type'] = 'CreativeWork'
    json['@id'] = "https://doi.org/#{doi.full_doi}"
    json['publisher'] = json_ld_publisher

    json['dateCreated'] = pub.published_at&.strftime('%Y-%m-%d')
    json['datePublished'] = pub.published_at&.strftime('%Y-%m-%d')
    json['creator'] = json_ld_authors(pub.taggable_data)
    json['contributor'] = json_ld_contributor(pub.taggable_data["contributors"])
    json['citation'] = json_ld_citations(pub.element.literatures, pub.element.id)
    json
  end

  def json_ld_citations(literatures, id)
    json = []
    literatures.each do |lit|
      json.push(json_ld_citation(lit, id))
    end
    json
  end

  def json_ld_citation(lit, id)
    json = {}
    json['@type'] = 'CreativeWork'
    bib = lit[:refs] && lit[:refs]['bibtex']
    bb = DataCite::LiteraturePaser.parse_bibtex!(bib, id)
    bb = DataCite::LiteraturePaser.get_metadata(bb, lit[:doi], id) unless bb.class == BibTeX::Entry
    dc_lit = DataCite::LiteraturePaser.report_hash(lit, bb) if bb.class == BibTeX::Entry
    json['name'] = dc_lit[:title]
    json['author'] = dc_lit[:author]
    json['url'] = dc_lit[:url]
    json
  end

  def json_ld_publisher
    json = {}
    json['@type'] = 'Organization'
    json['name'] = 'chemotion-repository'
    json
  end


  def json_ld_authors(taggable_data)
    creators = taggable_data["creators"] || []
    arr = []
    creators.each do |author|
      user = User.find(author["id"])
      json = {}
      json['@type'] = 'Person'
      json['name'] = author['name']
      json['email'] = user&.email
      json['familyName'] = author["familyName"]
      json['givenName'] = author["givenName"]
      json['affiliation'] = json_ld_affiliation(author['affiliationIds']&.first, taggable_data)
      arr.push(json)
    end
    arr
  end

  def json_ld_contributor(contributor)
    user = User.find(contributor["id"])
    json = {}
    json['@type'] = 'Person'
    json['name'] = contributor['name']
    json['email'] = user&.email
    json['familyName'] = contributor["familyName"]
    json['givenName'] = contributor["givenName"]
    # json['affiliation'] = json_ld_affiliation(author['affiliationIds']&.first)
    json
  end

  def json_ld_affiliation(aff_id, taggable_data)
    json = {}
    json['@type'] = 'Organization'
    json['name'] = taggable_data['affiliations'][aff_id.to_s]
    json
  end

  def json_ld_molecular_weight(mol)
    json ={}
    json['@type'] = 'QuantitativeValue'
    json['value'] = mol.molecular_weight
    json['unitCode'] = 'g/mol'
    json
  end

  def json_ld_moelcule_entity(pub = self)
    mol = pub.element.molecule
    json = {}
    json['@type'] = 'MolecularEntity'
    json['smiles'] = mol.cano_smiles
    json['inChIKey'] = mol.inchikey
    json['inChI'] = mol.inchistring
    json['name'] = pub.element.molecule_name&.name
    json['molecularFormula'] = mol.sum_formular
    json['molecularWeight'] = json_ld_molecular_weight(mol)
    json['iupacName'] = mol.iupac_name
    json
  end
end
