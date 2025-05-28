# frozen_string_literal: true

module JsonLd
  class PublicationJsonLdService < BaseJsonLdService
    def initialize(publication, kinds, tracking, base_url: nil)
      super(base_url: base_url)
      @publication = publication
      @is_tracking = tracking
      @kinds = kinds
      @element_type = publication.element_type
    end

    def generate
      return {} if @publication.state != 'completed'

      case @element_type
      when 'Sample'
        generate_sample_study
      when 'Reaction'
        generate_reaction_study
      when 'Container'
        generate_container_dataset
      end
    end

    def generate_reaction_study
      reaction_doi = @publication.doi
      {
        '@context': "https:\/\/schema.org",
        '@type': 'Study',
        '@id': doi_url(reaction_doi.full_doi),
        'dct:conformsTo': conformance_declarations('Study'),
        name: "CRR-#{@publication.id}",
        trackingItemName: tracking_item_name(@publication, @is_tracking),
        description: publication_description(@publication),
        keywords: generate_keywords(@publication),
        license: @publication.rights_data[:rightsURI],
        publisher: publisher_info,
        url: publication_url(reaction_doi.suffix),
        dateCreated: format_date(@publication.created_at),
        dateModified: format_date(@publication.updated_at),
        datePublished: format_date(@publication.published_at || @publication.updated_at, :datetime),
        author: authors_from_taggable_data(@publication.taggable_data),
        citation: [],
        hasPart: generate_products(@publication),
      }.compact
    end

    def generate_sample_study
      sample_doi = @publication.doi
      {
        '@context': "https:\/\/schema.org",
        '@type': 'Study',
        '@id': doi_url(sample_doi.full_doi),
        'dct:conformsTo': conformance_declarations('Study'),
        name: publication_title(@publication),
        description: publication_description(@publication),
        keywords: generate_keywords(@publication),
        license: @publication.rights_data[:rightsURI],
        publisher: publisher_info,
        url: publication_url(sample_doi.suffix),
        dateCreated: format_date(@publication.created_at),
        dateModified: format_date(@publication.updated_at),
        datePublished: format_date(@publication.published_at || @publication.updated_at, :datetime),
        author: authors_from_taggable_data(@publication.taggable_data),
        citation: [],
        hasPart: generate_sample(@publication),
      }.compact
    end

    def generate_container_dataset
      container_doi = @publication.doi
      {
        '@context': "https:\/\/schema.org",
        '@type': 'Dataset',
        '@id': doi_url(container_doi.full_doi),
        'dct:conformsTo': conformance_declarations('Dataset'),
        name: publication_title(@publication),
        description: publication_description(@publication),
        keywords: generate_keywords(@publication),
        license: @publication.rights_data[:rightsURI],
        publisher: publisher_info,
        url: publication_url(container_doi.suffix),
        dateCreated: format_date(@publication.created_at),
        dateModified: format_date(@publication.updated_at),
        datePublished: format_date(@publication.published_at || @publication.updated_at, :datetime),
        author: authors_from_taggable_data(@publication.taggable_data),
        citation: [],
        hasPart: has_analysis_details(@publication),
      }.compact
    end

    def generate_products(publication)
      publication.children&.map do |child|
        generate_sample(child) if child.element_type == 'Sample'
        # has_analysis_details(child) if child.element_type == 'Container'
      end
    end

    def generate_sample(sample_publication)
      sample = sample_publication.element
      sample_doi = sample_publication.doi

      return nil unless sample && sample_doi

      {
        '@type': 'Study',
        '@id': doi_url(sample_doi.full_doi),
        'dct:conformsTo': conformance_declarations('Study'),
        name: publication_title(sample_publication),
        trackingItemName: tracking_item_name(sample_publication, @is_tracking),
        description: publication_description(sample_publication),
        keywords: generate_keywords(sample_publication),
        license: sample_publication.rights_data[:rightsURI],
        publisher: publisher_info,
        url: publication_url(sample_doi.suffix),
        dateCreated: format_date(sample_publication.created_at),
        dateModified: format_date(sample_publication.updated_at),
        datePublished: format_date(sample_publication.published_at || sample_publication.updated_at, :datetime),
        author: authors_from_taggable_data(sample_publication.taggable_data),
        citation: sample.literatures ? citations(sample.literatures, sample.id) : [],
        about: sample_entity_info(sample_publication),
        # hasPart: has_analysis_details(sample_publication)
      }.compact
    end

    private

    def sample_entity_info(pub)
      sample = pub.element
      {
        '@type': 'ChemicalSubstance',
        '@id': doi_url(pub.doi.full_doi),
        'dct:conformsTo': conformance_declarations('ChemicalSubstance'),
        name: sample.name || sample.short_label,
        description: sample.description,
        url: publication_url(pub.doi.suffix),
        hasBioChemEntityPart: json_ld_molecular_entity(sample.molecule, sample.molecule_name&.name),
        studyDomain: 'Chemistry',
        studySubject: 'Small molecules',
        hasPart: has_analysis_details(pub)
      }.compact
    end

    def has_analysis_details(pub)
      return [] unless pub&.children

      pub.children.filter_map do |child|
        next unless child&.element

        analysis = child.element
        analysis_kind = analysis.extended_metadata&.dig('kind')
        next unless analysis_kind && (@kinds.empty? || @kinds.any? { |kind| analysis_kind.include?(kind) })

        has_analysis_detail(child)
      end
    end

    def dataset_folders(analysis)
      return [] unless analysis&.children

      analysis&.children&.map do |dataset|
        "dataset_#{dataset.id}"
      end
    end

    def has_analysis_detail(child)
      return nil unless child&.element&.extended_metadata && child&.doi

      analysis = child.element
      ols_name = (analysis.extended_metadata['kind'] || '').split(' | ')&.last
      {
        '@type': 'Dataset',
        '@id': doi_url(child.doi.full_doi),
        'dct:conformsTo': conformance_declarations('Dataset'),
        name: ols_name,
        analyses: "analysis_#{analysis.id}",
        datasets: dataset_folders(analysis),
        description: json_ld_analysis_description(child),
        license: child.rights_data[:rightsURI],
        url: publication_url(child.doi.suffix),
        dateCreated: format_date(child.created_at),
        dateModified: format_date(child.updated_at),
        datePublished: format_date(child.published_at || child.updated_at, :datetime),
        includedInDataCatalog: data_catalog_info(child),
        measurementTechnique: json_ld_measurement_technique(analysis.extended_metadata),
        variableMeasured: json_ld_variable_measured(child),
        isAccessibleForFree: true,
      }.compact
    end

    def publication_title(pub)
      # Extract title from metadata if available, otherwise use element name or fallback
      title = pub.metadata&.dig('title')
      title ||= pub.element&.name if pub.element.respond_to?(:name)
      title ||= "CRS-#{pub.id}"
      title
    end

    def publication_description(pub)
      element = pub.element
      return nil unless element
      description =
      case pub.element_type
      when 'Sample'
        element&.description if element.respond_to?(:description)
      when 'Reaction'
        element&.plain_text_description if element.respond_to?(:plain_text_description)
      when 'Container'
        element&.plain_text_content if element.respond_to?(:plain_text_content)
      end
    end

    def default_base_url
      Rails.application.routes.url_helpers.root_url
    end
  end
end
