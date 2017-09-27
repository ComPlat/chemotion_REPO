class DatafixPublicationReactions < ActiveRecord::Migration
  def change
    Collection.public_collection.reactions.each do |r|
      r.reload
      r.save!
    end
  end
end
