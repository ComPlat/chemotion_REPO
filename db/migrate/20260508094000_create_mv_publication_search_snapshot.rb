# frozen_string_literal: true

class CreateMvPublicationSearchSnapshot < ActiveRecord::Migration[6.1]
  # Creates the snapshot directly at version 2 so a fresh database builds and
  # populates the MV once; the later `_to_v02` migration is a no-op.
  def up
    create_view :mv_publication_search_snapshot, version: 2, materialized: true

    add_index :mv_publication_search_snapshot, :publication_id, unique: true,
              name: 'idx_mv_pub_search_snapshot_pub_id'
    add_index :mv_publication_search_snapshot, :year_published,
              name: 'idx_mv_pub_search_snapshot_year'
    add_index :mv_publication_search_snapshot, %i[element_type element_id],
              name: 'idx_mv_pub_search_snapshot_element'
    add_index :mv_publication_search_snapshot, :published_by,
              name: 'idx_mv_pub_search_snapshot_published_by'
    add_index :mv_publication_search_snapshot, :published_at,
              name: 'idx_mv_pub_search_snapshot_published_at'
    add_index :mv_publication_search_snapshot, :reaction_rxno,
              name: 'idx_mv_pub_search_snapshot_rxno'
    add_index :mv_publication_search_snapshot, :molecule_id,
              name: 'idx_mv_pub_search_snapshot_molecule_id'
    add_index :mv_publication_search_snapshot, :author_ids,
              using: :gin, name: 'idx_mv_pub_search_snapshot_author_ids'
    add_index :mv_publication_search_snapshot, :ontology_term_ids,
              using: :gin, name: 'idx_mv_pub_search_snapshot_ontology_term_ids'
    add_index :mv_publication_search_snapshot, :institution_names,
              using: :gin, name: 'idx_mv_pub_search_snapshot_institution_names'
    add_index :mv_publication_search_snapshot, :embargo_label,
              name: 'idx_mv_pub_search_snapshot_embargo_label'
  end

  def down
    drop_view :mv_publication_search_snapshot, materialized: true
  end
end
