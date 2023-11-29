# frozen_string_literal: true

# Create generic elements
class BuildEmbargoDoi < ActiveRecord::Migration[5.2]
  def change
    unless User.chemotion_user.nil?
      su_id = User.chemotion_user.id
      acols = Collection.joins("INNER JOIN collections acol ON acol.id = collections.ancestry::int").where("acol.label = 'Embargoed Publications'")
      acols.each do |col|
        if Publication.where("taggable_data->>'label' = '" + col.label + "'").length == 0
          d = Doi.create_for_element!(col)
          Publication.create!(
            state: Publication::STATE_PENDING,
            element: col,
            created_at: col.created_at,
            published_by: col.sync_collections_users&.first&.user_id || 0,
            doi: d,
            taggable_data: { label: col.label, col_doi: d.full_doi }
          )
        end
      end
    end
  end
end
