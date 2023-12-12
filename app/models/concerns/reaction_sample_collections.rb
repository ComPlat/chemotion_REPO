module ReactionSampleCollections
  extend ActiveSupport::Concern

  included do
    after_create :assign_sample_to_collections
  end

private

  def assign_sample_to_collections
    self.reaction.collections.each do |c|
      # same as CollectionsSample.where(sample: self.sample, collection: c).first_or_create
      # but should work with act_as_paranoid
      collection_sample = CollectionsSample.where(sample: self.sample, collection: c).with_deleted.first
      if collection_sample.nil?
        CollectionsSample.new(sample: self.sample, collection: c).save!
      elsif collection_sample.deleted?
        collection_sample.restore
      end
    end
  end
end
