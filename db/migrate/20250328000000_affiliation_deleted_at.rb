class AffiliationDeletedAt < ActiveRecord::Migration[6.1]
  def change
    add_column :affiliations, :deleted_at, :datetime unless column_exists? :affiliations, :deleted_at
  end
end