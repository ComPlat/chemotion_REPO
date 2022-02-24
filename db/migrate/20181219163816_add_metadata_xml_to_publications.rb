class AddMetadataXmlToPublications < ActiveRecord::Migration[4.2]
  def change
    add_column :publications, :metadata_xml, :text
  end
end
