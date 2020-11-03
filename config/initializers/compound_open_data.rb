# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'compound_open_data.yml')
  compound_opendata = Rails.application.config_for :compound_open_data

  Rails.application.configure do
    config.compound_opendata = ActiveSupport::OrderedOptions.new
    config.compound_opendata.allowed_uids = compound_opendata[:allowed_uids]
    sql = ActiveRecord::Base.send(:sanitize_sql_array, ['select to_regclass(?)::text as table_name', 'compound_open_datas'])
    table_name = ActiveRecord::Base.connection.exec_query(sql).to_a[0]['table_name']
    CompoundOpenData.table_name = table_name.present? ? table_name : 'compound_open_data_locals'
  end
else
  CompoundOpenData.table_name = 'compound_open_data_locals'
  Rails.application.configure do
    config.compound_opendata = nil
  end
end
