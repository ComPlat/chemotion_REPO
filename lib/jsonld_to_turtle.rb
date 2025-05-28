# frozen_string_literal: true

require 'linkeddata'
require 'json'

module JsonldToTurtle
  class Converter
    # Convert JSON-LD to Turtle format
    # @param jsonld_data [Hash, String] JSON-LD data as Hash or JSON string
    # @param format [Symbol] Output format (:turtle, :ntriples, :rdfxml, :jsonld)
    # @return [String] RDF data in the specified format
    def self.convert(jsonld_data, format: :turtle)
      new.convert(jsonld_data, format: format)
    end

    # Convert and save JSON-LD data to file
    # @param jsonld_data [Hash, String] JSON-LD data as Hash or JSON string
    # @param file_path [String] Path to save the converted file
    # @param format [Symbol] Output format (:turtle, :ntriples, :rdfxml, :jsonld)
    # @return [String] Path to the saved file
    def self.convert_and_save(jsonld_data, file_path, format: :turtle)
      converted_data = convert(jsonld_data, format: format)

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
        raise IOError, "Failed to create directory: #{target_dir}" unless Dir.exist?(target_dir)
      end

      # Validate write permissions
      unless File.writable?(target_dir)
        raise IOError, "Directory not writable: #{target_dir}"
      end

      # Write the file
      File.write(target_path, converted_data)

      # Validate file was written successfully
      unless File.exist?(target_path) && File.readable?(target_path)
        raise IOError, "Failed to write file: #{target_path}"
      end

      target_path
    rescue IOError => e
      raise IOError, "File operation failed: #{e.message}"
    end

    # Instance method to convert JSON-LD to specified RDF format
    # @param jsonld_data [Hash, String] JSON-LD data as Hash or JSON string
    # @param format [Symbol] Output format (:turtle, :ntriples, :rdfxml, :jsonld)
    # @return [String] RDF data in the specified format
    def convert(jsonld_data, format: :turtle)
      # Parse JSON string if needed
      json_data = jsonld_data.is_a?(String) ? JSON.parse(jsonld_data) : jsonld_data

      # Create an RDF graph from JSON-LD
      graph = RDF::Graph.new
      JSON::LD::API.toRdf(json_data) do |statement|
        graph << statement
      end    # Convert to the specified format
    case format
    when :turtle
      graph.dump(:turtle, prefixes: common_prefixes)
    when :ntriples
      graph.dump(:ntriples)
    when :rdfxml
      graph.dump(:rdfxml, prefixes: common_prefixes)
    when :jsonld
      graph.dump(:jsonld, context: schema_org_context)
    when :trig
      graph.dump(:trig, prefixes: common_prefixes)
    when :nquads
      graph.dump(:nquads)
    else
      raise ArgumentError, "Unsupported format: #{format}. Supported formats: :turtle, :ntriples, :rdfxml, :jsonld, :trig, :nquads"
    end
    rescue JSON::ParserError => e
      raise ArgumentError, "Invalid JSON data: #{e.message}"
    rescue RDF::ReaderError => e
      raise ArgumentError, "Invalid JSON-LD data: #{e.message}"
    end

    # Validate JSON-LD data
    # @param jsonld_data [Hash, String] JSON-LD data to validate
    # @return [Boolean] true if valid, false otherwise
    def self.validate_jsonld(jsonld_data)
      json_data = jsonld_data.is_a?(String) ? JSON.parse(jsonld_data) : jsonld_data

      graph = RDF::Graph.new
      JSON::LD::API.toRdf(json_data) do |statement|
        graph << statement
      end

      !graph.empty?
    rescue StandardError
      false
    end

    # Get statistics about the converted RDF data
    # @param jsonld_data [Hash, String] JSON-LD data
    # @return [Hash] Statistics including triple count, subject count, etc.
    def self.get_statistics(jsonld_data)
      json_data = jsonld_data.is_a?(String) ? JSON.parse(jsonld_data) : jsonld_data

      graph = RDF::Graph.new
      JSON::LD::API.toRdf(json_data) do |statement|
        graph << statement
      end

      subjects = graph.subjects.to_set
      predicates = graph.predicates.to_set
      objects = graph.objects.to_set

      {
        triple_count: graph.count,
        subject_count: subjects.size,
        predicate_count: predicates.size,
        object_count: objects.size,
        unique_resources: (subjects + objects).size
      }
    rescue StandardError => e
      { error: e.message }
    end

    private

    # Common RDF prefixes for better readability
    def common_prefixes
      {
        schema: RDF::Vocabulary.new('https://schema.org/'),
        dct: RDF::Vocabulary.new('http://purl.org/dc/terms/'),
        rdf: RDF::RDFV,
        rdfs: RDF::RDFS,
        xsd: RDF::XSD,
        foaf: RDF::Vocabulary.new('http://xmlns.com/foaf/0.1/'),
        chmo: RDF::Vocabulary.new('http://purl.obolibrary.org/obo/CHMO_'),
        ncit: RDF::Vocabulary.new('http://purl.obolibrary.org/obo/NCIT_'),
        sio: RDF::Vocabulary.new('http://semanticscience.org/resource/SIO_'),
        chebi: RDF::Vocabulary.new('http://purl.obolibrary.org/obo/CHEBI_'),
        cheminf: RDF::Vocabulary.new('http://semanticscience.org/resource/cheminf_')
      }
    end

    # Schema.org context for JSON-LD
    def schema_org_context
      {
        '@context' => 'https://schema.org'
      }
    end
  end
end
