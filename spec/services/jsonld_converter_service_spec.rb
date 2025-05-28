# frozen_string_literal: true

require 'rails_helper'

RSpec.describe JsonldConverterService do
  let(:sample_publication) do
    create(:publication, element_type: 'Sample', state: 'completed')
  end

  let(:sample_jsonld) do
    {
      "@context" => "https://schema.org",
      "@type" => "Study",
      "@id" => "https://doi.org/10.14272/sample123",
      "name" => "Test Sample Study",
      "about" => [{
        "@type" => "ChemicalSubstance",
        "name" => "Test Compound"
      }]
    }
  end

  before do
    # Mock the json_ld_sample_root method
    allow(sample_publication).to receive(:json_ld_sample_root).and_return(sample_jsonld)
  end

  describe '.convert_publication' do
    it 'converts a valid sample publication' do
      result = described_class.convert_publication(sample_publication)

      expect(result).to be_a(String)
      expect(result).to include('@prefix')
    end

    it 'raises error for nil publication' do
      expect {
        described_class.convert_publication(nil)
      }.to raise_error(ArgumentError, /cannot be nil/)
    end

    it 'raises error for non-persisted publication' do
      new_publication = build(:publication)

      expect {
        described_class.convert_publication(new_publication)
      }.to raise_error(ArgumentError, /must be persisted/)
    end

    it 'raises error for unsupported publication type' do
      unsupported_publication = create(:publication, element_type: 'UnsupportedType', state: 'completed')

      expect {
        described_class.convert_publication(unsupported_publication)
      }.to raise_error(ArgumentError, /Unsupported publication type/)
    end

    it 'raises error for non-completed publication' do
      draft_publication = create(:publication, element_type: 'Sample', state: 'draft')

      expect {
        described_class.convert_publication(draft_publication)
      }.to raise_error(ArgumentError, /must be completed/)
    end

    it 'converts to different formats' do
      [:turtle, :ntriples, :rdfxml, :jsonld].each do |format|
        result = described_class.convert_publication(sample_publication, format: format)
        expect(result).to be_a(String)
        expect(result).not_to be_empty
      end
    end

    it 'logs errors appropriately' do
      allow(sample_publication).to receive(:json_ld_sample_root).and_raise(StandardError, 'Test error')

      expect(Rails.logger).to receive(:error).with(/Error converting sample publication/)

      expect {
        described_class.convert_publication(sample_publication)
      }.to raise_error(StandardError, 'Test error')
    end

    it 'converts Reaction publications' do
      reaction_publication = create(:publication, element_type: 'Reaction', state: 'completed')
      allow(reaction_publication).to receive(:json_ld_reaction).and_return(sample_jsonld)

      result = described_class.convert_publication(reaction_publication)

      expect(result).to be_a(String)
      expect(result).to include('@prefix')
    end

    it 'converts Container publications' do
      container_publication = create(:publication, element_type: 'Container', state: 'completed')
      allow(container_publication).to receive(:json_ld_container).and_return(sample_jsonld)

      result = described_class.convert_publication(container_publication)

      expect(result).to be_a(String)
      expect(result).to include('@prefix')
    end
  end

  describe '.convert_and_save_publication' do
    let(:temp_file) { Tempfile.new(['service_test', '.ttl']) }

    after { temp_file.close; temp_file.unlink }

    it 'converts and saves publication to file' do
      file_path = described_class.convert_and_save_publication(sample_publication, temp_file.path)

      expect(file_path).to eq(temp_file.path)
      expect(File.exist?(temp_file.path)).to be true

      content = File.read(temp_file.path)
      expect(content).to include('@prefix')
    end

    it 'creates directory structure if needed' do
      temp_dir = File.join(Dir.tmpdir, 'nested', 'directory')
      file_path = File.join(temp_dir, 'test.ttl')

      begin
        described_class.convert_and_save_publication(sample_publication, file_path)

        expect(File.exist?(file_path)).to be true
      ensure
        FileUtils.rm_rf(File.join(Dir.tmpdir, 'nested')) if Dir.exist?(File.join(Dir.tmpdir, 'nested'))
      end
    end

    it 'logs success message' do
      expect(Rails.logger).to receive(:info).with(/Saved turtle format/)

      described_class.convert_and_save_publication(sample_publication, temp_file.path)
    end

    it 'logs and raises errors' do
      allow(described_class).to receive(:convert_publication).and_raise(StandardError, 'Test error')

      expect(Rails.logger).to receive(:error).with(/Error saving converted data/)

      expect {
        described_class.convert_and_save_publication(sample_publication, temp_file.path)
      }.to raise_error(StandardError, 'Test error')
    end

    it 'raises IOError when directory cannot be created' do
      # Mock directory validation to simulate failure
      allow(Dir).to receive(:exist?).and_return(false)
      allow(FileUtils).to receive(:mkdir_p).and_return(true)

      expect(Rails.logger).to receive(:error).with(/Failed to create directory/)

      expect {
        described_class.convert_and_save_publication(sample_publication, '/invalid/path/test.ttl')
      }.to raise_error(IOError, /Failed to create directory/)
    end

    it 'raises IOError when directory is not writable' do
      temp_dir = Dir.mktmpdir
      allow(File).to receive(:writable?).and_return(false)

      begin
        expect(Rails.logger).to receive(:error).with(/Directory not writable/)

        expect {
          described_class.convert_and_save_publication(sample_publication, File.join(temp_dir, 'test.ttl'))
        }.to raise_error(IOError, /Directory not writable/)
      ensure
        FileUtils.rm_rf(temp_dir)
      end
    end
  end

  describe '.convert_all_publications with Sample filter' do
    let(:temp_dir) { Dir.mktmpdir('rdf_test') }
    let!(:publication1) { create(:publication, element_type: 'Sample', state: 'completed') }
    let!(:publication2) { create(:publication, element_type: 'Sample', state: 'completed') }
    let!(:draft_publication) { create(:publication, element_type: 'Sample', state: 'draft') }
    let!(:reaction_publication) { create(:publication, element_type: 'Reaction', state: 'completed') }

    after { FileUtils.rm_rf(temp_dir) }

    before do
      allow(publication1).to receive(:json_ld_sample_root).and_return(sample_jsonld)
      allow(publication2).to receive(:json_ld_sample_root).and_return(sample_jsonld)
    end

    it 'converts all completed Sample publications' do
      file_paths = described_class.convert_all_publications(temp_dir, element_types: ['Sample'])

      expect(file_paths).to be_an(Array)
      expect(file_paths.length).to eq(2) # Only completed Sample publications

      file_paths.each do |path|
        expect(File.exist?(path)).to be true
        expect(File.read(path)).to include('@prefix')
      end
    end

    it 'respects the limit parameter' do
      file_paths = described_class.convert_all_publications(temp_dir, element_types: ['Sample'], limit: 1)

      expect(file_paths.length).to eq(1)
    end

    it 'uses specified format' do
      file_paths = described_class.convert_all_publications(temp_dir, element_types: ['Sample'], format: :ntriples)

      file_paths.each do |path|
        expect(path).to end_with('.nt')
        content = File.read(path)
        expect(content).to match(/.*\.$/) # N-Triples format
      end
    end

    it 'creates output directory if it does not exist' do
      non_existent_dir = File.join(temp_dir, 'new_directory')

      file_paths = described_class.convert_all_publications(non_existent_dir, element_types: ['Sample'])

      expect(Dir.exist?(non_existent_dir)).to be true
      expect(file_paths).not_to be_empty
    end

    it 'handles errors gracefully and continues processing' do
      allow(publication1).to receive(:json_ld_sample_root).and_raise(StandardError, 'Test error')

      expect(Rails.logger).to receive(:error).with(/Failed to convert sample publication #{publication1.id}/)

      file_paths = described_class.convert_all_publications(temp_dir, element_types: ['Sample'])

      expect(file_paths.length).to eq(1) # Only publication2 succeeds
    end
  end

  describe '.get_conversion_stats' do
    it 'returns statistics for a valid publication' do
      stats = described_class.get_conversion_stats(sample_publication)

      expect(stats).to be_a(Hash)
      expect(stats).to have_key(:triple_count)
      expect(stats).to have_key(:subject_count)
    end

    it 'raises error for non-Sample publication' do
      reaction_publication = create(:publication, element_type: 'Reaction')

      expect {
        described_class.get_conversion_stats(reaction_publication)
      }.to raise_error(ArgumentError, /element_type 'Sample'/)
    end

    it 'returns error hash when conversion fails' do
      allow(sample_publication).to receive(:json_ld_sample_root).and_raise(StandardError, 'Test error')

      expect(Rails.logger).to receive(:error).with(/Error getting stats/)

      stats = described_class.get_conversion_stats(sample_publication)
      expect(stats).to have_key(:error)
      expect(stats[:error]).to eq('Test error')
    end
  end

  describe '.validate_publication_jsonld' do
    it 'returns true for valid JSON-LD' do
      expect(described_class.validate_publication_jsonld(sample_publication)).to be true
    end

    it 'validates different publication types' do
      reaction_publication = create(:publication, element_type: 'Reaction', state: 'completed')
      allow(reaction_publication).to receive(:json_ld_reaction).and_return(sample_jsonld)

      expect(described_class.validate_publication_jsonld(reaction_publication)).to be true
    end

    it 'returns false and logs error when validation fails' do
      allow(sample_publication).to receive(:json_ld_sample_root).and_raise(StandardError, 'Test error')

      expect(Rails.logger).to receive(:error).with(/Error validating JSON-LD/)

      result = described_class.validate_publication_jsonld(sample_publication)
      expect(result).to be false
    end
  end

  describe '.available_formats' do
    it 'returns array of supported formats' do
      formats = described_class.available_formats

      expect(formats).to be_an(Array)
      expect(formats).to include(:turtle, :ntriples, :rdfxml, :jsonld)
    end
  end

  describe '.format_supported?' do
    it 'returns true for supported formats' do
      [:turtle, :ntriples, :rdfxml, :jsonld].each do |format|
        expect(described_class.format_supported?(format)).to be true
      end
    end

    it 'returns false for unsupported formats' do
      expect(described_class.format_supported?(:unsupported)).to be false
    end

    it 'handles string input' do
      expect(described_class.format_supported?('turtle')).to be true
      expect(described_class.format_supported?('unsupported')).to be false
    end
  end

  describe '.format_to_extension' do
    it 'returns correct extensions for formats' do
      expect(described_class.send(:format_to_extension, :turtle)).to eq('ttl')
      expect(described_class.send(:format_to_extension, :ntriples)).to eq('nt')
      expect(described_class.send(:format_to_extension, :rdfxml)).to eq('rdf')
      expect(described_class.send(:format_to_extension, :jsonld)).to eq('jsonld')
    end

    it 'returns default extension for unknown format' do
      expect(described_class.send(:format_to_extension, :unknown)).to eq('rdf')
    end
  end
end
