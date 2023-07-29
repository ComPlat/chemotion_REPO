# frozen_string_literal: true

# Add column identifier into segment_klasses
class AddGenericUpdatedBy < ActiveRecord::Migration[5.2]
  def self.up
    add_column :segment_klasses, :updated_by, :integer unless column_exists? :segment_klasses, :updated_by
    add_column :segment_klasses, :released_by, :integer unless column_exists? :segment_klasses, :released_by
    add_column :segment_klasses, :sync_by, :integer unless column_exists? :segment_klasses, :sync_by
    add_column :segment_klasses, :admin_ids, :jsonb, default: {} unless column_exists? :segment_klasses, :admin_ids
    add_column :segment_klasses, :user_ids, :jsonb, default: {} unless column_exists? :segment_klasses, :user_ids

    add_column :dataset_klasses, :updated_by, :integer unless column_exists? :dataset_klasses, :updated_by
    add_column :dataset_klasses, :released_by, :integer unless column_exists? :dataset_klasses, :released_by
    add_column :dataset_klasses, :sync_by, :integer unless column_exists? :dataset_klasses, :sync_by
    add_column :dataset_klasses, :admin_ids, :jsonb, default: {} unless column_exists? :dataset_klasses, :admin_ids
    add_column :dataset_klasses, :user_ids, :jsonb, default: {} unless column_exists? :dataset_klasses, :user_ids

    add_column :element_klasses, :updated_by, :integer unless column_exists? :element_klasses, :updated_by
    add_column :element_klasses, :released_by, :integer unless column_exists? :element_klasses, :released_by
    add_column :element_klasses, :sync_by, :integer unless column_exists? :element_klasses, :sync_by
    add_column :element_klasses, :admin_ids, :jsonb, default: {} unless column_exists? :element_klasses, :admin_ids
    add_column :element_klasses, :user_ids, :jsonb, default: {} unless column_exists? :element_klasses, :user_ids

  end

  def self.down
    remove_column :segment_klasses, :updated_by if column_exists? :segment_klasses, :updated_by
    remove_column :segment_klasses, :released_by if column_exists? :segment_klasses, :released_by
    remove_column :segment_klasses, :sync_by if column_exists? :segment_klasses, :sync_by
    remove_column :segment_klasses, :admin_ids if column_exists? :segment_klasses, :admin_ids
    remove_column :segment_klasses, :user_ids if column_exists? :segment_klasses, :user_ids

    remove_column :dataset_klasses, :updated_by if column_exists? :dataset_klasses, :updated_by
    remove_column :dataset_klasses, :released_by if column_exists? :dataset_klasses, :released_by
    remove_column :dataset_klasses, :sync_by if column_exists? :dataset_klasses, :sync_by
    remove_column :dataset_klasses, :admin_ids if column_exists? :dataset_klasses, :admin_ids
    remove_column :dataset_klasses, :user_ids if column_exists? :dataset_klasses, :user_ids

    remove_column :element_klasses, :updated_by if column_exists? :element_klasses, :updated_by
    remove_column :element_klasses, :released_by if column_exists? :element_klasses, :released_by
    remove_column :element_klasses, :sync_by if column_exists? :element_klasses, :sync_by
    remove_column :element_klasses, :admin_ids if column_exists? :element_klasses, :admin_ids
    remove_column :element_klasses, :user_ids if column_exists? :element_klasses, :user_ids

  end
end
