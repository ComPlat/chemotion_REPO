class CreatePublicationStatics < ActiveRecord::Migration[4.2]
  def change
    create_view :publication_statics
  end
end
