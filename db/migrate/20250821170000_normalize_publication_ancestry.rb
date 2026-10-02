class NormalizePublicationAncestry < ActiveRecord::Migration[6.1]
  def up
    # Store the view definitions for all publication-related views
    view_definitions = {}

    %w[publication_authors publication_collections publication_ontologies publication_statics].each do |view_name|
      result = connection.execute(<<~SQL.squish)
        SELECT pg_get_viewdef('#{view_name}'::regclass, true) AS definition;
      SQL
      view_definitions[view_name] = result.first['definition']
    end

    # Drop all dependent views
    execute "DROP VIEW IF EXISTS publication_authors;"
    execute "DROP VIEW IF EXISTS publication_collections;"
    execute "DROP VIEW IF EXISTS publication_ontologies;"
    execute "DROP VIEW IF EXISTS publication_statics;"

    # Normalize existing data
    execute <<~SQL.squish
      UPDATE publications
      SET ancestry = '/' || trim(both '/' FROM ancestry) || '/'
      WHERE ancestry IS NOT NULL
        AND NOT (ancestry LIKE '/%' AND ancestry LIKE '%/');
    SQL

    execute <<~SQL.squish
      UPDATE publications
      SET ancestry = '/'
      WHERE ancestry IS NULL;
    SQL

    # Apply column changes (default, not null, collation)
    change_column :publications, :ancestry, :string, default: '/', null: false, collation: 'C'

    # Recreate all views with any necessary updates for ancestry format changes
    view_definitions.each do |view_name, definition|
      if view_name == 'publication_ontologies'
        # Fix the ancestry parsing in publication_ontologies view to handle the new format
        updated_definition = definition.gsub(
          'string_to_array(sub.ancestry::text, \'/\'::text)::integer[]',
          'array_remove(string_to_array(sub.ancestry::text, \'/\'::text), \'\')::integer[]'
        )
        execute "CREATE VIEW #{view_name} AS #{updated_definition};"
      else
        execute "CREATE VIEW #{view_name} AS #{definition};"
      end
    end
  end

  def down
    # Store the view definitions for all publication-related views
    view_definitions = {}

    %w[publication_authors publication_collections publication_ontologies publication_statics].each do |view_name|
      result = connection.execute(<<~SQL.squish)
        SELECT pg_get_viewdef('#{view_name}'::regclass, true) AS definition;
      SQL
      view_definitions[view_name] = result.first['definition']
    end

    # Drop all dependent views
    execute "DROP VIEW IF EXISTS publication_authors;"
    execute "DROP VIEW IF EXISTS publication_collections;"
    execute "DROP VIEW IF EXISTS publication_ontologies;"
    execute "DROP VIEW IF EXISTS publication_statics;"

    change_column :publications, :ancestry, :string, default: nil, null: true, collation: nil

    # Restore NULL for root paths
    execute <<~SQL.squish
      UPDATE publications
      SET ancestry = NULL
      WHERE ancestry = '/';
    SQL

    # Trim slashes from all remaining values
    execute <<~SQL.squish
      UPDATE publications
      SET ancestry = trim(both '/' FROM ancestry)
      WHERE ancestry IS NOT NULL;
    SQL

    # Recreate all views
    view_definitions.each do |view_name, definition|
      execute "CREATE VIEW #{view_name} AS #{definition};"
    end
  end
end
