class CreateHubLogs < ActiveRecord::Migration[5.0]
  def self.up
    unless table_exists? :hub_logs
      create_table :hub_logs do |t|
        t.string :klass_type
        t.string :klass_id
        t.string :origin
        t.string :uuid
        t.string :version
        t.datetime :created_at
      end
      end
  end

  def self.down
    drop_table :hub_logs if table_exists? :hub_logs
  end
end
