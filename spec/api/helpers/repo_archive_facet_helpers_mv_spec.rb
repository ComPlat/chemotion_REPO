# frozen_string_literal: true

require 'rails_helper'

# Smoke-level parity check between the live and MV-backed archive helpers.
# We don't
# enforce identical row counts (the MV path reads the snapshot+delta union;
# the live path joins live tables) — only that the public method shapes
# stay stable when the flag toggles and that MV-incompatible adv_types fall
# back to the live super.
describe RepoArchiveFacetHelpersMv do
  let(:helper) do
    Class.new do
      include RepoArchiveFacetHelpersMv

      # Stubs for Grape helpers used by the live sample-rank join.
      def join_xvial_sql(_)
        ''
      end
    end.new
  end

  let(:public_collection_id) { Collection.public_collection_id }

  let(:base_params) do
    {
      sort: 'recent',
      archive_years: [],
      archive_providers: [],
      archive_groups: [],
      archive_has_analyses: [],
      archive_embargoes: [],
    }
  end

  before do
    create(:sample) # ensure at least one row exists
    MvMoleculeArchiveSnapshot.refresh(concurrently: false) if defined?(MvMoleculeArchiveSnapshot)
  end

  describe '#archive_mv_eligible?' do
    %w[Authors Ontologies Embargo Label].each do |adv_type|
      it "is false for adv_type=#{adv_type} (MV doesn't carry that column)" do
        RepoSearchConfig.use_mv = true
        input = helper.build_archive_input(base_params, public_collection_id, nil)
        input.adv_type = adv_type
        expect(helper.archive_mv_eligible?(input)).to be(false)
      ensure
        RepoSearchConfig.use_mv = false
      end
    end

    it 'is true for Contributors when flag is on' do
      RepoSearchConfig.use_mv = true
      input = helper.build_archive_input(base_params, public_collection_id, nil)
      input.adv_type = 'Contributors'
      expect(helper.archive_mv_eligible?(input)).to be(true)
    ensure
      RepoSearchConfig.use_mv = false
    end

    it 'is false when flag is off, even with no adv_type' do
      RepoSearchConfig.use_mv = false
      input = helper.build_archive_input(base_params, public_collection_id, nil)
      expect(helper.archive_mv_eligible?(input)).to be(false)
    end
  end

  context 'with flag off (live path)' do
    before { RepoSearchConfig.use_mv = false }

    it 'archive_mol_scope returns a Molecule relation' do
      input = helper.build_archive_input(base_params, public_collection_id, nil)
      expect(helper.archive_mol_scope(input).klass).to eq(Molecule)
    end

    it 'archive_facets returns a hash with expected facet keys' do
      input = helper.build_archive_input(base_params, public_collection_id, nil)
      facets = helper.archive_facets(input, total_count: 0)
      expect(facets.keys).to match_array(RepoArchiveFacetHelpers::ARCHIVE_FACETS)
    end
  end

  context 'with flag on (MV path)' do
    before { RepoSearchConfig.use_mv = true }
    after  { RepoSearchConfig.use_mv = false }

    it 'archive_total_count returns an Integer' do
      input = helper.build_archive_input(base_params, public_collection_id, nil)
      expect(helper.archive_total_count(input)).to be_a(Integer)
    end

    it 'archive_facets returns a hash with expected facet keys' do
      input = helper.build_archive_input(base_params, public_collection_id, nil)
      facets = helper.archive_facets(input, total_count: 0)
      expect(facets.keys).to match_array(RepoArchiveFacetHelpers::ARCHIVE_FACETS)
    end

    it 'falls back to live super for MV-incompatible adv_type=Authors' do
      input = helper.build_archive_input(base_params, public_collection_id, nil)
      input.adv_type = 'Authors'
      # MV path is short-circuited; we hit the live archive_mol_scope, which
      # still returns a Molecule relation.
      expect(helper.archive_mol_scope(input).klass).to eq(Molecule)
    end
  end

  # Exercises the single-scan in-memory aggregation directly (the smoke tests
  # above can't, since the test-env MV is unpopulated). We stub the one DB
  # read (mv_base_rows) with synthetic rows and assert count + facet parity
  # and the "drop your own filter" behaviour.
  describe 'in-memory MV aggregation (single-scan path)' do
    let(:ts) { Time.zone.local(2024, 1, 1) }
    let(:rows) do
      [
        { molecule_id: 1, year_published: 2024, provider: 'P1', group_label: 'G1',
          has_analyses: true, embargo_label: 'E1', max_published_at: ts },
        { molecule_id: 2, year_published: 2024, provider: 'P2', group_label: 'G1',
          has_analyses: false, embargo_label: 'E2', max_published_at: ts },
        { molecule_id: 3, year_published: 2023, provider: 'P1', group_label: 'G2',
          has_analyses: true, embargo_label: nil, max_published_at: ts },
      ]
    end

    def input_for(overrides = {})
      helper.build_archive_input(base_params.merge(overrides), public_collection_id, nil)
    end

    before do
      RepoSearchConfig.use_mv = true
      allow(helper).to receive(:mv_base_rows).and_return(rows)
    end

    after { RepoSearchConfig.use_mv = false }

    it 'counts every row when unfiltered' do
      expect(helper.archive_total_count(input_for)).to eq(3)
    end

    it 'applies the year filter to the count' do
      expect(helper.archive_total_count(input_for(archive_years: ['2024']))).to eq(2)
    end

    it 'drops its own filter for the years facet (selected year stays visible alongside others)' do
      facets = { years: [] }
      helper.archive_facet_years_mv!(facets, rows, input_for(archive_years: ['2024']))
      expect(facets[:years]).to contain_exactly(
        { value: '2024', label: '2024', count: 2 },
        { value: '2023', label: '2023', count: 1 },
      )
    end

    it 'keeps sibling providers visible while one provider is selected' do
      facets = { providers: [] }
      helper.archive_facet_providers_mv!(facets, rows, input_for(archive_providers: ['P1']))
      expect(facets[:providers]).to contain_exactly(
        { value: 'P1', label: 'P1', count: 2 },
        { value: 'P2', label: 'P2', count: 1 },
      )
    end

    it "reflects a sibling facet's filter (year narrows the provider facet)" do
      facets = { providers: [] }
      helper.archive_facet_providers_mv!(facets, rows, input_for(archive_years: ['2023']))
      expect(facets[:providers]).to contain_exactly({ value: 'P1', label: 'P1', count: 1 })
    end

    it 'buckets has_analyses into yes/no' do
      facets = { hasAnalyses: [] }
      helper.archive_facet_has_analyses_mv!(facets, rows, input_for)
      expect(facets[:hasAnalyses]).to contain_exactly(
        { value: 'yes', label: 'With analyses', count: 2 },
        { value: 'no', label: 'No analyses', count: 1 },
      )
    end

    it 'excludes nil/blank embargo labels' do
      facets = { embargoes: [] }
      helper.archive_facet_embargoes_mv!(facets, rows, input_for)
      expect(facets[:embargoes]).to contain_exactly(
        { value: 'E1', label: 'E1', count: 1 },
        { value: 'E2', label: 'E2', count: 1 },
      )
    end
  end
end
