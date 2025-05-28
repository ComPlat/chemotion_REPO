# frozen_string_literal: true

module JsonLd
  class BaseJsonLdService
    include Rails.application.routes.url_helpers

    def initialize(base_url: nil)
      @base_url = base_url || default_base_url
    end

    # Common JSON-LD structure methods
    def conformance_declarations(type = 'Study')
      case type
      when 'Study'
        [
          {
            "@type": "CreativeWork",
            "@id": "https://bioschemas.org/types/Study/0.3-DRAFT"
          },
          {
            "@type": "CreativeWork",
            "@id": "https://isa-specs.readthedocs.io/en/latest/isamodel.html#investigation"
          }
        ]
      when 'ChemicalSubstance'
        [
          {
            "@type": "CreativeWork",
            "@id": "https://bioschemas.org/types/ChemicalSubstance/0.3-RELEASE-2019_09_02"
          }
        ]
      when 'Dataset'
        [
          {
            "@type": "CreativeWork",
            "@id": "https://schema.org/Dataset"
          }
        ]
      when 'MolecularEntity'
        [
          {
            "@type": "CreativeWork",
            "@id": "https://bioschemas.org/types/MolecularEntity/0.3-RELEASE-2019_09_02"
          }
        ]
      else
        []
      end
    end

    def publisher_info
      {
        '@type': 'Organization',
        name: 'chemotion-repository',
        logo: 'https://www.chemotion-repository.net/images/repo/Chemotion-V1.png',
        url: 'https://www.chemotion-repository.net'
      }
    end

    def doi_url(full_doi = nil)
      "https://doi.org/#{full_doi}"
    end

    def publication_url(suffix = nil)
      "https://www.chemotion-repository.net/inchikey/#{suffix}"
    end

    def tracking_item_name(pub, is_tracking = false)
      return nil unless is_tracking

      element = pub.element
      return nil unless element

      et = element.tag

      tracking_item_name = et.taggable_data&.dig('tracking_item_name')
      return tracking_item_name if tracking_item_name.present?

      tracking_item_name = et.taggable_data&.dig('eln_info', 'tracking_item_name')
      tracking_item_name = generate_tracking_item_name(pub, is_tracking) if tracking_item_name.nil?
      et.update!(taggable_data: (et.taggable_data || {}).merge(tracking_item_name: tracking_item_name)) if tracking_item_name.present?
      tracking_item_name
    end

    def generate_tracking_item_name(pub, is_tracking = false)
      return nil unless is_tracking

      element = pub.element
      return nil unless element

      "#{TrackerCommon.extract_hostname_without_tld}-#{element.short_label}-#{element.id}"
    end

    def json_ld_analysis_description(pub)
      element = pub.element
      return '' unless element&.extended_metadata

      kind_raw = element.extended_metadata['kind'] || ''
      kind = "dataset for #{kind_raw.split('|').last&.strip || ''}\n"
      desc = (element.extended_metadata['description'] || '') + "\n"
      content = element.extended_metadata['content'].nil? ? '' : json_ld_description_from_quill(element.extended_metadata['content'])
      kind + desc + content
    rescue StandardError => e
      Rails.logger.error ["API call - json_ld_analysis_description:", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      kind + desc
    end

    def data_catalog_info(pub = nil)
      {
        '@type': 'DataCatalog',
        '@id': 'https://www.chemotion-repository.net',
        description: 'Repository for samples, reactions and related research data.',
        keywords: generate_keywords(pub),
        name: 'Chemotion Repository',
        provider: data_catalog_provider,
        url: 'https://www.chemotion-repository.net',
        license: 'https://www.gnu.org/licenses/agpl-3.0.en.html',
        contributor: data_catalog_contributors,
        isAccessibleForFree: true
      }
    end

    def data_catalog_provider
      {
        '@type': 'Organization',
        name: 'Karlsruhe Institute of Technology (KIT)',
        url: 'https://www.kit.edu/'
      }
    end

    def data_catalog_contributors
      [
        json_ld_person('0000-0002-1692-6778', 'An', 'Nguyen'),
        json_ld_person('0000-0002-9772-0455', 'Chia-Lin', 'Lin'),
        json_ld_person('0000-0002-5035-7978', 'Felix', 'Bach'),
        json_ld_person('0000-0001-9513-2468', 'Nicole', 'Jung'),
        json_ld_person('0000-0002-9976-4507', 'Pei-Chi', 'Huang'),
        json_ld_person('0000-0002-0487-3947', 'Pierre', 'Tremouilhac'),
        json_ld_person('0000-0003-4845-3191', 'Stefan', 'Braese'),
        json_ld_person('0000-0002-4261-9886', 'Yu-Chieh', 'Huang')
      ]
    end

    def json_ld_person(id, given_name, family_name, email: nil, affiliation: nil)
      json = {
        '@type': 'Person',
        givenName: given_name,
        familyName: family_name,
        '@id': id
      }
      json[:email] = email if email.present?
      json[:affiliation] = affiliation if affiliation.present?
      json
    end

    def json_ld_organization(name, url: nil, identifier: nil)
      json = {
        '@type': 'Organization',
        name: name
      }
      json[:url] = url if url.present?
      json[:identifier] = identifier if identifier.present?
      json
    end

    def json_ld_defined_term_set(name, url = nil, id = nil)
      json = {
        '@type': 'DefinedTermSet',
        name: name
      }
      json[:'@id'] = id if id.present?
      json[:url] = url if url.present?
      json
    end

    def json_ld_defined_term(name, alternate_name = nil, url = nil, defined_term_set = nil, id = nil)
      json = {
        '@type': 'DefinedTerm',
        name: name
      }
      json[:alternateName] = alternate_name if alternate_name.present?
      json[:url] = url if url.present?
      json[:inDefinedTermSet] = defined_term_set if defined_term_set.present?
      json[:'@id'] = id if id.present?
      json
    end

    def json_ld_molecular_weight(mol)
      return nil unless mol&.molecular_weight

      {
        '@type': 'QuantitativeValue',
        value: mol.molecular_weight,
        unitCode: 'g/mol'
      }
    end

    def json_ld_molecular_entity(molecule, name)
      return nil unless molecule

      json = {
        '@type': 'MolecularEntity',
        'dct:conformsTo': conformance_declarations('MolecularEntity'),
        smiles: molecule.cano_smiles,
        inChIKey: molecule.inchikey,
        inChI: molecule.inchistring,
        molecularFormula: molecule.sum_formular
      }

      json[:name] = name if name.present?
      json[:molecularWeight] = json_ld_molecular_weight(molecule) if molecule.molecular_weight
      json[:iupacName] = molecule.iupac_name if molecule.iupac_name.present?
      json[:'@id'] = molecule.inchikey if molecule.inchikey.present?

      json.compact
    end


    def citations(literatures, id)
      json = []
      literatures.each do |lit|
        json.push(citation(lit, id))
      end
      json
    end

    def citation(lit, id)
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

    def authors_from_taggable_data(taggable_data)
      creators = taggable_data&.dig("creators") || []
      creators.map do |author|
        json = {
          '@type': 'Person',
          name: author["name"],
          familyName: author["familyName"],
          givenName: author["givenName"]
        }
        json[:identifier] = author["ORCID"] if author["ORCID"].present?
        json[:affiliation] = affiliation_from_taggable_data(author["affiliationIds"]&.first, taggable_data) if author["affiliationIds"]&.any?
        json
      end
    end

    def affiliation_from_taggable_data(aff_id, taggable_data)
      return nil unless aff_id && taggable_data&.dig("affiliations", aff_id.to_s)

      {
        '@type': 'Organization',
        name: taggable_data["affiliations"][aff_id.to_s]
      }
    end

    def json_ld_contributor_from_taggable_data(contributor_data)
      return nil unless contributor_data.present?

      json = {
        '@type': 'Person',
        name: contributor_data["name"],
        familyName: contributor_data["familyName"],
        givenName: contributor_data["givenName"]
      }
      json[:identifier] = contributor_data["ORCID"] if contributor_data["ORCID"].present?
      json
    end

    def json_ld_description_from_quill(desc)
      return "" unless desc.present?

      REXML::Text.new(
        Nokogiri::HTML(Chemotion::QuillToHtml.new.convert(desc.to_json)).text,
        false, nil, false
      ).to_s
    rescue StandardError => e
      Rails.logger.error ["JSON-LD description conversion error:", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      ""
    end

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
        next unless ds.properties&.dig('layers')

        ds.properties['layers'].keys.each do |key|
          # next unless con_layers&.include?(key)
          # mcon_fields = mcon[:layers].find { |ss| ss[:identifier] == key }&.fetch(:fields, [])&.map { |field| field[:identifier] }
          # next if mcon_fields.nil?

          layer_fields = ds.properties['layers'][key]&.fetch('fields', [])
          next unless layer_fields

          layer_fields.each do |field|
            # next unless mcon_fields&.include?(field['field'])
            # short_form = field.fetch('ontology', {}).fetch('short_form', '')
            short_form = get_ols_short_form(field, klass, key)
            val = get_val(field)
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

    def json_ld_measurement_technique(extended_metadata)
      return nil unless extended_metadata&.dig('kind')

      term_id = extended_metadata['kind']&.split('|')&.first&.strip
      technique_name = extended_metadata['kind']&.split('|')&.last&.strip

      if ENV['OLS_SERVICE'].present? && term_id.present?
        json_ld_measurement_technique_with_ols(term_id)
      else
        json_ld_measurement_technique_simple(technique_name)
      end
    end

    def json_ld_measurement_technique_with_ols(term_id)
      res = ols_load_term_info('CHMO', term_id)
      data = ((res.dig('_embedded', 'terms').length > 0 && res.dig('_embedded', 'terms').first) || {}) if res.present?
      return json_ld_measurement_technique_simple(term_id) if data.blank?

      json = {
        '@type': 'DefinedTerm',
        name: data['label'],
        termCode: data['obo_id']
      }
      json[:'@id'] = data['iri'] if data['iri'].present?
      json[:alternateName] = data['synonyms'] if data['synonyms'].present?
      json[:url] = "https://terminology.nfdi4chem.de/ts/ontologies/#{data['ontology_name']}/terms?iri=#{data['iri']}" if data['ontology_name'] && data['iri'].present?
      json[:inDefinedTermSet] = json_ld_defined_term_set(data['ontology_name'], nil, data['ontology_iri']) if data['ontology_name']
      json
    end

    def json_ld_measurement_technique_simple(technique_name)
      return nil unless technique_name.present?

      {
        '@type': 'DefinedTerm',
        name: technique_name,
        inDefinedTermSet: json_ld_defined_term_set("Chemical Methods Ontology", "http://purl.obolibrary.org/obo/chmo.owl")
      }
    end


    def generate_keywords(_pub = nil)
      sio = json_ld_defined_term_set('Semanticscience Integrated Ontology', nil, 'http://semanticscience.org/ontology/sio.owl')
      ncit = json_ld_defined_term_set('NCI Thesaurus OBO Edition', nil, 'http://purl.obolibrary.org/obo/ncit.owl')

      sample = json_ld_defined_term('sample', nil, nil, sio, 'http://semanticscience.org/resource/SIO_001050')
      reaction = json_ld_defined_term('chemical reaction', nil, nil, sio, 'http://semanticscience.org/resource/SIO_010345')
      analytical_chemistry = json_ld_defined_term('Analytical Chemistry',['Chemistry, Analytical'], nil, ncit, 'http://purl.obolibrary.org/obo/NCIT_C16415')

      [sample, reaction, analytical_chemistry]
    end

    def extract_analysis_keywords(sample, analysis)
      keywords = []
      keywords << analysis.extended_metadata&.dig('kind')&.split('|')&.last&.strip
      keywords << sample.solvent&.map { |s| s['label'] } if sample.solvent.present?
      keywords.flatten.compact.uniq
    end

    def variable_measured(sample, analysis)
      variables = []

      # Add solvent information
      if sample.solvent.present?
        variables << {
          '@type': 'PropertyValue',
          name: 'NMR solvent',
          propertyID: 'NMR:1000330',
          value: sample.solvent.map { |s| s['label'] }.join(', ')
        }
      end

      # Add temperature if available
      if analysis.extended_metadata&.dig('temperature').present?
        variables << {
          '@type': 'PropertyValue',
          name: 'Temperature',
          propertyID: 'NCIT:C25206',
          value: analysis.extended_metadata.dig('temperature'),
          unitCode: 'http://purl.obolibrary.org/obo/UO_0000012'
        }
      end

      # Add instrument information
      if analysis.extended_metadata&.dig('instrument').present?
        variables << {
          '@type': 'PropertyValue',
          name: 'NMR probe',
          propertyID: 'OBI:0000516',
          value: analysis.extended_metadata.dig('instrument')
        }
      end

      variables
    end

    def ols_load_term_info(schema, term_id)
      data = ols_cache('read', "#{schema}_#{term_id}")
      return data if data.present?

      http_s = Rails.env.test? ? "http://" : "https://"
      options = { timeout: 10, headers: { 'Content-Type' => 'text/json' } }
      api = ENV['OLS_SERVICE']
      link = "#{http_s}#{api}/ontologies/#{schema}/terms?obo_id=#{term_id}"
      response = HTTParty.get(link, options)
      data = response.parsed_response if response.ok?
      ols_cache('write', "#{schema}_#{term_id}", data) if data.present? && data.is_a?(Hash)
      data.is_a?(Hash) ? data : nil
    rescue StandardError => e
      Rails.logger.error ["OLS API call error:", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      nil
    end

    def ols_cache(method, identifier, data = nil, expires_in = 7.days)
      if method == 'write'
        Rails.cache.write("JsonLd_#{identifier}", data, expires_in: expires_in) if data.present?
      else
        Rails.cache.send(method, "JsonLd_#{identifier}")
      end
    rescue StandardError => e
      Rails.logger.error ["Cache error:", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      nil
    end

    def format_date(date, format = :iso8601)
      return nil unless date

      case format
      when :iso8601
        date.iso8601
      when :date_only
        date.strftime('%Y-%m-%d')
      when :datetime
        date.strftime('%Y-%m-%d %H:%M:%S')
      else
        date.to_s
      end
    end

    def get_ols_short_form(field, klass, key)
      short_form = field.fetch('ontology', {}).fetch('short_form', '')
      return short_form if short_form.present?

      klass_prop = klass['properties_release']
      klass_layer = klass_prop['layers'][key]
      klass_field = klass_layer && klass_layer['fields']&.find { |f| f['field'] == field['field'] }
      return klass_field && klass_field['ontology']&.fetch('short_form', '')
    end

    def get_val(field)
      return '' if field.blank?
      case field['type']
      when Labimotion::FieldType::SYSTEM_DEFINED
        unit = Labimotion::Units::FIELDS.find { |o| o[:field] == field['option_layers'] }&.fetch(:units, []).find { |u| u[:key] == field['value_system'] }&.fetch(:label, '')
        "#{field['value']} #{unit}"
      when Labimotion::FieldType::TEXT, Labimotion::FieldType::INTEGER, Labimotion::FieldType::SELECT, Labimotion::FieldType::INTEGER
        field['value']
      else
        ''
      end
    end

    protected

    def default_base_url
      Rails.application.config.try(:base_url) || "http://localhost:3000"
    end
  end
end
