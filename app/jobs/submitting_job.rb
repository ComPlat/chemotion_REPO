# frozen_string_literal: true

class SubmittingJob < ApplicationJob
  include ActiveJob::Status
  queue_as :submitting

  def max_attempts
    1
  end

  def perform(params, type, author_ids, current_user_id)
    if params[:scheme_only]
      scheme_yield = params[:products]&.map { |v| v.slice(:id, :_equivalent) } || []
      scheme_params = {
        scheme_yield: scheme_yield,
        temperature: params[:temperature],
        duration: params[:duration],
        schemeDesc: params[:schemeDesc]
      }
    else
      scheme_params = {}
    end

    Repo::Submission.new(
      type: type,
      id: params[:id],
      author_ids: author_ids,
      group_leaders: params[:reviewers],
      analyses_ids: params[:analysesIds],
      refs: params[:refs],
      license: params[:license],
      embargo: params[:embargo],
      scheme_only: params[:scheme_only] || false,
      scheme_params: scheme_params,
      user_id: current_user_id
    ).submitting
  end
end