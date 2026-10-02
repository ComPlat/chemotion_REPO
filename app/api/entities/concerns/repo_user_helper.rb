# frozen_string_literal: true

module Entities
  module Concerns
    module RepoUserHelper
      def affiliations
        a = {}
        object.affiliations.select(
          'id',
          'affiliations.department || chr(44)|| chr(32) || affiliations.organization || chr(44)|| chr(32) || affiliations.country as aff'
        ).reduce(a){|acc, affiliation| a[affiliation.id] = affiliation.aff}
        a
      end

      def orcid
        object.orcid
      end

      def current_affiliations
        a = {}
        object.current_affiliations.select(
          'id',
          'affiliations.department || chr(44)|| chr(32) || affiliations.organization || chr(44)|| chr(32) || affiliations.country as aff'
        ).reduce(a){|acc, affiliation| a[affiliation.id] = affiliation.aff}
        a
      end
    end
  end
end
