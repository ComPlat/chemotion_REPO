# frozen_string_literal: true

require 'rails_helper'

describe Entities::RepoSearchPublicationHitEntity do
  describe '.represent' do
    let(:element) do
      Struct.new(:name, :sample_svg_file, :reaction_svg_file).new(
        'Methane sample',
        'abc.svg',
        nil,
      )
    end
    let(:doi_obj) { Struct.new(:full_doi).new('10.1234/foo') }
    let(:publication) do
      pub_class = Struct.new(
        :id, :element_type, :element_id, :state, :published_at, :published_by,
        :element, :doi, :taggable_data, keyword_init: true
      )
      pub_class.new(
        id: 42,
        element_type: 'Sample',
        element_id: 7,
        state: 'completed',
        published_at: Time.utc(2025, 6, 1),
        published_by: 11,
        element: element,
        doi: doi_obj,
        taggable_data: {
          'creators' => [
            { 'givenName' => 'Ada', 'familyName' => 'Lovelace',
              'affiliation' => 'Cambridge', 'ORCID' => '0000-0000-0000-0001' },
          ],
          'scheme_only' => false,
        },
      )
    end

    let(:representation) do
      described_class.represent(
        publication,
        serializable: true,
        embargo_by_pub_id: { 42 => 'Embargo Bundle 1' },
        contributor_by_pub_id: { 42 => 'Marie Curie' },
        contributor_abbreviation_by_pub_id: { 42 => 'MC' },
        contributor_affiliation_by_pub_id: { 42 => 'Sorbonne' },
        ana_cnt_by_pub_id: { 42 => 3 },
      )
    end

    it 'derives the chemotion ID from element type and publication id' do
      expect(representation[:chemotion_id]).to eq('CRS-42')
    end

    it 'builds an SVG path under /images/samples for samples' do
      expect(representation[:svg_path]).to eq('/images/samples/abc.svg')
      expect(representation[:svg_file]).to eq('abc.svg')
    end

    it 'exposes embargo, contributor and analysis count from options' do
      expect(representation).to include(
        embargo: 'Embargo Bundle 1',
        contributor: 'Marie Curie',
        contributor_abbreviation: 'MC',
        contributor_affiliation: 'Sorbonne',
        ana_cnt: 3,
      )
    end

    it 'enriches authors with affiliation and orcid' do
      expect(representation[:authors].first).to include(
        name: 'Ada Lovelace',
        affiliation: 'Cambridge',
        orcid: '0000-0000-0000-0001',
      )
    end
  end
end
