class DatafixPublicationReactions < ActiveRecord::Migration[4.2]
  def change
    Collection.public_collection.reactions.each do |r|
      r.reload
      r.save!
    end
  end
end
