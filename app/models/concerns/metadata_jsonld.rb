# frozen_string_literal: true
require 'json'
require 'open-uri'
require 'nokogiri'

module MetadataJsonld
  extend ActiveSupport::Concern

  # Delegate to the shared JSON-LD service for common functionality
  def json_ld_service
    @json_ld_service ||= JsonLd::BaseJsonLdService.new
  end

  def json_ld(ext = nil)
    return {} if state != 'completed'

    if element_type == 'Sample'
      json_ld_sample_root
    elsif element_type == 'Reaction'
      json_ld_reaction(self, ext)
    elsif element_type == 'Container'
      json_ld_container
    end
  end

  def json_ld_sample_root(pub = self, is_root = true)
    json = json_ld_study(pub, is_root)
    json['about'] = [json_ld_sample(pub, nil, is_root)]
    json
  end

  def json_ld_study(pub = self, is_root = true)
    json = {}
    json['@context'] = 'https://schema.org' if is_root == true
    json['@type'] = 'Study'
    json['@id'] = "https://doi.org/#{doi.full_doi}"
    json['dct:conformsTo'] = json_ld_service.conformance_declarations('Study').first
    json['publisher'] = json_ld_service.publisher_info
    json['dateCreated'] = pub.published_at&.strftime('%Y-%m-%d')
    json['datePublished'] = pub.published_at&.strftime('%Y-%m-%d')
    json['author'] = json_ld_service.authors_from_taggable_data(pub.taggable_data)
    json['contributor'] = json_ld_service.json_ld_contributor_from_taggable_data(pub.taggable_data&.dig("contributors"))
    json['citation'] = json_ld_service.citations(pub.element.literatures, pub.element.id)
    json['includedInDataCatalog'] = json_ld_service.data_catalog_info(pub) if is_root == true
    json
  end

  def json_ld_data_catalog(pub = self)
    json_ld_service.data_catalog_info(pub)
  end

  # Delegate to shared service methods
  def json_ld_defined_term_set(name, url, id = nil)
    json_ld_service.json_ld_defined_term_set(name, url, id)
  end

  def json_ld_defined_term(name, alternate_name, url, defined_term_set, id)
    json_ld_service.json_ld_defined_term(name, alternate_name, url, defined_term_set, id)
  end

  def json_ld_person(id, given_name, family_name)
    json_ld_service.json_ld_person(id, given_name, family_name)
  end

  def data_catalog_keywords(pub = self)
    json_ld_service.data_catalog_contributors
  end

  def data_catalog_contributors
    json_ld_service.data_catalog_contributors
  end

  def data_catalog_provider
    json_ld_service.data_catalog_provider
  end

  def conforms_to
    {
      "@id": 'https://bioschemas.org/profiles/Study/0.3-DRAFT',
      "@type": 'CreativeWork'
    }
  end

  def json_ld_sample(pub = self, ext = nil, is_root = true)
    # metadata_xml
    json = {}
    json['@context'] = 'https://schema.org' if is_root == true
    json['@type'] = 'ChemicalSubstance'
    json['@id'] = pub.doi.full_doi
    json['identifier'] = "CRS-#{pub.id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{pub.doi.suffix}"
    json['name'] = pub.element.molecule_name&.name
    json['alternateName'] = pub.element.molecule.inchistring
    # json['image'] = element.sample_svg_file
    json['image'] = 'https://www.chemotion-repository.net/images/samples/' + pub.element.sample_svg_file  if pub&.element&.sample_svg_file.present?
    json['description'] = json_ld_service.json_ld_description_from_quill(pub.element.description)
    #json['author'] = json_ld_service.authors_from_taggable_data(pub.taggable_data)
    json['hasBioChemEntityPart'] = json_ld_service.json_ld_molecular_entity(pub.element.molecule, pub.element.molecule_name&.name)
    json['subjectOf'] = json_ld_subjectOf(pub) if is_root == true
    json['isPartOf'] = is_part_of(pub) if pub.parent.present?
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

  def json_ld_reaction(pub= self, ext = nil, is_root = true)
    json = {}
    json['@context'] = 'https://schema.org' if is_root == true
    json['@type'] = 'Study'
    json['@id'] = pub.doi.full_doi
    json['identifier'] = "CRR-#{pub.id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{pub.doi.suffix}"
    json['additionalType'] = 'Reaction'
    json['name'] = pub.element.rinchi_short_key
    json['creator'] = json_ld_service.authors_from_taggable_data(pub.taggable_data)
    json['author'] = json['creator']

    json['description'] = json_ld_service.json_ld_description_from_quill(pub.element.description)
    json['license'] = pub.rights_data[:rightsURI]
    json['datePublished'] = pub.published_at&.strftime('%Y-%m-%d')
    json['dateCreated'] = pub.created_at&.strftime('%Y-%m-%d')
    json['publisher'] = json_ld_service.publisher_info
    json['provider'] = json['publisher']
    json['keywords'] = 'chemical reaction: structures conditions'
    json['citation'] = json_ld_service.citations(pub.element.literatures, pub.element.id)
    json['subjectOf'] = json_ld_reaction_has_part(pub, ext, is_root) if is_root == true

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

  def json_ld_reaction_has_part(root, ext = nil, is_root = true)
    json = []
    root.children&.each do |pub|
      json.push(json_ld_sample(pub, ext)) if pub.element_type == 'Sample'
      json.push(json_ld_analysis(pub, false)) if pub.element_type == 'Container'
    end
    if ext == 'LLM' && root.element&.samples.present?
      root.element&.samples&.each do |sample|
        next if sample.publication.present? || !sample.collections&.pluck(:id).include?(Collection.public_collection&.id)

        json.push(Metadata::Jsonldllm.all_samples(root.element, sample))
      end
    end

    json
  end

  def json_ld_reaction_has_part_product
  end

  def json_ld_description(desc)
    json_ld_service.json_ld_description_from_quill(desc)
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
    json['@context'] = 'https://schema.org' if root == true
    json['@type'] = 'Dataset'
    json['@id'] = pub.doi.full_doi
    json['identifier'] = "CRD-#{pub.id}"
    json['url'] = "https://www.chemotion-repository.net/inchikey/#{pub.doi.suffix}"
    json['dct:conformsTo'] = json_ld_service.conformance_declarations('Dataset').first
    json['publisher'] = json_ld_service.publisher_info
    json['license'] = pub.rights_data[:rightsURI]
    json['name'] = (pub.element.extended_metadata['kind'] || '').split(' | ')&.last if pub&.element&.extended_metadata.present?
    measureInfo = json_ld_service.json_ld_measurement_technique(pub.element.extended_metadata) if pub&.element&.extended_metadata.present?
    variable_measured = json_ld_variable_measured(pub)
    json['measurementTechnique'] = measureInfo if measureInfo.present?
    json['variableMeasured'] = variable_measured if variable_measured.present?
    json['creator'] = json_ld_service.authors_from_taggable_data(pub.taggable_data)
    json['author'] = json['creator']
    json['description'] = json_ld_analysis_description(pub)
    if root == true
      json['includedInDataCatalog'] = json_ld_service.data_catalog_info(pub)
      json['isPartOf'] = is_part_of(pub)
    end
    json
  end

  def is_part_of(pub = self)

    json = {}
    if pub.parent.present?
      json = json_ld_reaction(pub.parent, nil, false) if pub.parent.element_type == 'Reaction'
      json = json_ld_sample_root(pub.parent, false) if pub.parent.element_type == 'Sample'
    end
    json
  end

  # def get_val(field)
  #   return '' if field.blank?
  #   case field['type']
  #   when Labimotion::FieldType::SYSTEM_DEFINED
  #     unit = Labimotion::Units::FIELDS.find { |o| o[:field] == field['option_layers'] }&.fetch(:units, []).find { |u| u[:key] == field['value_system'] }&.fetch(:label, '')
  #     "#{field['value']} #{unit}"
  #   when Labimotion::FieldType::TEXT, Labimotion::FieldType::INTEGER, Labimotion::FieldType::SELECT, Labimotion::FieldType::INTEGER
  #     field['value']
  #   else
  #     ''
  #   end
  # end

  # def get_ols_short_form(field, klass, key)
  #   short_form = field.fetch('ontology', {}).fetch('short_form', '')
  #   return short_form if short_form.present?

  #   klass_prop = klass['properties_release']
  #   klass_layer = klass_prop['layers'][key]
  #   klass_field = klass_layer && klass_layer['fields']&.find { |f| f['field'] == field['field'] }
  #   return klass_field && klass_field['ontology']&.fetch('short_form', '')
  # end

  def json_ld_variable_measured(pub = self)
    arr = []
    analysis = pub.element
    containers = Container.where(parent_id: analysis.id, container_type: 'dataset')
    containers.each do |container|
      ds = container.dataset
      ols_id = ds&.dataset_klass&.ols_term_id
      next if ds.nil? || ols_id.nil?
      # mcon = Rails.configuration.try(:m)&.dataset&.find { |ss| ss[:ols_term] == ols_id }
      # con_layers = mcon[:layers].pluck(:identifier) if mcon.present?
      # next if mcon.nil? || con_layers.nil?

      klass = Labimotion::DatasetKlass.find_by(ols_term_id: ols_id)

      ds&.properties.fetch('layers', nil)&.keys.each do |key|
        # next unless con_layers&.include?(key)
        # mcon_fields = mcon[:layers].find { |ss| ss[:identifier] == key }&.fetch(:fields, [])&.map { |field| field[:identifier] }
        # next if mcon_fields.nil?

        ds&.properties['layers'][key].fetch('fields', []).each do |field|
          # next unless mcon_fields&.include?(field['field'])
          # short_form = field.fetch('ontology', {}).fetch('short_form', '')
          short_form = json_ld_service.get_ols_short_form(field, klass, key)
          val = json_ld_service.get_val(field)
          next if field['value'].blank? || short_form.blank? || val.blank?

          json = {}
          json['@type'] = 'PropertyValue'
          json['name'] = field["label"]
          json['propertyID'] = short_form if short_form.present?
          json['value'] = val
          arr.push(json) unless json.empty?
        end
      end
    end
    arr
  end

  def json_ld_measurement_technique(pub = self)
    json_ld_service.json_ld_measurement_technique(pub.element.extended_metadata)
  end

  def json_ld_analysis_description(pub)
    json_ld_service.json_ld_analysis_description(pub)
  rescue StandardError => e
    Rails.logger.error ["API call - json_ld_analysis_description:", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
  end



  def json_ld_authors(taggable_data)
    json_ld_service.authors_from_taggable_data(taggable_data)
  end

  def json_ld_contributor(contributor)
    json_ld_service.json_ld_contributor_from_taggable_data(contributor)
  end

  def json_ld_affiliation(aff_id, taggable_data)
    json_ld_service.affiliation_from_taggable_data(aff_id, taggable_data)
  end

  def json_ld_molecular_weight(mol)
    json_ld_service.json_ld_molecular_weight(mol)
  end

  def json_ld_moelcule_entity(element)
    json_ld_service.json_ld_molecular_entity(element.molecule, name: element.molecule_name&.name)
  end

  def ols_load_term_info(schema, term_id)
    json_ld_service.ols_load_term_info(schema, term_id)
  end

  def ols_cache(method, identifier, data = nil, expires_in = 7.days)
    json_ld_service.ols_cache(method, identifier, data, expires_in)
  end
end
