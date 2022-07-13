# frozen_string_literal: true

# Add column identifier into segment_klasses
class AddSegmentKlassIdentifier < ActiveRecord::Migration[5.2]
  def self.up
    execute 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
    add_column :segment_klasses, :identifier, :string unless column_exists? :segment_klasses, :identifier
  end

  def self.down
    remove_column :segment_klasses, :identifier if column_exists? :segment_klasses, :identifier
  end
end
