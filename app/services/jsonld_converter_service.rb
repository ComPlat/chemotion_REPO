# frozen_string_literal: true

require_relative '../../lib/jsonld_to_turtle'

# Service class for converting JSON-LD to various RDF formats
# Integrates with the Chemotion application's existing structure
class JsonldConverterService

  SUPPORTED_ELEMENT_TYPES = %w[Sample Reaction Container].freeze

  # Convert any supported publication's JSON-LD to specified RDF format
  # @param publication [Publication] Publication object
  # @param format [Symbol] Output format (:turtle, :ntriples, :rdfxml, :jsonld)
  # @return [String] Converted RDF data
  def self.convert_publication(publication, format: :turtle)
    validate_publication(publication)

    jsonld_data = get_jsonld_data(publication)
    JsonldToTurtle::Converter.convert(jsonld_data, format: format)
  rescue StandardError => e
    Rails.logger.error "Error converting #{publication.element_type.downcase} publication #{publication.id}: #{e.message}"
    raise
  end

  private

  # Validate the publication object
  def self.validate_publication(publication)
    raise ArgumentError, "Publication cannot be nil" if publication.nil?
    raise ArgumentError, "Publication must be persisted" unless publication.persisted?
    raise ArgumentError, "Publication must be completed" unless publication.state == 'completed'

    unless SUPPORTED_ELEMENT_TYPES.include?(publication.element_type)
      raise ArgumentError, "Unsupported element type: #{publication.element_type}. Supported types: #{SUPPORTED_ELEMENT_TYPES.join(', ')}"
    end
  end

  # Get JSON-LD data based on publication type
  def self.get_jsonld_data(publication)
    case publication.element_type
    when 'Sample'
      publication.json_ld_sample_root
    when 'Reaction'
      publication.json_ld_reaction
    when 'Container'
      publication.json_ld_container
    else
      raise ArgumentError, "Unknown element type: #{publication.element_type}"
    end
  end

  # Convert any publication and save to a file
  # @param publication [Publication] Publication object
  # @param file_path [String] Path where to save the file
  # @param format [Symbol] Output format (:turtle, :ntriples, :rdfxml, :jsonld)
  # @return [String] Path to the saved file
  def self.convert_and_save_publication(publication, file_path, format: :turtle)
    converted_data = convert_publication(publication, format: format)

    # Use Rails path handling - convert to absolute path if relative
    target_path = if File.absolute_path?(file_path)
                    file_path
                  else
                    File.join(Rails.root, file_path)
                  end

    target_dir = File.dirname(target_path)

    # Validate and create directory structure using Rails conventions
    unless Dir.exist?(target_dir)
      FileUtils.mkdir_p(target_dir)
      unless Dir.exist?(target_dir)
        Rails.logger.error "Failed to create directory: #{target_dir}"
        raise IOError, "Failed to create directory: #{target_dir}"
      end
    end

    # Validate write permissions
    unless File.writable?(target_dir)
      Rails.logger.error "Directory not writable: #{target_dir}"
      raise IOError, "Directory not writable: #{target_dir}"
    end

    # Write the file using Rails conventions
    File.write(target_path, converted_data)

    # Validate file was written successfully
    unless File.exist?(target_path) && File.readable?(target_path)
      Rails.logger.error "Failed to write file: #{target_path}"
      raise IOError, "Failed to write file: #{target_path}"
    end

    Rails.logger.info "Saved #{format} format for #{publication.element_type.downcase} publication #{publication.id} to: #{target_path}"
    target_path
  rescue IOError => e
    Rails.logger.error "File operation failed for publication #{publication.id}: #{e.message}"
    raise
  rescue StandardError => e
    Rails.logger.error "Error saving converted data for publication #{publication.id}: #{e.message}"
    raise
  end



  # Convert all publications of specified types to specified format and save to directory
  # @param output_dir [String] Directory to save the converted files
  # @param format [Symbol] Output format (:turtle, :ntriples, :rdfxml, :jsonld)
  # @param element_types [Array<String>] Element types to convert (default: all supported)
  # @param limit [Integer] Optional limit on number of publications to process
  # @return [Array<String>] Paths to the saved files
  def self.convert_all_publications(output_dir, format: :turtle, element_types: SUPPORTED_ELEMENT_TYPES, limit: nil)
    validate_output_directory(output_dir)

    saved_files = []

    element_types.each do |element_type|
      publications = fetch_publications(element_type, limit)

      publications.each do |publication|
        begin
          filename = generate_filename(publication, format)
          file_path = File.join(Rails.root, output_dir, filename)

          convert_and_save_publication(publication, file_path, format: format)
          saved_files << file_path

          Rails.logger.info "Converted #{element_type.downcase} publication #{publication.id}"
        rescue StandardError => e
          Rails.logger.error "Failed to convert #{element_type.downcase} publication #{publication.id}: #{e.message}"
        end
      end
    end

    Rails.logger.info "Batch conversion completed. Saved #{saved_files.count} files to #{output_dir}"
    saved_files
  rescue StandardError => e
    Rails.logger.error "Error in batch conversion: #{e.message}"
    raise
  end



  # Validate publication JSON-LD data
  # @param publication [Publication] Publication object
  # @return [Boolean] true if valid
  def self.validate_publication_jsonld(publication)
    validate_publication(publication)

    jsonld_data = get_jsonld_data(publication)
    JsonldToTurtle::Converter.validate_jsonld(jsonld_data)
  rescue StandardError => e
    Rails.logger.error "Error validating JSON-LD for #{publication.element_type.downcase} publication #{publication.id}: #{e.message}"
    false
  end

  # Get conversion statistics for a publication
  # @param publication [Publication] Publication object
  # @return [Hash] Statistics hash
  def self.get_conversion_stats(publication)
    validate_publication(publication)

    jsonld_data = get_jsonld_data(publication)
    JsonldToTurtle::Converter.get_statistics(jsonld_data)
  rescue StandardError => e
    Rails.logger.error "Error getting statistics for #{publication.element_type.downcase} publication #{publication.id}: #{e.message}"
    {}
  end



  # Get all available output formats
  # @return [Array<Symbol>] Available format symbols
  def self.available_formats
    [:turtle, :ntriples, :rdfxml, :jsonld, :trig, :nquads]
  end

  # Check if a format is supported
  # @param format [Symbol] Format to check
  # @return [Boolean] true if supported
  def self.format_supported?(format)
    available_formats.include?(format.to_sym)
  end

  private

  # Validate output directory
  def self.validate_output_directory(output_dir)
    raise ArgumentError, "Output directory cannot be nil or empty" if output_dir.nil? || output_dir.empty?

    # Use Rails path handling
    output_path = if File.absolute_path?(output_dir)
                    output_dir
                  else
                    File.join(Rails.root, output_dir)
                  end

    unless Dir.exist?(output_path)
      FileUtils.mkdir_p(output_path)
      unless Dir.exist?(output_path)
        raise IOError, "Failed to create output directory: #{output_path}"
      end
    end

    unless File.writable?(output_path)
      raise IOError, "Output directory not writable: #{output_path}"
    end
  end

  # Fetch publications of a specific element type
  def self.fetch_publications(element_type, limit = nil)
    query = Publication.where(element_type: element_type, state: 'completed')
    query = query.limit(limit) if limit
    query
  end

  # Generate filename for a publication
  def self.generate_filename(publication, format)
    extension = format_to_extension(format)
    element_type_prefix = case publication.element_type
                         when 'Sample' then 'CRS'
                         when 'Reaction' then 'CRR'
                         when 'Container' then 'CRD'
                         else publication.element_type.downcase
                         end

    "#{element_type_prefix}-#{publication.element_id}_#{Time.current.strftime('%Y%m%d_%H%M%S')}.#{extension}"
  end

  # Convert format symbol to file extension
  # @param format [Symbol] Format symbol
  # @return [String] File extension
  def self.format_to_extension(format)
    case format
    when :turtle
      'ttl'
    when :ntriples
      'nt'
    when :rdfxml
      'rdf'
    when :jsonld
      'jsonld'
    when :trig
      'trig'
    when :nquads
      'nq'
    else
      'rdf'
    end
  end
end
