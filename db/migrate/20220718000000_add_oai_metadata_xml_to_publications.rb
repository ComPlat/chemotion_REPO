class AddOaiMetadataXmlToPublications < ActiveRecord::Migration[5.2]
  def self.up
    add_column :publications, :oai_metadata_xml, :text

    err_msg = {}
    Publication.where(state: ['completed', 'completed ver_20190116155110']).find_each do |pub|
      begin
        pub.persit_oai_metadata_xml!
      rescue StandardError => e
        err_msg[pub.id] = e.message
      end
    end
    File.write("json_export_oai_metadata_error_#{Time.now.to_i}.json", err_msg.to_json)
  end

  def self.down
    remove_column :publications, :oai_metadata_xml if column_exists? :publications, :oai_metadata_xml
  end
end
