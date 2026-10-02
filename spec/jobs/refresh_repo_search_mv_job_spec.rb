# frozen_string_literal: true

require 'rails_helper'

# These specs exercise the refresh path against the real materialized views
# created by the migrations. They are deliberately light: they confirm that
# the job runs without raising and that newly-published rows show up in the
# union view immediately (via the delta) and remain after a refresh.
describe RefreshRepoSearchMvJob, :active_job do
  describe '#perform' do
    it 'refreshes the publication snapshot without raising' do
      expect { described_class.new.perform('MvPublicationSearchSnapshot') }.not_to raise_error
    end

    it 'refreshes the molecule archive snapshot without raising' do
      expect { described_class.new.perform('MvMoleculeArchiveSnapshot') }.not_to raise_error
    end

    it 'is idempotent (a second call does not raise)' do
      described_class.new.perform('MvPublicationSearchSnapshot')
      expect { described_class.new.perform('MvPublicationSearchSnapshot') }.not_to raise_error
    end

    it 'rejects unsupported model names' do
      expect { described_class.new.perform('User') }.to raise_error(ArgumentError, /unsupported MV/)
    end
  end

  describe 'union view row visibility' do
    let(:fresh_pub) do
      sample = create(:sample)
      create(:publication,
             element: sample,
             state: 'completed',
             published_at: Time.current,
             deleted_at: nil)
    end

    before { fresh_pub }

    it 'sees a publication that just landed via the delta view (before refresh)' do
      expect(VPublicationSearch.exists?(publication_id: fresh_pub.id)).to be true
    end

    it 'sees the same publication after a refresh (now via the snapshot)' do
      described_class.new.perform('MvPublicationSearchSnapshot')
      expect(MvPublicationSearchSnapshot.exists?(publication_id: fresh_pub.id)).to be true
    end
  end
end
