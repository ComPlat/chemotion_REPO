class CreatePublicationStatics < ActiveRecord::Migration
  def change
    create_view :publication_statics
  end
end
