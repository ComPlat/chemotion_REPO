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

    def can_publish
      cp = @policy && @policy.try(:destroy?)
      # return false if !%w[Sample Reaction].include?(@element.class.name)      ####
      # || (@element.class.name == 'Sample' && @element.reactions&.length > 0)  ####

      pub = Publication.find_by(element: @element)
      return cp if pub.nil? || pub&.state == 'reviewed'
      false
    end
  end
end
