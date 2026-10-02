# frozen_string_literal: true

# Recurring scheduler for the repo-search materialized views. Registered in
# config/initializers/delayed_job_config.rb and scheduled by InitCronJobsJob on
# the DJ cron (schedule via CRON_CONFIG_REPO_SEARCH_MV).
#
# InitCronJobsJob schedules recurring jobs with a no-arg `perform`, but
# RefreshRepoSearchMvJob#perform takes a model name and cannot be cron-scheduled
# directly. This thin wrapper bridges that: it enqueues one RefreshRepoSearchMvJob
# per MV so each keeps its own retry semantics and DJ visibility rather than one
# job refreshing both.
class RefreshRepoSearchMvCronJob < ApplicationJob
  queue_as :default

  def perform
    RefreshRepoSearchMvJob::SUPPORTED_MODELS.each do |model_name|
      RefreshRepoSearchMvJob.perform_later(model_name)
    end
  end
end
