# frozen_string_literal: true

module Entities
  module Concerns
    module RepoSampleHelper
      def concept
        object.publication.concept unless object.publication.nil?
      end

      def is_repo_public
        cols = object.tag&.taggable_data&.dig('collection_labels')&.select do |c|
          c['id'] == ENV['PUBLIC_COLL_ID']&.to_i || c['id'] == ENV['SCHEME_ONLY_REACTIONS_COLL_ID']&.to_i
        end
        (cols && cols.length > 0) || false
      end
    end
  end
end
