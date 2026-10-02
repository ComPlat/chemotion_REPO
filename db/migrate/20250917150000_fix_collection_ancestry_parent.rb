# frozen_string_literal: true

class FixCollectionAncestryParent < ActiveRecord::Migration[6.1]
  def up
    # Find all collections whose ancestry is a single id (e.g., '/1546/')
    # and whose parent has a non-root ancestry (e.g., '/1398/').
    execute <<-SQL.squish
      UPDATE collections AS child
      SET ancestry = parent.ancestry || parent.id::text || '/'
      FROM collections AS parent
      WHERE child.ancestry = '/' || parent.id::text || '/'
        AND parent.ancestry IS NOT NULL
        AND parent.ancestry != '/';
    SQL
  end

  def down
    # This migration is not easily reversible
    raise ActiveRecord::IrreversibleMigration
  end
end