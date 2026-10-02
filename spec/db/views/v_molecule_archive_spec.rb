# frozen_string_literal: true

require 'rails_helper'

# Sanity checks on the molecule archive union view:
# - column shape (including xvial_count, provider, group_label, has_analyses, embargo_label)
# - the snap+delta dedup pattern: a molecule with both an old pub (in snap)
#   and a fresh pub (in delta) appears exactly once with aggregates over
#   *all* its publications (delta wins; delta computes over all pubs of the
#   molecule, not just the recent one).
describe VMoleculeArchive do
  it 'exposes the v02 columns' do
    expected = %w[molecule_id mol_iupac_name mol_inchikey max_published_at
                  year_published publication_count publication_ids sample_ids
                  contributor_ids xvial_count provider group_label
                  has_analyses embargo_label]
    expect(described_class.column_names).to include(*expected)
  end

  describe 'snapshot/delta dedup' do
    let(:molecule) { create(:molecule) }
    let(:sample_old) { create(:sample, molecule: molecule) }
    let(:sample_new) { create(:sample, molecule: molecule) }

    before do
      # Old publication: outside the 36h delta window — must live in the
      # snapshot.
      create(:publication, element: sample_old, state: 'completed',
                           published_at: 10.days.ago, deleted_at: nil)
      MvMoleculeArchiveSnapshot.refresh(concurrently: false)
      # Fresh publication added AFTER snapshot refresh: only the delta
      # sees it.
      create(:publication, element: sample_new, state: 'completed',
                           published_at: 1.hour.ago, deleted_at: nil)
    end

    it 'returns the molecule exactly once' do
      rows = described_class.where(molecule_id: molecule.id).to_a
      expect(rows.size).to eq(1)
    end

    it 'aggregates over all publications, not just the delta-fresh ones' do
      # Delta wins (NOT EXISTS in snap branch), but the delta view itself
      # joins ALL completed publications for the molecule and only filters
      # via HAVING max(published_at) >= 36h. So the surviving row should
      # count BOTH publications, not just the recent one.
      row = described_class.find_by(molecule_id: molecule.id)
      expect(row.publication_count).to eq(2)
    end
  end
end
