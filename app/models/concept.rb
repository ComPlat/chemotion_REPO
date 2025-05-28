# == Schema Information
#
# Table name: concepts
#
#  id            :bigint           not null, primary key
#  taggable_data :jsonb
#  doi_id        :integer
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  deleted_at    :datetime
#  metadata_xml  :text
#

class Concept < ApplicationRecord
  acts_as_paranoid

  has_many :publications
  belongs_to :doi

  def latest_publication
    self.publications.includes(:doi).order(Arel.sql("dois.suffix desc")).first
  end

  def update_for_doi!(doi)
    self.metadata_xml = nil
    self.save!
  end

  def update_tag
    self.taggable_data = self.publications.includes(:doi).order(Arel.sql("dois.suffix desc")).map do |publication|
      publication.taggable_data
    end
    self.save!
  end

  def self.create_for_doi!(doi)
    return unless ENV['REPO_VERSIONING'] == 'true'

    # concept_doi = doi.dup
    # concept_doi.doiable = nil
    # concept_doi.version_count = nil
    # concept_doi.suffix = doi.suffix + "/concept"
    # concept_doi.save!

    # Create a new DOI for the concept
    concept_doi = Doi.find_or_create_by(
      inchikey: doi.inchikey,
      molecule_count: doi.molecule_count,
      doiable: nil,
      version_count: nil,
      suffix: doi.suffix + "/concept"
    )
    Concept.create!(doi: concept_doi)
  end
end