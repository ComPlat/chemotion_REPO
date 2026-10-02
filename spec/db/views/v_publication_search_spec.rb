# frozen_string_literal: true

require 'rails_helper'

# Sanity check on the publication search union view: column shape, primary
# key, and that completed Sample/Reaction publications are reachable.
describe VPublicationSearch do
  let!(:sample_pub) do
    sample = create(:sample)
    create(:publication, element: sample, state: 'completed',
                         published_at: 2.days.ago, deleted_at: nil)
  end

  it 'exposes the documented columns' do
    expected = %w[publication_id element_type element_id published_by published_at
                  year_published doi_id scheme_only reaction_rxno
                  molecule_id mol_iupac_name mol_inchikey mol_inchistring
                  mol_cano_smiles mol_sum_formular
                  author_ids ontology_term_ids ontology_term_labels
                  institution_names embargo_label ana_count]
    expect(described_class.column_names).to include(*expected)
  end

  it 'returns a row for a freshly published completed Sample publication' do
    # Two-day-old pub: lives in the snapshot (post-refresh) and outside the
    # 36 h delta. Refresh first so the snapshot is populated.
    MvPublicationSearchSnapshot.refresh(concurrently: false)
    row = described_class.find_by(publication_id: sample_pub.id)
    expect(row).not_to be_nil
    expect(row.element_type).to eq 'Sample'
    expect(row.year_published).to eq sample_pub.published_at.year
  end

  it 'is read-only' do
    MvPublicationSearchSnapshot.refresh(concurrently: false)
    row = described_class.first
    expect(row).not_to be_nil
    expect(row).to be_readonly
  end
end
