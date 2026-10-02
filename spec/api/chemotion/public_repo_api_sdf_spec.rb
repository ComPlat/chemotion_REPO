# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PublicRepoAPI do
  describe 'GET /api/v1/public/repository/sdf' do
    let(:fake_sdf) { "MOLBLOCK\nM  END\n> <CHEMOTION_ID>\nCRS-1\n\n$$$$\n" }
    let(:service) { instance_double(RepoSdfExportService, to_sdf: fake_sdf) }

    before do
      allow(RepoSdfExportService).to receive(:new).and_return(service)
    end

    it 'returns the SDF from the service' do
      get '/api/v1/public/repository/sdf'

      expect(response).to have_http_status(:ok)
      expect(response.body).to eq(fake_sdf)
    end

    it 'sets the SDF content type' do
      get '/api/v1/public/repository/sdf'
      expect(response.content_type).to start_with('chemical/x-mdl-sdfile')
    end

    it 'sets an attachment filename for samples' do
      get '/api/v1/public/repository/sdf'
      expect(response.headers['Content-Disposition']).to match(/attachment; filename="chemotion-samples.*\.sdf"/)
    end

    it 'forwards from/to to the service' do
      get '/api/v1/public/repository/sdf', params: {
        from: '2026-01-01',
        to: '2026-02-01',
      }

      expect(RepoSdfExportService).to have_received(:new).with(
        hash_including(:from, :to),
      )
    end

    it 'rejects a date range over 366 days with a 400' do
      get '/api/v1/public/repository/sdf', params: {
        from: '2024-01-01',
        to: '2026-01-01',
      }

      expect(response).to have_http_status(:bad_request)
      expect(response.body).to include('Date range may not exceed 366 days')
    end
  end
end
