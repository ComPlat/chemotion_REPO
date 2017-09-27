class CreatePublicationAuthors < ActiveRecord::Migration
  def change
    create_view :publication_authors
  end
end
