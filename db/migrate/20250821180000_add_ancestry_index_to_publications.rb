# frozen_string_literal: true

class AddAncestryIndexToPublications < ActiveRecord::Migration[6.1]
  INDEX_NAME = 'index_publications_on_ancestry'

  def up
    execute <<~SQL.squish
      CREATE INDEX IF NOT EXISTS #{INDEX_NAME}
      ON publications (ancestry COLLATE "C" varchar_pattern_ops)
      WHERE deleted_at IS NULL;
    SQL
  end

  def down
    execute <<~SQL.squish
      DROP INDEX IF EXISTS #{INDEX_NAME};
    SQL
  end
end