class CreatePublicationOntologies < ActiveRecord::Migration
  def change
    create_view :publication_ontologies
  end
end
