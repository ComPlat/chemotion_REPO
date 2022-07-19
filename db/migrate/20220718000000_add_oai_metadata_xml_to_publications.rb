class AddOaiMetadataXmlToPublications < ActiveRecord::Migration[5.2]
  def self.up
    add_column :publications, :oai_metadata_xml, :text
  end

  def self.down
    remove_column :publications, :oai_metadata_xml if column_exists? :publications, :oai_metadata_xml
  end
end
