# frozen_string_literal: true

# rubocop:disable Metrics/ModuleLength, Style/OptionalBooleanParameter, Naming/MethodParameterName, Layout/LineLength

module RepoSearchHelpers
  extend Grape::API::Helpers
  ELEMENT_TYPES = { 'R' => 'Reaction', 'S' => 'Sample', 'D' => 'Container' }.freeze

  def suggest_pid(qry)
    return [] unless qry =~ /\ACR(R|S|D)-(\d+)\Z/

    typ = Regexp.last_match(1)
    pid = Regexp.last_match(2)
    element_type = ELEMENT_TYPES[typ]
    pids = Publication.where(
      "state = 'completed' and element_type = ? and id = ?", element_type, pid
    ).map do |pub|
      "CR#{typ}-#{pub.id}"
    end
    pids || []
  rescue StandardError => e
    Rails.logger.error("Error suggest_pid: #{e.message}")
  end

  def suggest_embargo(current_user, query)
    cols = Collection.all_embargos(current_user.id).where("label like '#{query}%'").order(:label)
    suggestions = cols.map { |col| { name: col.label, search_by_method: 'embargo' } }
    { suggestions: suggestions }
  rescue StandardError => e
    Rails.logger.error("Error suggest_embargo: #{e.message}")
    { suggestions: [] }
  end
end
