# frozen_string_literal: true

def fetch_molecule_viewer_config
  molecule_viewer_config = { 'feature' => { 'enabled' => false } }
  ActiveSupport.on_load(:active_record) do
    if ActiveRecord::Base.connection.table_exists?('matrices')
      molecule_viewer = Matrice.find_by(name: 'moleculeViewer')
      molecule_viewer_config = molecule_viewer_config.merge((molecule_viewer&.configs || {}))
      molecule_viewer_config = molecule_viewer_config.merge({ 'feature' => { 'enabled' => (molecule_viewer&.enabled || false) }})
    end
  rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
    Rails.logger.error("Error fetching molecule viewer config: #{e.message}")
  end
  ActiveSupport::OrderedOptions.new.tap do |config|
    config.chembox_client_id = molecule_viewer_config['chembox_client_id']
    config.chembox_endpoint = molecule_viewer_config['chembox_endpoint']
    config.feature_enabled = molecule_viewer_config['feature']['enabled'] || false
    config.viewer_client_id = molecule_viewer_config['viewer_client_id']
    config.viewer_endpoint = molecule_viewer_config['viewer_endpoint']
  end
end

Rails.application.configure do
  config.molecule_viewer_config = fetch_molecule_viewer_config
end
