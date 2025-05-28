class AddAffiliationIdsToContributorsInTaggableData < ActiveRecord::Migration[6.1]
  def up
    # Find all publications with taggable_data that has contributors
    execute <<-SQL
      UPDATE publications
      SET taggable_data = jsonb_set(
        taggable_data,
        '{contributors, affiliationIds}',
        (
          SELECT COALESCE(
            jsonb_agg(id),
            '[]'::jsonb
          )
          FROM jsonb_array_elements_text(taggable_data->'contributors'->'affiliations') WITH ORDINALITY AS a(affiliation, idx)
          JOIN LATERAL (
            SELECT key::int AS id
            FROM jsonb_each_text(taggable_data->'affiliations')
            WHERE value = a.affiliation
            LIMIT 1
          ) AS b ON true
        )
      )
      WHERE taggable_data->'contributors'->'name' IS NOT NULL 
      AND taggable_data->'contributors'->'affiliationIds' IS NULL
      AND taggable_data->'contributors'->'affiliations' IS NOT NULL;
    SQL

    # Log migration summary
    publication_count = execute("SELECT COUNT(*) FROM publications WHERE taggable_data->'contributors'->'affiliationIds' IS NOT NULL;").first["count"]
    puts "Added affiliationIds to contributors for #{publication_count} publications"
  end

  def down
    # Remove the affiliationIds from contributors
    execute <<-SQL
      UPDATE publication
      SET taggable_data = taggable_data #- '{contributors, affiliationIds}'
      WHERE taggable_data->'contributors'->'affiliationIds' IS NOT NULL;
    SQL
    
    puts "Removed affiliationIds from contributors in publications"
  end
end
