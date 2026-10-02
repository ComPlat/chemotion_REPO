# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleExpectations
describe Chemotion::RepoSearchAPI do
  describe 'GET /api/v1/repo_search/facets' do
    it 'returns the facet hash with all groups even on an empty database' do
      get '/api/v1/repo_search/facets'

      expect(response).to have_http_status(:ok)
      json = parsed_json_response
      expect(json.keys).to match_array(%w[years element_types reaction_types authors
                                          contributors institutions ontologies embargoes scheme_only])
      expect(json['years']).to be_an(Array)
      expect(json['element_types']).to be_an(Array)
      expect(json['scheme_only']).to include('count')
    end

    it 'accepts filter params without crashing' do
      get '/api/v1/repo_search/facets', params: {
        years: [2024, 2025],
        element_types: %w[Sample Reaction],
        institutions: ['University of Cambridge'],
        scheme_only: true,
      }
      expect(response).to have_http_status(:ok)
    end

    it 'computes the element facet without applying the scheme_only filter' do
      # When scheme_only is on, the element_types facet must still surface
      # Sample as an option so the user can OR-extend their selection.
      get '/api/v1/repo_search/facets', params: { scheme_only: true }
      expect(response).to have_http_status(:ok)
      json = parsed_json_response
      expect(json['element_types']).to be_an(Array)
      expect(json['scheme_only']).to include('count')
    end
  end

  describe 'GET /api/v1/repo_search/facet_values' do
    it 'returns autocomplete results for a known facet' do
      get '/api/v1/repo_search/facet_values', params: { facet: 'year' }

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['result']).to be_an(Array)
    end

    it 'rejects an unknown facet' do
      get '/api/v1/repo_search/facet_values', params: { facet: 'bogus' }
      expect(response).to have_http_status(:bad_request)
    end

    it 'returns autocomplete results for contributor without raising' do
      # Regression: SELECT DISTINCT + ORDER BY non-selected columns blew up PG.
      get '/api/v1/repo_search/facet_values', params: { facet: 'contributor', q: 'a' }
      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['result']).to be_an(Array)
    end
  end

  describe 'GET /api/v1/repo_search/results' do
    it 'returns paginated results with total/page metadata' do
      get '/api/v1/repo_search/results', params: { per_page: 5 }

      expect(response).to have_http_status(:ok)
      json = parsed_json_response
      expect(json).to include('total', 'page', 'per_page', 'results')
      expect(json['per_page']).to eq(5)
      expect(json['page']).to eq(1)
      expect(json['results']).to be_an(Array)
    end

    it 'caps per_page at 100' do
      get '/api/v1/repo_search/results', params: { per_page: 9999 }
      expect(parsed_json_response['per_page']).to eq(100)
    end

    it 'returns 400 when structure_match has an invalid value' do
      get '/api/v1/repo_search/results', params: { structure_match: 'bogus' }
      expect(response).to have_http_status(:bad_request)
    end

    it 'runs the batched enrichment lookups without error on empty results' do
      get '/api/v1/repo_search/results', params: { years: [9999] }

      expect(response).to have_http_status(:ok)
      json = parsed_json_response
      expect(json['results']).to eq([])
    end

    it 'accepts a free-text q parameter without crashing' do
      get '/api/v1/repo_search/results', params: { q: 'methane' }
      expect(response).to have_http_status(:ok)
    end
  end
end
# rubocop:enable RSpec/MultipleExpectations
