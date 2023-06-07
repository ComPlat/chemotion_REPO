class CreatePublicationAuthors < ActiveRecord::Migration[4.2]
  def change
    create_view :publication_authors
  end
end
