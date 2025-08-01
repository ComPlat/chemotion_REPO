# frozen_string_literal: true

class RepoTrackerJob < ApplicationJob
  include ActiveJob::Status
  queue_as :repo_tracker_job

  def perform(element, new_element, user_id, state)
    RepoTrackerService.new(element, new_element, user_id, state).call
  end
end
