# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RepoSdfExportService do
  describe '#initialize' do
    it 'always includes the required fields even when only optional ones are passed' do
      service = described_class.new(fields: 'INCHIKEY')
      expect(service.fields).to include(*described_class::REQUIRED_FIELDS)
      expect(service.fields).to include('INCHIKEY')
    end

    it 'parses ISO-8601 strings for from/to' do
      service = described_class.new(from: '2026-01-01T00:00:00Z', to: '2026-01-31T23:59:59Z')
      expect(service.from).to be_a(Time)
      expect(service.to).to be_a(Time)
    end

    it 'splits comma-separated field strings' do
      service = described_class.new(fields: 'inchikey, canonical_smiles')
      expect(service.fields).to include('INCHIKEY', 'CANONICAL_SMILES')
    end
  end

  describe '#each_record (samples)' do
    let(:molecule) do
      Struct.new(:inchikey, :inchistring, :cano_smiles, :sum_formular, :molecular_weight, :iupac_name)
            .new('KEY-1', 'InChI=1S/CH4', 'C', 'CH4', 16.04, 'methane')
    end

    let(:sample) do
      sample_struct = Struct.new(:id, :molfile, :short_label, :molecule) do
        def molfile_pubchem
          molfile
        end
      end
      sample_struct.new(1, "  Mrv2014\n\n  1  0  0  0  0  0            999 V2000\nM  END", 'CRS-1', molecule)
    end

    let(:doi) { Struct.new(:full_doi).new('10.14272/CRS-1') }

    let(:publication) do
      Struct.new(:id, :element, :doi, :published_at, :element_type)
            .new(1, sample, doi, Time.utc(2026, 1, 1, 12), 'Sample')
    end

    let(:service) { described_class.new }

    before do
      allow(service).to receive(:sample_publications).and_return(fake_relation([publication]))
    end

    it 'emits a MOL block terminated by $$$$' do
      sdf = service.to_sdf
      expect(sdf).to include('M  END').and end_with("$$$$\n")
    end

    it 'includes the required SD properties' do
      sdf = service.to_sdf
      expect(sdf).to include('CHEMOTION_ID', 'CRS-1', '/pid/1', '10.14272/CRS-1')
    end

    it 'omits optional fields when not requested' do
      restricted = described_class.new(fields: 'INCHIKEY')
      allow(restricted).to receive(:sample_publications).and_return(fake_relation([publication]))

      sdf = restricted.to_sdf

      expect(sdf).to include('> <INCHIKEY>')
      expect(sdf).not_to include('> <CANONICAL_SMILES>')
    end

    it 'skips publications whose element has no molfile' do
      sample.molfile = nil
      expect(service.to_sdf).to eq('')
    end
  end

  describe '#stream' do
    it 'writes to the given IO and returns it' do
      service = described_class.new
      allow(service).to receive(:each_record).and_yield("MOL\n$$$$\n").and_yield("MOL2\n$$$$\n")
      io = StringIO.new
      result = service.stream(io)
      expect(result).to be(io)
      expect(io.string).to eq("MOL\n$$$$\nMOL2\n$$$$\n")
    end
  end

  def fake_relation(records)
    relation = Object.new
    relation.define_singleton_method(:find_each) { |&blk| records.each(&blk) }
    relation
  end
end
