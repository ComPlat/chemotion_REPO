class AddRorFieldsToAffiliations < ActiveRecord::Migration[6.1]
  def change
    add_column :affiliations, :ror_id, :string
    add_column :affiliations, :original_organization, :string
    add_index :affiliations, :ror_id
  end
end