# frozen_string_literal: true

# == Schema Information
#
# Table name: v_publication_search
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
class VPublicationSearch < ApplicationRecord
  self.table_name = 'v_publication_search'
  self.primary_key = :publication_id

  def readonly?
    true
  end
end
