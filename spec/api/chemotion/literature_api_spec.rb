# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::LiteratureAPI do
  let!(:owner)          { create(:person) }
  let!(:another_user)   { create(:person) }
  let!(:reviewer)       { create(:person) }
  let(:owner_collection) do
    create(:collection, user_id: owner.id, is_shared: false, is_locked: false,
                        permission_level: 0, label: "owner's collection")
  end
  let(:sample) { create(:sample, collections: [owner_collection]) }

  let(:published_publication) do
    Publication.new(
      state: Publication::STATE_COMPLETED,
      element: sample,
      element_type: 'Sample',
      element_id: sample.id,
      published_by: owner.id,
      taggable_data: {},
    ).tap { |p| p.save(validate: false) }
  end

  let(:review_publication) do
    Publication.new(
      state: Publication::STATE_PENDING,
      element: sample,
      element_type: 'Sample',
      element_id: sample.id,
      published_by: owner.id,
      taggable_data: {},
    ).tap { |p| p.save(validate: false) }
  end

  let(:warden_authentication_instance) { instance_double(WardenAuthentication) }

  let(:post_params) do
    {
      element_type: 'sample',
      element_id: sample.id,
      ref: {
        is_new: true,
        doi: '10.1234/added-by-contributor',
        url: '',
        title: 'Added by non-owner contributor',
        litype: 'referTo',
      },
    }
  end

  def as_user(u)
    allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
    allow(warden_authentication_instance).to receive(:current_user).and_return(u)
  end

  describe 'POST /api/v1/literatures' do
    context 'when sample is published and the signed-in user is the publisher' do
      before do
        published_publication
        as_user(owner)
        post '/api/v1/literatures', params: post_params.to_json,
                                    headers: { 'Content-Type' => 'application/json' }
      end

      it 'permits the POST and attributes the literal to the publisher' do
        expect(response).to have_http_status(:created).or have_http_status(:ok)
        literal = Literal.find_by(element_type: 'Sample', element_id: sample.id,
                                  user_id: owner.id)
        expect(literal).to be_present
        # Refs added on a publication page must surface on the public view.
        expect(literal.category).to eq('public')
      end
    end

    context 'when sample publication is under review / embargo and the signed-in user is not publisher or reviewer' do
      before do
        review_publication
        allow(User).to receive(:reviewer_ids).and_return([reviewer.id])
        as_user(another_user)
        post '/api/v1/literatures', params: post_params.to_json,
                                    headers: { 'Content-Type' => 'application/json' }
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when the signed-in user is a reviewer on a published element' do
      before do
        published_publication
        allow(User).to receive(:reviewer_ids).and_return([reviewer.id])
        as_user(reviewer)
        post '/api/v1/literatures', params: post_params.to_json,
                                    headers: { 'Content-Type' => 'application/json' }
      end

      it 'permits the POST and stamps the literal as public' do
        expect(response).to have_http_status(:created).or have_http_status(:ok)
        literal = Literal.find_by(element_type: 'Sample', element_id: sample.id,
                                  user_id: reviewer.id)
        expect(literal).to be_present
        expect(literal.category).to eq('public')
      end
    end

    context 'when the signed-in user is a reviewer on an unpublished element' do
      before do
        allow(User).to receive(:reviewer_ids).and_return([reviewer.id])
        as_user(reviewer)
        post '/api/v1/literatures', params: post_params.to_json,
                                    headers: { 'Content-Type' => 'application/json' }
      end

      it 'permits the POST and stamps the literal as detail' do
        expect(response).to have_http_status(:created).or have_http_status(:ok)
        literal = Literal.find_by(element_type: 'Sample', element_id: sample.id,
                                  user_id: reviewer.id)
        expect(literal).to be_present
        expect(literal.category).to eq('detail')
      end
    end

    context 'when sample is NOT published and user is signed in but is not the owner' do
      before do
        as_user(another_user)
        post '/api/v1/literatures', params: post_params.to_json,
                                    headers: { 'Content-Type' => 'application/json' }
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when request is unauthenticated' do
      before do
        published_publication
        as_user(nil)
        post '/api/v1/literatures', params: post_params.to_json,
                                    headers: { 'Content-Type' => 'application/json' }
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
