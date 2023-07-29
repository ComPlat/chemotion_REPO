# frozen_string_literal: true

# Add column identifier into segment_klasses
class AddSegmentKlassIdentifier < ActiveRecord::Migration[5.2]
  def self.up
    execute 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
    add_column :segment_klasses, :identifier, :string unless column_exists? :segment_klasses, :identifier
    add_column :segment_klasses, :sync_time, :datetime unless column_exists? :segment_klasses, :sync_time
    add_column :segment_klasses, :metadata, :jsonb, default: {} unless column_exists? :segment_klasses, :metadata
    Labimotion::SegmentKlass.where(identifier: nil).find_each { |sk| sk.update!(identifier: SecureRandom.uuid) }

    add_column :dataset_klasses, :identifier, :string unless column_exists? :dataset_klasses, :identifier
    add_column :dataset_klasses, :sync_time, :datetime unless column_exists? :dataset_klasses, :sync_time
    add_column :dataset_klasses, :metadata, :jsonb, default: {} unless column_exists? :dataset_klasses, :metadata
    Labimotion::DatasetKlass.where(identifier: nil).find_each { |sk| sk.update!(identifier: SecureRandom.uuid) }

    add_column :element_klasses, :identifier, :string unless column_exists? :element_klasses, :identifier
    add_column :element_klasses, :sync_time, :datetime unless column_exists? :element_klasses, :sync_time
    add_column :element_klasses, :metadata, :jsonb, default: {} unless column_exists? :element_klasses, :metadata
    Labimotion::DatasetKlass.where(identifier: nil).find_each { |sk| sk.update!(identifier: SecureRandom.uuid) }
  end

  def self.down
    remove_column :segment_klasses, :identifier if column_exists? :segment_klasses, :identifier
    remove_column :segment_klasses, :sync_time if column_exists? :segment_klasses, :sync_time
    remove_column :segment_klasses, :metadata if column_exists? :segment_klasses, :metadata
    remove_column :dataset_klasses, :identifier if column_exists? :dataset_klasses, :identifier
    remove_column :dataset_klasses, :sync_time if column_exists? :dataset_klasses, :sync_time
    remove_column :dataset_klasses, :metadata if column_exists? :dataset_klasses, :metadata
    remove_column :element_klasses, :identifier if column_exists? :element_klasses, :identifier
    remove_column :element_klasses, :sync_time if column_exists? :element_klasses, :sync_time
    remove_column :element_klasses, :metadata if column_exists? :element_klasses, :metadata
  end
end
