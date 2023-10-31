module SamplePolicySerializable
  extend ActiveSupport::Concern

  included do
    alias_method :original_initialize, :initialize

    def initialize(element, options={})
      original_initialize(element)
      @element = element
      @policy = options.class == Hash && options[:policy]
    end

    def can_update
      @policy && @policy.try(:update?)
    end

    def can_copy
      @policy && @policy.try(:copy?)
    end

    def can_publish
      cp = @policy && @policy.try(:destroy?)
      # return false if !%w[Sample Reaction].include?(@element.class.name)      ####
      # || (@element.class.name == 'Sample' && @element.reactions&.length > 0)  ####

      # check if the element is in the versions collection of the user
      if @policy && @policy.user.versions_collection.samples.exists?(id: @element.id)
        cp = true
      end

      # check if the sample has already been submitted for publication
      pub = Publication.find_by(element: @element)

      return cp if pub.nil? || pub&.state == 'reviewed'
      false
    end
  end
end
