# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::TemplateSubmissionAPI do
  let(:user) { create(:person) }
  let(:token) { JsonWebToken.encode(user_id: user.id, first_name: user.first_name, last_name: user.last_name) }
  let(:auth_header) { { 'AUTHORIZATION' => "Bearer #{token}" } }

  describe 'POST /api/v1/public/template_submissions' do
    let(:valid_params) do
      {
        template_klass: 'reaction',
        template: { name: 'Test Reaction', steps: %w[step1 step2] },
        metadata: { source: 'external_system', version: '1.0' },
        origin: 'test_system',
      }
    end

    context 'with valid authentication and params' do
      it 'creates a template submission' do
        expect do
          post '/api/v1/public/template_submissions', params: valid_params, headers: auth_header
        end.to change(TemplateSubmission, :count).by(1)

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        expect(json['template_klass']).to eq('reaction')
        expect(json['state']).to eq('pending')
        expect(json['metadata']['submitted_by_user_id']).to eq(user.id)
      end
    end

    context 'without authentication' do
      it 'returns 401 unauthorized' do
        post '/api/v1/public/template_submissions', params: valid_params
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'with invalid token' do
      it 'returns 401 unauthorized' do
        post '/api/v1/public/template_submissions', params: valid_params,
                                                    headers: { 'AUTHORIZATION' => 'Bearer invalid_token' }
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'with missing required params' do
      it 'returns 400 bad request when template_klass is missing' do
        invalid_params = valid_params.except(:template_klass)
        post '/api/v1/public/template_submissions', params: invalid_params, headers: auth_header
        expect(response).to have_http_status(:bad_request)
      end

      it 'returns 400 bad request when template is missing' do
        invalid_params = valid_params.except(:template)
        post '/api/v1/public/template_submissions', params: invalid_params, headers: auth_header
        expect(response).to have_http_status(:bad_request)
      end
    end
  end

  describe 'GET /api/v1/public/template_submissions/:id' do
    let!(:submission) do
      TemplateSubmission.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: { source: 'test' },
        origin: 'api',
        state: :pending,
      )
    end

    context 'with valid authentication' do
      it 'returns the template submission' do
        get "/api/v1/public/template_submissions/#{submission.id}", headers: auth_header
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['id']).to eq(submission.id)
        expect(json['template_klass']).to eq('reaction')
      end
    end

    context 'with non-existent id' do
      it 'returns 404 not found' do
        get '/api/v1/public/template_submissions/99999', headers: auth_header
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'without authentication' do
      it 'returns 401 unauthorized' do
        get "/api/v1/public/template_submissions/#{submission.id}"
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'GET /api/v1/public/template_submissions' do
    before do
      TemplateSubmission.create!(
        template_klass: 'reaction',
        template: { name: 'Reaction 1' },
        metadata: {},
        origin: 'api',
        state: :pending,
      )
      TemplateSubmission.create!(
        template_klass: 'sample',
        template: { name: 'Sample 1' },
        metadata: {},
        origin: 'api',
        state: :approved,
      )
      TemplateSubmission.create!(
        template_klass: 'reaction',
        template: { name: 'Reaction 2' },
        metadata: {},
        origin: 'external',
        state: :pending,
      )
    end

    context 'with valid authentication' do
      it 'returns all template submissions' do
        get '/api/v1/public/template_submissions', headers: auth_header
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['submissions'].length).to eq(3)
        expect(json['pagination']['total_items']).to eq(3)
      end

      it 'filters by template_klass' do
        get '/api/v1/public/template_submissions', params: { template_klass: 'reaction' }, headers: auth_header
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['submissions'].length).to eq(2)
      end

      it 'filters by state' do
        get '/api/v1/public/template_submissions', params: { state: 'approved' }, headers: auth_header
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['submissions'].length).to eq(1)
      end

      it 'filters by origin' do
        get '/api/v1/public/template_submissions', params: { origin: 'external' }, headers: auth_header
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['submissions'].length).to eq(1)
      end

      it 'supports pagination' do
        get '/api/v1/public/template_submissions', params: { page: 1, per_page: 2 }, headers: auth_header
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['submissions'].length).to eq(2)
        expect(json['pagination']['total_pages']).to eq(2)
      end
    end
  end

  describe 'PUT /api/v1/public/template_submissions/:id/state' do
    let!(:submission) do
      TemplateSubmission.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: { source: 'test' },
        origin: 'api',
        state: :pending,
      )
    end

    context 'with valid authentication and params' do
      it 'updates the state' do
        put "/api/v1/public/template_submissions/#{submission.id}/state",
            params: { state: 'approved' },
            headers: auth_header
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['state']).to eq('approved')
        expect(json['metadata']['approved_by_user_id']).to eq(user.id)
      end

      it 'updates with additional metadata' do
        put "/api/v1/public/template_submissions/#{submission.id}/state",
            params: { state: 'rejected', metadata_update: { reason: 'Invalid data' } },
            headers: auth_header
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['state']).to eq('rejected')
        expect(json['metadata']['reason']).to eq('Invalid data')
      end
    end

    context 'with invalid state' do
      it 'returns 400 bad request' do
        put "/api/v1/public/template_submissions/#{submission.id}/state",
            params: { state: 'invalid_state' },
            headers: auth_header
        expect(response).to have_http_status(:bad_request)
      end
    end
  end

  describe 'DELETE /api/v1/public/template_submissions/:id' do
    let!(:submission) do
      TemplateSubmission.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: { source: 'test' },
        origin: 'api',
        state: :pending,
      )
    end

    context 'with valid authentication' do
      it 'soft deletes the template submission' do
        delete "/api/v1/public/template_submissions/#{submission.id}", headers: auth_header
        expect(response).to have_http_status(:no_content)
        submission.reload
        expect(submission.deleted_at).not_to be_nil
      end
    end

    context 'with non-existent id' do
      it 'returns 404 not found' do
        delete '/api/v1/public/template_submissions/99999', headers: auth_header
        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
