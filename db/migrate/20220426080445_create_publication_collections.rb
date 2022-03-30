class CreatePublicationCollections < ActiveRecord::Migration[5.2]
  def change
    create_view :publication_collections
  end
end
