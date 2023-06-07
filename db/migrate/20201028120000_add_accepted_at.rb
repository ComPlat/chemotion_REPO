# frozen_string_literal: true

# Add new column accepted_at to table: publications and data migration
class AddAcceptedAt < ActiveRecord::Migration[4.2]
  def up
    add_column(:publications, :accepted_at, :datetime) unless column_exists? :publications, :accepted_at

    Publication.where(state: ['accepted', 'completed', 'completed ver_20190116155110']).find_each do |pub|
      pub.update_columns(accepted_at: pub.root.published_at || pub.root.updated_at)
      pub.update_columns(published_at: pub.root.published_at || pub.root.updated_at) if pub.published_at.nil? && pub.state&.match(Regexp.union(%w[completed]))
    end
  end

  def down
    remove_column(:publications, :accepted_at) if column_exists? :publications, :accepted_at
  end
end
