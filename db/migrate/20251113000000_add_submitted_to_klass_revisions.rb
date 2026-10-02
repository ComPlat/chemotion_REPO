# frozen_string_literal: true

class AddSubmittedToKlassRevisions < ActiveRecord::Migration[6.1]
  def change
    # Add submitted column to track submission count for each revision table
    # Default value is 0 for new and existing records
    add_column :dataset_klasses_revisions, :submitted, :integer, default: 0, null: false unless column_exists?(:dataset_klasses_revisions, :submitted)
    add_column :segment_klasses_revisions, :submitted, :integer, default: 0, null: false unless column_exists?(:segment_klasses_revisions, :submitted)
    add_column :element_klasses_revisions, :submitted, :integer, default: 0, null: false unless column_exists?(:element_klasses_revisions, :submitted)
  end
end
