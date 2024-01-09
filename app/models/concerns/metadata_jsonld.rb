# frozen_string_literal: true
require 'json'
require 'open-uri'
require 'nokogiri'

module MetadataJsonld
  extend ActiveSupport::Concern

  def json_ld(ext = nil)
    return {} if state != 'completed'

    if element_type == 'Sample'
      json_ld_sample_root
    elsif element_type == 'Reaction'
      json_ld_reaction(ext)
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
    json['description'] = 'Repository for samples, reactions and related research data.'
    json['keywords'] = data_catalog_keywords(pub)
    json['name'] = 'Chemotion Repository'
    json['provider'] = data_catalog_provider
    json['url'] = 'https://www.chemotion-repository.net'
    json['license'] = 'https://www.gnu.org/licenses/agpl-3.0.en.html'
    json['contributor'] = data_catalog_contributors
    json['isAccessibleForFree'] = true
    # json['measurementTechnique'] = ['https://ontobee.org/ontology/CHMO?iri=http://purl.obolibrary.org/obo/CHMO_0000591', 'https://ontobee.org/ontology/CHMO?iri=http://purl.obolibrary.org/obo/CHMO_0000470', 'http://purl.obolibrary.org/obo/CHMO_0000630', 'https://ontobee.org/ontology/CHMO?iri=http://purl.obolibrary.org/obo/OBI_0000011']
    json
  end

  def json_ld_defined_term_set(name, url, id=nil)
    json = {}
    json['@type'] = 'DefinedTermSet'
    json['@id'] = id if id.present?
    json['name'] = name if name.present?
    ## json['url'] = url if url.present?
    json
  end

  def json_ld_defined_term(name, alternate_name, url, defined_term_set, id)
    json = {}
    json['@type'] = 'DefinedTerm'
    json['name'] = name
    json['alternateName'] = alternate_name if alternate_name.present?
    json['url'] = url if url.present?
    json['inDefinedTermSet'] = defined_term_set
    json['@id'] = id
    json
  end

  def json_ld_person(id, given_name, family_name)
    json = {}
    json['@type'] = 'Person'
    json['givenName'] = given_name
    json['familyName'] = family_name
    json['@id'] = id
    json
  end

  def data_catalog_keywords(pub = self)
    sio = json_ld_defined_term_set('Semanticscience Integrated Ontology', nil, 'http://semanticscience.org/ontology/sio.owl')
    ncit = json_ld_defined_term_set('NCI Thesaurus OBO Edition', nil, 'http://purl.obolibrary.org/obo/ncit.owl')
    chmo = json_ld_defined_term_set('Chemical Methods Ontology', nil, 'http://purl.obolibrary.org/obo/chmo.owl')

##    def json_ld_defined_term(name, alternate_name, url, defined_term_set, id)

    sample = json_ld_defined_term('sample', nil, nil, sio, 'http://semanticscience.org/resource/SIO_001050')
    reaction = json_ld_defined_term('chemical reaction', nil, nil, sio, 'http://semanticscience.org/resource/SIO_010345')
    analytical_chemistry = json_ld_defined_term('Analytical Chemistry',['Chemistry, Analytical'], nil, ncit, 'http://purl.obolibrary.org/obo/NCIT_C16415')

#    nmr = json_ld_defined_term('nuclear magnetic resonance spectroscopy', ['NMR', 'NMR spectroscopy', 'nuclear magnetic resonance (NMR) spectroscopy'], nil, chmo, 'http://purl.obolibrary.org/obo/CHMO_0000591')
#    ms = json_ld_defined_term('mass spectrometry', ['MS'], 'http://purl.obolibrary.org/obo/CHMO_0000470', chmo, 'CHMO:0000470')
#    ir = json_ld_defined_term('infrared absorption spectroscopy',['infrared (IR) spectroscopy, IR, infra-red absorption spectroscopy, IR spectroscopy, IR absorption spectroscopy, infrared spectroscopy'], nil, chmo, 'http://purl.obolibrary.org/obo/CHMO_0000630')

    arr = [sample, reaction, analytical_chemistry]
    arr
  end

  def data_catalog_contributors
    an = json_ld_person('0000-0002-1692-6778', 'An', 'Nguyen')
    chia_lin = json_ld_person('0000-0002-9772-0455', 'Chia-Lin', 'Lin')
    felix = json_ld_person('0000-0002-5035-7978', 'Felix', 'Bach')
    nicole = json_ld_person('0000-0001-9513-2468', 'Nicole', 'Jung')
    pei_chi = json_ld_person('0000-0002-9976-4507', 'Pei-Chi', 'Huang')
    pierre = json_ld_person('0000-0002-0487-3947', 'Pierre', 'Tremouilhac')
    stefan = json_ld_person('0000-0003-4845-3191', 'Stefan', 'Braese')
    yu_chieh = json_ld_person('0000-0002-4261-9886', 'Yu-Chieh', 'Huang')

    arr = [an, chia_lin, felix, nicole, pei_chi, pierre, stefan, yu_chieh]
    arr
  end

  def data_catalog_provider
    {
      "@type": 'Organization',
      "name": 'Karlsruhe Institute of Technology (KIT)',
      "url": 'https://www.kit.edu/'
    }
  end

  def conforms_to
    {
      "@id": 'https://bioschemas.org/profiles/Study/0.3-DRAFT',
      "@type": 'CreativeWork'
    }
  end

  def json_ld_sample(pub = self, ext = nil)
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
    json['hasBioChemEntityPart'] = json_ld_moelcule_entity(pub.element)
    json['subjectOf'] = json_ld_subjectOf(pub)
    #json_object = JSON.parse(json)
    #JSON.pretty_generate(json_object)

    if ext == 'LLM'
      reaction = element_type == 'Reaction' ? element : nil
      json = Metadata::Jsonldllm.sample_ext(json, pub&.element, reaction)
    end

    json
    # formatted_json = JSON.pretty_generate(json)
    # formatted_json
  end

  def json_ld_reaction(ext = nil)
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'Study'
    json['@id'] = "https://doi.org/#{doi.full_doi}"
    json['identifier'] = "CRR-#{id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{doi.suffix}"
    json['additionalType'] = 'Reaction'
    json['name'] = element.rinchi_short_key
    json['creator'] = json_ld_authors(taggable_data)
    json['author'] = json['creator']

    json['description'] = json_ld_description(element.description)
    json['license'] = rights_data[:rightsURI]
    json['datePublished'] = published_at&.strftime('%Y-%m-%d')
    json['dateCreated'] = created_at&.strftime('%Y-%m-%d')
    json['publisher'] = json_ld_publisher
    json['provider'] = json_ld_publisher
    json['keywords'] = 'chemical reaction: structures conditions'
    json['citation'] = json_ld_citations(element.literatures, element.id)
    json['subjectOf'] = json_ld_reaction_has_part(ext)

    if ext == 'LLM'
      json = Metadata::Jsonldllm.reaction_ext(json, element)
    end
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

  def json_ld_reaction_has_part(ext = nil)
    json = []
    children&.each do |pub|
      json.push(json_ld_sample(pub, ext)) if pub.element_type == 'Sample'
      json.push(json_ld_analysis(pub, false)) if pub.element_type == 'Container'
    end
    if ext == 'LLM' && element&.samples.present?
      element&.samples&.each do |sample|
        next if sample.publication.present? || !sample.collections&.pluck(:id).include?(Collection.public_collection&.id)

        json.push(Metadata::Jsonldllm.all_samples(element, sample))
      end
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
    json_ld_analysis(self, true)
  end


  def json_ld_subjectOf(pub = self)
    arr = []
    # arr.push(json_ld_creative_work(pub))
    pub.children&.each do |ana|
      arr.push(json_ld_analysis(ana, false))
    end
    arr
  end

  def json_ld_analysis(pub = self, root = true)
    json = {}
    json['@context'] = 'https://schema.org'
    json['@type'] = 'Dataset'
    json['@id'] = "https://doi.org/#{pub.doi.full_doi}"
    json['identifier'] = "CRD-#{pub.id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{pub.doi.suffix}"
    json['publisher'] = json_ld_publisher
    json['license'] = pub.rights_data[:rightsURI]
    json['name'] = pub.element.extended_metadata['kind'] || '' if pub&.element&.extended_metadata.present?
    measureInfo = json_ld_measurement_technique(pub) if pub&.element&.extended_metadata.present?
    json['measurementTechnique'] = measureInfo if measureInfo.present?
    json['creator'] = json_ld_authors(pub.taggable_data)
    json['author'] = json['creator']
    json['description'] = json_ld_analysis_description(pub)
    json['includedInDataCatalog'] = json_ld_data_catalog(pub) if root == true
    json
  end

  def json_ld_measurement_technique(pub = self)
    json = {}
    term_id = pub.element.extended_metadata['kind']&.split('|')&.first&.strip
    res = tib_load_term_info('CHMO', term_id)
    data = (res.ok? && res.dig('_embedded', 'terms').length > 0 && res.dig('_embedded', 'terms').first) || {}
    return {} if data.blank?

    json['@type'] = 'DefinedTerm'
    json['@id'] = data['iri'] if data['iri'].present?
    json['termCode'] = data['obo_id'] if data['obo_id'].present?
    json['name'] = data['label'] if data['label'].present?
    json['alternateName'] = data['synonyms'] if data['synonyms'].present?
    json['url'] = "https://terminology.nfdi4chem.de/ts/ontologies/" + data['ontology_name'] + "/terms?iri=" + data['iri'] if data['ontology_name'] && data['iri'].present?
    json['inDefinedTermSet'] = json_ld_defined_term_set(data['ontology_name'], nil, data['ontology_iri'])
    json
  end

  def json_ld_analysis_description(pub)
    #xml_data = Nokogiri::XML(metadata_xml)
    #desc = xml_data.search('description')&.text&.strip
    #desc
    element = pub.element
    kind = 'dataset for ' + (element.extended_metadata['kind'] || '')&.split('|').pop + '\n'
    desc = element.extended_metadata['description'] || '' + '\n'
    content = element.extended_metadata['content'].nil? ? '' : REXML::Text.new(Nokogiri::HTML( Chemotion::QuillToHtml.new.convert(element.extended_metadata['content'])).text, false, nil, false).to_s

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
    json['name'] = dc_lit[:title] unless dc_lit.blank?
    json['author'] = dc_lit[:author] unless dc_lit.blank?
    json['url'] = dc_lit[:url] unless dc_lit.blank?
    json
  end

  def json_ld_publisher
    json = {}
    json['@type'] = 'Organization'
    json['name'] = 'chemotion-repository'
    json['logo'] = 'https://www.chemotion-repository.net/images/repo/Chemotion-V1.png'
    json['url'] = 'https://www.chemotion-repository.net'
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

  def json_ld_moelcule_entity(element)
    mol = element.molecule
    json = {}
    json['@type'] = 'MolecularEntity'
    json['smiles'] = mol.cano_smiles
    json['inChIKey'] = mol.inchikey
    json['inChI'] = mol.inchistring
    json['name'] = element.molecule_name&.name
    json['molecularFormula'] = mol.sum_formular
    json['molecularWeight'] = json_ld_molecular_weight(mol)
    json['iupacName'] = mol.iupac_name
    json
  end

  def tib_load_term_info(schema, term_id)
    http_s = "https://" # Rails.env.test? && "http://" || "https://"
    options = { :timeout => 10, :headers => {'Content-Type' => 'text/json'}  }
    api = 'service.tib.eu/ts4tib/api/'
    link = http_s + api + '/ontologies/' + schema + '/terms?obo_id=' + term_id
    HTTParty.get(link, options)
  rescue StandardError => e
    Rails.logger.error ["API call", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    nil
  end

end
