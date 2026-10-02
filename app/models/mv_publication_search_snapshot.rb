# frozen_string_literal: true

# == Schema Information
#
# Table name: mv_publication_search_snapshot
#
#  ana_count            :integer
#  author_ids           :integer          is an Array
#  element_type         :string
#  embargo_label        :text
#  institution_names    :text             is an Array
#  mol_cano_smiles      :string
#  mol_inchikey         :string
#  mol_inchistring      :string
#  mol_iupac_name       :string
#  mol_sum_formular     :string
#  ontology_term_ids    :text             is an Array
#  ontology_term_labels :jsonb
#  published_at         :datetime
#  published_by         :integer
#  reaction_rxno        :string
#  scheme_only          :boolean
#  year_published       :integer
#  doi_id               :integer
#  element_id           :integer
#  molecule_id          :integer
#  publication_id       :integer          primary key
#
# Indexes
#
#  idx_mv_pub_search_snapshot_author_ids         (author_ids) USING gin
#  idx_mv_pub_search_snapshot_element            (element_type,element_id)
#  idx_mv_pub_search_snapshot_embargo_label      (embargo_label)
#  idx_mv_pub_search_snapshot_institution_names  (institution_names) USING gin
#  idx_mv_pub_search_snapshot_molecule_id        (molecule_id)
#  idx_mv_pub_search_snapshot_ontology_term_ids  (ontology_term_ids) USING gin
#  idx_mv_pub_search_snapshot_pub_id             (publication_id) UNIQUE
#  idx_mv_pub_search_snapshot_published_at       (published_at)
#  idx_mv_pub_search_snapshot_published_by       (published_by)
#  idx_mv_pub_search_snapshot_rxno               (reaction_rxno)
#  idx_mv_pub_search_snapshot_year               (year_published)
#
class MvPublicationSearchSnapshot < ApplicationRecord
  self.table_name = 'mv_publication_search_snapshot'
  self.primary_key = :publication_id

  def readonly?
    true
  end

  def self.refresh(concurrently: true)
    Scenic.database.refresh_materialized_view(:mv_publication_search_snapshot,
                                              concurrently: concurrently,
                                              cascade: false)
  end
end
