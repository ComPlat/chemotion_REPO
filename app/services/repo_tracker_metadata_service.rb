# frozen_string_literal: true

# Service to build metadata for RepoTrackerJob based on state and params
class RepoTrackerMetadataService
  def self.build_metadata(state:, element:, new_element:, to_system:, eln_info:, user:, params: {})
    Rails.logger.debug "RepoTrackerMetadataService.build_metadata called with state: #{state.inspect} (class: #{state.class})"
    eln_info = {} if eln_info.nil? || !eln_info.is_a?(Hash)

    base = {
      element_id: element.id.to_s,
      element_type: element.class.name,
      element_short_label: element.short_label,
      eln_short_label: eln_info && eln_info['short_label'],
      eln_id: eln_info && eln_info['id'].to_s,
      eln_origin: eln_info&& eln_info['origin'],
      created_at: Time.now.iso8601,
      user_email: user.email,
    }

    case state
    when 'processed'
      base.merge({
        title: 'Received from Chemotion ELN',
        description: "#{element.class.name} has been received and processed",
        repo_short_label: element.short_label,
        repo_name: element.name,
        id: element.id.to_s,
      }).merge(params)
    when 'submitted'
      base.merge({
        title: 'Publication Submitted',
        description: 'Submit publication for reiew and publishing',
        submission_short_label: new_element&.short_label,
        submission_name: new_element&.name,
        authors: get_authors_info(new_element),
        analyses: get_analyses_info(new_element),
        submission_id: new_element&.id&.to_s,
        submission_doi: new_element&.doi&.full_doi,
      }).merge(params)
    when 'published'
      base.merge({
        title: 'Publication Published',
        description: 'Submit publication for reiew and publishing',
        submission_short_label: new_element&.short_label,
        submission_name: new_element&.name,
        authors: get_authors_info(new_element),
        analyses: get_analyses_info(new_element),
        submission_id: new_element&.id&.to_s,
        submission_doi: new_element&.doi&.full_doi,
      }).merge(params)
    else
      title = to_system == 'nmrxiv' ? 'Chemotion Repository to nmrXiv' : 'Chemotion ELN to Repository'
      base.merge({
        title: title,
        description: title,
        experiment_type: 'Element'
      }).merge(params)
    end
  rescue => e
    Rails.logger.error e.backtrace.join("\n")
  end

  def self.get_authors_info(element)
    return [] unless element&.tag&.taggable_data

    creators = element.tag.taggable_data.dig('publication', 'creators') || []
    creators.map do |author|
      author_info = {
        name: author['name'],
        givenName: author['givenName'],
        familyName: author['familyName']
      }
      author_info[:orcid] = author['ORCID'] if author['ORCID'].present?
      author_info[:affiliations] = get_author_affiliations(author, element.tag.taggable_data) if author['affiliationIds']&.any?
      author_info.compact
    end
  end

  def self.get_author_affiliations(author, taggable_data)
    return [] unless author['affiliationIds']&.any?

    author['affiliationIds'].map do |aff_id|
      affiliation_name = taggable_data.dig('publication', 'affiliations', aff_id.to_s)
      { name: affiliation_name } if affiliation_name
    end.compact
  end

  def self.get_analyses_info(element)
    return [] unless element && element.respond_to?(:analyses)

    analyses = element.analyses || []
    analyses.map do |analysis|
      analysis_info = {
        id: analysis.id,
        name: analysis.name,
        kind: get_analysis_kind(analysis),
        status: get_analysis_status(analysis),
        instrument: get_analysis_instrument(analysis)
      }
      analysis_info.compact
    end
  end

  def self.get_analysis_kind(analysis)
    return nil unless analysis.extended_metadata&.dig('kind')

    kind = analysis.extended_metadata['kind']
    # Extract the readable part from CHMO format like "CHMO:0000595 | 13C NMR"
    kind_parts = kind.split('|')
    if kind_parts.length > 1
      kind_parts[1].strip
    else
      kind
    end
  end

  def self.get_analysis_status(analysis)
    analysis.extended_metadata&.dig('status')
  end

  def self.get_analysis_instrument(analysis)
    analysis.extended_metadata&.dig('instrument')
  end

  private_class_method :get_authors_info, :get_author_affiliations, :get_analyses_info, :get_analysis_kind, :get_analysis_status, :get_analysis_instrument
end
