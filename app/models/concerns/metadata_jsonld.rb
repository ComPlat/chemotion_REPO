# frozen_string_literal: true
require 'json'
require 'open-uri'
require 'nokogiri'

module MetadataJsonld
  extend ActiveSupport::Concern

  def json_ld
    if element_type == 'Sample'
      json_ld_sample_root
    elsif element_type == 'Reaction'
      json_ld_reaction
    elsif element_type == 'Container'
      json_ld_container
    end 
  end

  def json_ld_sample_root(pub = self)
    json = json_ld_study
    json['about'] = [json_ld_sample]
    json
  end

  def json_ld_study(pub = self)
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'Study'
    json['@id'] = "https://doi.org/#{doi.full_doi}"
    json['dct:conformsTo'] = {
      "@id": 'https://bioschemas.org/profiles/Study/0.3-DRAFT',
      "@type": 'CreativeWork'
    }
    json['publisher'] = json_ld_publisher
    json['dateCreated'] = pub.published_at&.strftime('%Y-%m-%d')
    json['datePublished'] = pub.published_at&.strftime('%Y-%m-%d')
    json['author'] = json_ld_authors(pub.taggable_data)
    json['contributor'] = json_ld_contributor(pub.taggable_data["contributors"])
    json['citation'] = json_ld_citations(pub.element.literatures, pub.element.id)
    json['includedInDataCatalog'] = json_ld_data_catalog(pub)
    json
  end

  def json_ld_data_catalog(pub = self)
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'DataCatalog'
    json['@id'] = 'https://www.chemotion-repository.net'
    json['dct:conformsTo'] = {
      "@type": 'CreativeWork',
      "@id": 'https://bioschemas.org/profiles/DataCatalog/0.3-RELEASE-2019_07_01'
    }
    json['description'] = 'Repository for samples, reactions and related research data.'
    json['keywords'] = data_catalog_keywords
    json['name'] = 'Chemotion Repository'
    json['provider'] = data_catalog_provider
    json['url'] = 'https://www.chemotion-repository.net'
    json['measurementTechnique'] = ['https://ontobee.org/ontology/CHMO?iri=http://purl.obolibrary.org/obo/CHMO_0000591', 'https://ontobee.org/ontology/CHMO?iri=http://purl.obolibrary.org/obo/CHMO_0000470', 'http://purl.obolibrary.org/obo/CHMO_0000630', 'https://ontobee.org/ontology/CHMO?iri=http://purl.obolibrary.org/obo/OBI_0000011']
    json['isAccessibleForFree'] = true
    json
  end

  

  def json_ld_defined_term_set(name,url)
    {
      json = {}
      json['@type'] = "DefinedTermSet"
      json['name'] = name
      json['url'] = url
      json
    }
  end

  def json_ld_defined_term(name ,url,defined_term_set, id)
    {
      json = {}
      json['@type'] = "DefinedTerm"
      json['name'] = name
      json['url'] = url
      json['inDefinedTermSet'] = defined_term_set
      json['id'] = id
      json
    }
  end

  def data_catalog_keywords
    sio = json_ld_defined_term_set('Semanticscience Integrated Ontology', 'https://raw.githubusercontent.com/micheldumontier/semanticscience/master/ontology/sio/release/sio-release.owl')
    ncit = json_ld_defined_term_set('NCI Thesaurus OBO Edition', 'http://purl.obolibrary.org/obo/ncit/releases/2022-08-19/ncit.owl')
    chmo = json_ld_defined_term_set('Chemical Methods Ontology', 'http://purl.obolibrary.org/obo/chmo/releases/2022-04-19/chmo.owl')

    sample = json_ld_defined_term('sample', 'http://semanticscience.org/resource/SIO_001050', sio, 'SIO:001050')
    reaction = json_ld_defined_term('chemical reaction', 'http://semanticscience.org/resource/SIO_010345', sio, 'SIO:010345')
    analytical_chemistry = json_ld_defined_term('Analytical Chemistry', 'http://purl.obolibrary.org/obo/NCIT_C16415', ncit, 'NCIT:C16415')
    nmr = json_ld_defined_term('nuclear magnetic resonance spectroscopy', 'http://purl.obolibrary.org/obo/CHMO_0000591', chmo, 'CHMO:0000591')
    ms = json_ld_defined_term('mass spectrometry', 'http://purl.obolibrary.org/obo/CHMO_0000470', chmo, 'CHMO:0000470')
    ir = json_ld_defined_term('infrared absorption spectroscopy', 'http://purl.obolibrary.org/obo/CHMO_0000630', chmo, 'CHMO:0000630')

    arr = [sample, reaction, analytical_chemistry, nmr, ms, ir]
    arr
  end

  def data_catalog_provider
    {
      "@type": "Organization"
      "name": "Karlsruhe Institute of Technology (KIT)"
      "url": "https://www.kit.edu/"
    }
  
  def conforms_to
    {
      "@id": "https://bioschemas.org/profiles/Study/0.3-DRAFT",
      "@type": "CreativeWork"
    }
  end

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
    json['image'] = 'https://www.chemotion-repository.net/images/samples/' + pub.element.sample_svg_file  if pub&.element&.sample_svg_file.present?
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
    json['@type'] = 'Study'
    json['@id'] = "https://doi.org/#{doi.full_doi}"
    json['identifier'] = "CRR-#{id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{doi.suffix}"
    json['additionalType'] = 'Reaction'
    json['name'] = element.rinchi_short_key
    json['author'] = json_ld_authors(taggable_data)
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
    # arr.push(json_ld_creative_work(pub))
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
    json['name'] = pub.element.extended_metadata['kind'] || '' if pub&.element&.extended_metadata.present?
    json['author'] = json_ld_authors(pub.taggable_data)
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
      json = {}
      json['@type'] = 'Person'
      json['name'] = author['name']
      json['identifier'] = author['ORCID'] if author['ORCID'].present?
      json['familyName'] = author["familyName"]
      json['givenName'] = author["givenName"]
      json['affiliation'] = json_ld_affiliation(author['affiliationIds']&.first, taggable_data)
      arr.push(json)
    end
    arr
  end

  def json_ld_contributor(contributor)
    return {} unless contributor.present?

    json = {}
    json['@type'] = 'Person'
    json['name'] = contributor['name']
    json['identifier'] = contributor['ORCID'] if contributor['ORCID'].present?
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
