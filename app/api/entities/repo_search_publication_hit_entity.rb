# frozen_string_literal: true

module Entities
  # Result row for the publication-page faceted search API
  # (`/api/v1/repo_search/results`). Detail views still load via existing
  # endpoints; this entity carries enough metadata to render a rich list
  # without an extra round-trip.
  class RepoSearchPublicationHitEntity < ApplicationEntity
    ELEMENT_TYPE_PREFIX = { 'Sample' => 'CRS', 'Reaction' => 'CRR' }.freeze

    expose :id
    expose :element_type
    expose :element_id
    expose :state
    expose :published_at
    expose :year do |pub|
      pub.published_at&.year
    end
    expose :chemotion_id do |pub|
      prefix = ELEMENT_TYPE_PREFIX[pub.element_type]
      prefix ? "#{prefix}-#{pub.id}" : nil
    end
    expose :title do |pub|
      pub.element.respond_to?(:name) ? pub.element.name : nil
    rescue StandardError
      nil
    end
    expose :molecule_id do |pub|
      pub.element_type == 'Sample' ? pub.element.try(:molecule_id) : nil
    end
    expose :doi do |pub|
      pub.doi&.full_doi
    end
    expose :svg_file do |pub|
      element = pub.element
      next nil unless element

      case pub.element_type
      when 'Sample' then element.try(:sample_svg_file)
      when 'Reaction' then element.try(:reaction_svg_file)
      end
    end
    expose :svg_path do |pub, _opts|
      element = pub.element
      next nil unless element

      file = case pub.element_type
             when 'Sample' then element.try(:sample_svg_file)
             when 'Reaction' then element.try(:reaction_svg_file)
             end
      next nil if file.blank?

      pub.element_type == 'Sample' ? "/images/samples/#{file}" : "/images/reactions/#{file}"
    end
    expose :authors do |pub|
      affiliations = pub.taggable_data&.dig('affiliations') || {}
      Array(pub.taggable_data&.dig('creators')).map do |c|
        aff_names = Array(c['affiliationIds']).map { |aid| affiliations[aid.to_s] }.compact_blank
        {
          name: c['name'] || [c['givenName'], c['familyName']].compact.join(' '),
          given_name: c['givenName'],
          family_name: c['familyName'],
          affiliation: aff_names.join('; ').presence,
          orcid: c['ORCID'] || c['orcid'],
          id: c['id'],
        }.compact
      end
    end
    expose :institutions do |pub|
      Array((pub.taggable_data&.dig('affiliations') || {}).values).compact_blank.uniq
    end
    expose :scheme_only do |pub|
      pub.taggable_data && pub.taggable_data['scheme_only'] == true
    end
    # Filled in by the API layer with batched lookups.
    expose :embargo do |pub, opts|
      opts.dig(:embargo_by_pub_id, pub.id) || ''
    end
    expose :contributor do |pub, opts|
      opts.dig(:contributor_by_pub_id, pub.id)
    end
    expose :contributor_abbreviation do |pub, opts|
      opts.dig(:contributor_abbreviation_by_pub_id, pub.id)
    end
    expose :contributor_affiliation do |pub, opts|
      opts.dig(:contributor_affiliation_by_pub_id, pub.id)
    end
    expose :ana_cnt do |pub, opts|
      opts.dig(:ana_cnt_by_pub_id, pub.id) || 0
    end
    expose :xvial_count do |pub, opts|
      opts.dig(:xvial_by_pub_id, pub.id, :count) || 0
    end
    expose :xvial_com do |pub, opts|
      opts.dig(:xvial_by_pub_id, pub.id, :com) || 0
    end
  end
end
