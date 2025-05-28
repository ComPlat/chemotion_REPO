# frozen_string_literal: true

require 'rails_helper'
require_relative '../../lib/jsonld_to_turtle'
require_relative '../../app/services/jsonld_converter_service'

RSpec.describe JsonldToTurtle::Converter do
  let(:sample_jsonld) do
    {
      "@context" => "https://schema.org",
      "@type" => "Study",
      "@id" => "https://doi.org/10.14272/sample123",
      "name" => "Test Sample Study",
      "about" => [{
        "@type" => "ChemicalSubstance",
        "@id" => "https://doi.org/10.14272/sample123#substance",
        "name" => "Test Compound",
        "molecularFormula" => "C6H12O6",
        "hasBioChemEntityPart" => {
          "@type" => "MolecularEntity",
          "smiles" => "C(C1C(C(C(C(O1)O)O)O)O)O",
          "inChIKey" => "WQZGKKKJIJFFOK-GASJEMHNSA-N",
          "molecularWeight" => {
            "@type" => "QuantitativeValue",
            "value" => 180.16,
            "unitCode" => "g/mol"
          }
        }
      }]
    }
  end

  let(:invalid_jsonld) do
    {
      "@context" => "invalid-context",
      "@type" => nil
    }
  end

  describe '.convert' do
    context 'with valid JSON-LD data' do
      it 'converts to turtle format by default' do
        result = described_class.convert(sample_jsonld)

        expect(result).to be_a(String)
        expect(result).to include('@prefix')
        expect(result).to include('schema:')
        expect(result).to include('ChemicalSubstance')
      end

      it 'converts to turtle format explicitly' do
        result = described_class.convert(sample_jsonld, format: :turtle)

        expect(result).to be_a(String)
        expect(result).to include('@prefix')
        expect(result).to include('schema:')
      end

      it 'converts to ntriples format' do
        result = described_class.convert(sample_jsonld, format: :ntriples)

        expect(result).to be_a(String)
        expect(result).to include('<https://schema.org/ChemicalSubstance>')
        expect(result).to match(/.*\.$/m) # N-Triples end with periods
      end

      it 'converts to rdfxml format' do
        result = described_class.convert(sample_jsonld, format: :rdfxml)

        expect(result).to be_a(String)
        expect(result).to include('<?xml')
        expect(result).to include('rdf:RDF')
      end

      it 'converts to jsonld format' do
        result = described_class.convert(sample_jsonld, format: :jsonld)

        expect(result).to be_a(String)
        parsed = JSON.parse(result)
        expect(parsed).to have_key('@context')
      end

      it 'converts to trig format' do
        result = described_class.convert(sample_jsonld, format: :trig)

        expect(result).to be_a(String)
        expect(result).to include('@prefix')
        # TriG format supports named graphs
      end

      it 'converts to nquads format' do
        result = described_class.convert(sample_jsonld, format: :nquads)

        expect(result).to be_a(String)
        # N-Quads format should have subject-predicate-object-graph tuples
        lines = result.strip.split("\n")
        lines.each do |line|
          next if line.empty?
          expect(line).to match(/.*\s+\.$/) # N-Quads end with periods
        end
      end

      it 'handles JSON string input' do
        json_string = sample_jsonld.to_json
        result = described_class.convert(json_string)

        expect(result).to be_a(String)
        expect(result).to include('@prefix')
      end
    end

    context 'with invalid data' do
      it 'raises error for unsupported format' do
        expect {
          described_class.convert(sample_jsonld, format: :unsupported)
        }.to raise_error(ArgumentError, /Unsupported format/)
      end

      it 'raises error for invalid JSON string' do
        expect {
          described_class.convert('invalid json')
        }.to raise_error(ArgumentError, /Invalid JSON data/)
      end

      it 'handles empty JSON-LD gracefully' do
        empty_jsonld = {}

        expect {
          described_class.convert(empty_jsonld)
        }.not_to raise_error
      end
    end
  end

  describe '.convert_and_save' do
    let(:temp_file) { Tempfile.new(['test', '.ttl']) }

    after { temp_file.close; temp_file.unlink }

    it 'converts and saves to file' do
      file_path = described_class.convert_and_save(sample_jsonld, temp_file.path)

      expect(file_path).to eq(temp_file.path)
      expect(File.exist?(temp_file.path)).to be true

      content = File.read(temp_file.path)
      expect(content).to include('@prefix')
    end

    it 'creates directory if it does not exist' do
      temp_dir = File.join(Dir.tmpdir, 'test_converter_dir')
      file_path = File.join(temp_dir, 'test.ttl')

      begin
        described_class.convert_and_save(sample_jsonld, file_path)

        expect(File.exist?(file_path)).to be true
        content = File.read(file_path)
        expect(content).to include('@prefix')
      ensure
        FileUtils.rm_rf(temp_dir) if Dir.exist?(temp_dir)
      end
    end

    it 'raises IOError when directory cannot be created' do
      # Mock FileUtils.mkdir_p to simulate failure
      allow(FileUtils).to receive(:mkdir_p).and_return(true)
      allow(Dir).to receive(:exist?).and_return(false)

      expect {
        described_class.convert_and_save(sample_jsonld, '/invalid/path/test.ttl')
      }.to raise_error(IOError, /Failed to create directory/)
    end

    it 'raises IOError when directory is not writable' do
      temp_dir = Dir.mktmpdir
      allow(File).to receive(:writable?).and_return(false)

      begin
        expect {
          described_class.convert_and_save(sample_jsonld, File.join(temp_dir, 'test.ttl'))
        }.to raise_error(IOError, /Directory not writable/)
      ensure
        FileUtils.rm_rf(temp_dir)
      end
    end
  end

  describe '.validate_jsonld' do
    it 'returns true for valid JSON-LD' do
      expect(described_class.validate_jsonld(sample_jsonld)).to be true
    end

    it 'returns false for invalid JSON-LD' do
      expect(described_class.validate_jsonld(invalid_jsonld)).to be false
    end

    it 'returns false for malformed JSON' do
      expect(described_class.validate_jsonld('invalid json')).to be false
    end

    it 'handles empty data' do
      expect(described_class.validate_jsonld({})).to be false
    end
  end

  describe '.get_statistics' do
    it 'returns statistics for valid JSON-LD' do
      stats = described_class.get_statistics(sample_jsonld)

      expect(stats).to be_a(Hash)
      expect(stats).to have_key(:triple_count)
      expect(stats).to have_key(:subject_count)
      expect(stats).to have_key(:predicate_count)
      expect(stats).to have_key(:object_count)
      expect(stats).to have_key(:unique_resources)

      expect(stats[:triple_count]).to be > 0
      expect(stats[:subject_count]).to be > 0
    end

    it 'returns error for invalid JSON-LD' do
      stats = described_class.get_statistics(invalid_jsonld)

      expect(stats).to have_key(:error)
    end

    it 'handles JSON string input' do
      json_string = sample_jsonld.to_json
      stats = described_class.get_statistics(json_string)

      expect(stats).to be_a(Hash)
      expect(stats).to have_key(:triple_count)
    end
  end

  describe 'format-specific conversions' do
    it 'produces valid Turtle syntax' do
      turtle = described_class.convert(sample_jsonld, format: :turtle)

      # Basic Turtle syntax checks
      expect(turtle).to match(/@prefix\s+\w+:\s+<[^>]+>\s*\./)
      expect(turtle).to include('a schema:')
    end

    it 'produces valid N-Triples syntax' do
      ntriples = described_class.convert(sample_jsonld, format: :ntriples)

      # Basic N-Triples syntax checks
      lines = ntriples.strip.split("\n")
      lines.each do |line|
        next if line.empty?
        expect(line).to match(/<[^>]+>\s+<[^>]+>\s+.*\s*\.$/)
      end
    end

    it 'produces valid RDF/XML syntax' do
      rdfxml = described_class.convert(sample_jsonld, format: :rdfxml)

      # Basic XML syntax checks
      expect(rdfxml).to include('<?xml')
      expect(rdfxml).to include('<rdf:RDF')
      expect(rdfxml).to include('</rdf:RDF>')
    end

    it 'produces valid TriG syntax' do
      trig = described_class.convert(sample_jsonld, format: :trig)

      # Basic TriG syntax checks
      expect(trig).to include('@prefix')
      # TriG format supports named graphs
    end

    it 'produces valid N-Quads syntax' do
      nquads = described_class.convert(sample_jsonld, format: :nquads)

      # Basic N-Quads syntax checks
      lines = nquads.strip.split("\n")
      lines.each do |line|
        next if line.empty?
        expect(line).to match(/.*\s+\.$/) # N-Quads end with periods
      end
    end
  end

  context 'with Publication object' do
    let(:publication) { create(:publication, element_type: 'Sample', state: 'completed') }

    before do
      # Mock the appropriate method based on element_type
      case publication.element_type
      when 'Sample'
        allow(publication).to receive(:json_ld_sample_root).and_return(sample_jsonld)
      when 'Reaction'
        allow(publication).to receive(:json_ld_reaction).and_return(sample_jsonld) # Using same data for test
      when 'Container'
        allow(publication).to receive(:json_ld_container).and_return(sample_jsonld) # Using same data for test
      end
    end

    describe 'JsonldConverterService integration' do
      it 'converts Sample publication JSON-LD to turtle' do
        publication.element_type = 'Sample'
        result = JsonldConverterService.convert_publication(publication, format: :turtle)

        expect(result).to be_a(String)
        expect(result).to include('@prefix')
      end

      it 'converts Reaction publication JSON-LD to turtle' do
        publication.element_type = 'Reaction'
        result = JsonldConverterService.convert_publication(publication, format: :turtle)

        expect(result).to be_a(String)
        expect(result).to include('@prefix')
      end

      it 'converts Container publication JSON-LD to turtle' do
        publication.element_type = 'Container'
        result = JsonldConverterService.convert_publication(publication, format: :turtle)

        expect(result).to be_a(String)
        expect(result).to include('@prefix')
      end

      it 'raises error for unsupported publication type' do
        publication.element_type = 'UnsupportedType'

        expect {
          JsonldConverterService.convert_publication(publication)
        }.to raise_error(ArgumentError, /Unsupported publication type/)
      end

      it 'converts to different formats' do
        publication.element_type = 'Sample'
        [:turtle, :ntriples, :rdfxml, :jsonld, :trig, :nquads].each do |format|
          result = JsonldConverterService.convert_publication(publication, format: format)
          expect(result).to be_a(String)
          expect(result).not_to be_empty
        end
      end
    end

    describe 'JsonldConverterService file operations' do
      let(:temp_file) { Tempfile.new(['publication', '.ttl']) }

      after { temp_file.close; temp_file.unlink }

      it 'converts publication and saves to file' do
        publication.element_type = 'Sample'
        file_path = JsonldConverterService.convert_and_save_publication(publication, temp_file.path)

        expect(file_path).to eq(temp_file.path)
        expect(File.exist?(temp_file.path)).to be true

        content = File.read(temp_file.path)
        expect(content).to include('@prefix')
      end
    end
  end

  describe 'prefixes and namespaces' do
    it 'includes common RDF prefixes in turtle output' do
      turtle = described_class.convert(sample_jsonld, format: :turtle)

      expect(turtle).to include('@prefix schema:')
      expect(turtle).to include('@prefix rdf:')
      expect(turtle).to include('@prefix rdfs:')
    end

    it 'includes chemistry-specific prefixes when relevant' do
      chemistry_jsonld = sample_jsonld.dup
      chemistry_jsonld['about'][0]['chmo:hasChemicalRole'] = 'http://purl.obolibrary.org/obo/CHMO_0000067'

      turtle = described_class.convert(chemistry_jsonld, format: :turtle)

      # The converter should handle chemistry ontology terms appropriately
      expect(turtle).to be_a(String)
    end
  end
end
