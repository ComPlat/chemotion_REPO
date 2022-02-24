class AddReviewPublications < ActiveRecord::Migration[4.2]
 def change
   add_column :publications, :review, :jsonb
 end
end
