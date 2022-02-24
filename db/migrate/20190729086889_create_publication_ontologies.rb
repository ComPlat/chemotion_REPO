class CreatePublicationOntologies < ActiveRecord::Migration[4.2]
  def change
    create_view :publication_ontologies
  end
end
