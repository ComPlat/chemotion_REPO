# frozen_string_literal: true

# Refreshes a single search materialized view (publication search or molecule
# archive). Enqueue once per MV so each gets independent retry semantics and
# DJ visibility.
#
#   RefreshRepoSearchMvJob.perform_later('MvPublicationSearchSnapshot')
#   RefreshRepoSearchMvJob.perform_later('MvMoleculeArchiveSnapshot')
#
# The companion regular views (`v_publication_search_delta`,
# `v_molecule_archive_delta`) cover the gap between refreshes via the union view.
class RefreshRepoSearchMvJob < ApplicationJob
  queue_as :default

  SUPPORTED_MODELS = %w[MvPublicationSearchSnapshot MvMoleculeArchiveSnapshot].freeze

  # Postgres rejects `REFRESH MATERIALIZED VIEW CONCURRENTLY` if the MV has
  # never been populated WITH DATA (typical for a freshly-created MV with
  # `no_data: true`). In that case we want to fall back to a plain refresh so
  # the view still gets populated. Anything else (lock timeout, deadlock,
  # network blip) should raise so the job retries instead of silently taking
  # an ACCESS EXCLUSIVE lock on the read path.
  #
  # Postgres phrases the unpopulated-MV error differently across versions:
  # older ones say the view "has not been populated", PG16 says CONCURRENTLY
  # "cannot be used when the materialized view is not populated". Match both.
  CONCURRENT_FALLBACK_PATTERNS = [
    /has not been populated/i,
    /is not populated/i,
    /cannot be executed from a function or multi-command string/i,
    /REFRESH MATERIALIZED VIEW CONCURRENTLY cannot run inside a transaction block/i,
  ].freeze

  def perform(model_name)
    raise ArgumentError, "unsupported MV: #{model_name}" unless SUPPORTED_MODELS.include?(model_name)

    model = model_name.constantize
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    begin
      fell_back = refresh_with_fallback(model)
      log_mv_refresh(model: model, started: started, fell_back: fell_back)
    rescue StandardError => e
      log_mv_refresh(model: model, started: started, error: e)
      raise
    end
  end

  private

  # Returns true if we used a plain (locking) refresh instead of CONCURRENTLY,
  # false if CONCURRENTLY succeeded.
  #
  # CONCURRENTLY cannot run inside a transaction block, and — critically — a
  # failed attempt aborts the surrounding transaction, which would then break
  # the plain-refresh fallback with "current transaction is aborted". So if we
  # are already inside a transaction (tests, console, an enclosing callback),
  # skip CONCURRENTLY entirely and refresh plainly (legal inside a tx).
  def refresh_with_fallback(model)
    if ActiveRecord::Base.connection.transaction_open?
      model.refresh(concurrently: false)
      return true
    end

    model.refresh(concurrently: true)
    false
  rescue ActiveRecord::StatementInvalid => e
    raise unless concurrent_fallback?(e)

    Rails.logger.error(
      "[#{self.class}] CONCURRENTLY refresh fell back for #{model.table_name}: " \
      "#{e.message.lines.first&.strip}",
    )
    model.refresh(concurrently: false)
    true
  end

  def concurrent_fallback?(error)
    msg = error.message.to_s
    CONCURRENT_FALLBACK_PATTERNS.any? { |re| msg.match?(re) }
  end

  # One structured line to log/repo_search.log per refresh, alongside the
  # search-request lines (filter with `grep 'source=mv_refresh'`). `fell_back`
  # distinguishes a CONCURRENTLY refresh from the plain locking fallback.
  # Logging never breaks the job — failures degrade to a warn.
  def log_mv_refresh(model:, started:, fell_back: nil, error: nil)
    payload = {
      source: 'mv_refresh',
      event: 'refresh',
      model: model.table_name,
      status: error ? 'error' : 'ok',
      fell_back: fell_back,
      rows: error ? nil : safe_row_count(model),
      duration_ms: ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round(1),
    }
    payload[:error] = error.message.lines.first&.strip if error
    RepoSearchConfig.logger.info(RepoSearchConfig.format_payload(payload))
  rescue StandardError => e
    Rails.logger.warn("RefreshRepoSearchMvJob logging failed: #{e.message}")
  end

  def safe_row_count(model)
    model.count
  rescue StandardError
    nil
  end
end
