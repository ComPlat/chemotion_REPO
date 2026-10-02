# frozen_string_literal: true

require 'rails_helper'

# Smoke-level parity check between the live and MV-backed facet helpers.
# We don't aim to enforce identical row counts (the MV path uses the
# precomputed snapshot+delta union, the live path joins live tables), only
# that the public method shapes are stable when the flag toggles.
describe RepoSearchFacetHelpersMv do
  let(:helper) do
    Class.new do
      include RepoSearchFacetHelpersMv
    end.new
  end

  before do
    create(:sample) # ensure at least one row exists in publications/samples
    MvPublicationSearchSnapshot.refresh(concurrently: false)
  end

  context 'with flag off (live path)' do
    before { RepoSearchConfig.use_mv = false }

    it 'base_publication_scope returns a Publication relation' do
      expect(helper.base_publication_scope.klass).to eq(Publication)
    end

    it 'facet_years returns an array of {value, count}' do
      result = helper.facet_years(helper.base_publication_scope)
      expect(result).to be_an(Array)
      result.each { |r| expect(r.keys).to include(:value, :count) }
    end

    # The "Reaction" element choice must mean full reactions only — scheme-only
    # reactions share element_type 'Reaction' and are a separate facet choice.
    describe '#filter_by_element_group excludes scheme-only reactions' do
      let(:base) { helper.base_publication_scope }
      let(:scheme_false) { "scheme_only')::boolean, FALSE) = FALSE" }

      it 'excludes scheme-only reactions when Reaction is picked (scheme_only nil)' do
        sql = helper.filter_by_element_group(base, ['Reaction'], nil).to_sql
        expect(sql).to include(scheme_false)
      end

      it 'applies no scheme filter on the default (no element choice picked)' do
        sql = helper.filter_by_element_group(base, [], nil).to_sql
        expect(sql).not_to include('scheme_only')
      end

      it 'unions scheme-only reactions back in when scheme_only is true' do
        sql = helper.filter_by_element_group(base, ['Reaction'], true).to_sql
        expect(sql).to include("scheme_only')::boolean, FALSE) = TRUE")
      end
    end
  end

  context 'with flag on (MV path)' do
    before { RepoSearchConfig.use_mv = true }

    after { RepoSearchConfig.use_mv = false }

    it 'base_publication_scope returns a VPublicationSearch relation' do
      expect(helper.base_publication_scope.klass).to eq(VPublicationSearch)
    end

    it 'facet_years returns an array of {value, count}' do
      result = helper.facet_years(helper.base_publication_scope)
      expect(result).to be_an(Array)
      result.each { |r| expect(r.keys).to include(:value, :count) }
    end

    it 'facet_element_types returns an array of {value, count}' do
      result = helper.facet_element_types(helper.base_publication_scope)
      expect(result).to be_an(Array)
      result.each { |r| expect(r.keys).to include(:value, :count) }
    end

    it 'apply_filters returns a VPublicationSearch scope' do
      scope = helper.apply_filters(helper.base_publication_scope, { years: [2025] })
      expect(scope.klass).to eq(VPublicationSearch)
    end
  end
end
