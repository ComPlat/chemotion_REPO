class AddConceptToPublications < ActiveRecord::Migration[6.1]
  def change
    add_column :publications, :concept_id, :integer unless column_exists? :publications, :concept_id
  end
end