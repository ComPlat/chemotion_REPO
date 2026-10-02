# frozen_string_literal: true

class AddPublishedAtIndexToPublications < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  def change
    add_index :publications, :published_at,
              algorithm: :concurrently,
              if_not_exists: true,
              name: 'index_publications_on_published_at'
  end
end
