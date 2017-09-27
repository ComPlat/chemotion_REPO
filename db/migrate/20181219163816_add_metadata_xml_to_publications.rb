class AddMetadataXmlToPublications < ActiveRecord::Migration
  def change
    add_column :publications, :metadata_xml, :text
  end
end
