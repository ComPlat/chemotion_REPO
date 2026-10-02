# frozen_string_literal: true

# Feature flag for the materialized-view-backed publication / molecule archive
# search. When true, the search helpers read from `v_publication_search` /
# `v_molecule_archive`; otherwise they run live joins.
# Default: off in production, on in development/test.
#
# Stored on a dedicated module (not Rails.application.config.x) because
# config/initializers/submit_rules.rb reassigns config.x wholesale and would
# wipe any key set here.
module RepoSearchConfig
  class << self
    attr_accessor :use_mv

    # Single search logger shared by publication search (RepoSearchAPI, see
    # #log_repo_search) and molecule archive search (RepoCompoundSearchAPI, see
    # #log_archive_search). Keeps the search path (MV vs REALTIME) and per-
    # request context out of the noisy main Rails log; one line per request.
    # The two sources are told apart by the `source=` and `event=` tokens.
    # Lazily built and memoized.
    def logger
      search_logger('repo_search')
    end
    alias archive_logger logger

    # Render a flat hash into a compact `key=val key=val` line. Hash/array
    # values are JSON-encoded so a structured field survives as one token.
    def format_payload(payload)
      payload.map do |key, value|
        value = value.to_json if value.is_a?(Hash) || value.is_a?(Array)
        "#{key}=#{value}"
      end.join(' ')
    end

    private

    def search_logger(name)
      (@search_loggers ||= {})[name] ||= ActiveSupport::Logger.new(
        Rails.root.join('log', "#{name}.log"),
      ).tap do |log|
        log.formatter = proc do |severity, time, _progname, msg|
          "[#{time.utc.iso8601}] #{severity.ljust(5)} #{msg}\n"
        end
      end
    end
  end
end

RepoSearchConfig.use_mv =
  ENV.fetch('REPO_SEARCH_USE_MV') do
    Rails.env.production? ? 'false' : 'true'
  end == 'true'
