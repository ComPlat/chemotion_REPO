# frozen_string_literal: true

namespace :repo_search_mv do
  desc 'Refresh the publication & molecule archive materialized views.'
  task refresh: :environment do
    started = Time.current
    puts "[repo_search_mv] refreshing #{started.iso8601}"
    RefreshRepoSearchMvJob::SUPPORTED_MODELS.each do |model_name|
      RefreshRepoSearchMvJob.new.perform(model_name)
    end
    puts "[repo_search_mv] done in #{(Time.current - started).round(2)}s"
  end

  desc 'Health-check: row counts in the union view vs live join. Exits 1 on >1% drift.'
  task health: :environment do
    union_count = VPublicationSearch.count
    live_count = Publication.where(state: Publication::STATE_COMPLETED,
                                   element_type: %w[Sample Reaction],
                                   deleted_at: nil).count
    drift = live_count.zero? ? 0.0 : ((union_count - live_count).abs / live_count.to_f) * 100
    puts "[repo_search_mv:health] union=#{union_count} live=#{live_count} drift=#{drift.round(3)}%"
    if drift > 1.0
      warn '[repo_search_mv:health] drift exceeds 1%, refresh may be stale'
      exit 1
    end
  end
end
