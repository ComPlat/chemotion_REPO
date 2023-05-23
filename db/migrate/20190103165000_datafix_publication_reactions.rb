class DatafixPublicationReactions < ActiveRecord::Migration
  def change
    unless User.chemotion_user.nil?
      Collection.public_collection.reactions.each do |r|
        r.reload
        r.save!
      end
    end
  end
end
