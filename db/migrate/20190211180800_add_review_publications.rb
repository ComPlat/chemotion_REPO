class AddReviewPublications < ActiveRecord::Migration
 def change
   add_column :publications, :review, :jsonb
 end
end
