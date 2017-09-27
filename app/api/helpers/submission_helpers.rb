# frozen_string_literal: true

# A helper for submission
module SubmissionHelpers
  extend Grape::API::Helpers

  def ols_validation(analyses)
    analyses.each do |ana|
      error!('analyses check fail', 404) if (ana.extended_metadata['kind'].match /^\w{3,4}\:\d{6,7}\s\|\s\w+/).nil?
    end
  end

  def coauthor_validation(coauthors)
    coauthor_ids = []
    coauthors.each do |coa|
      val = coa.strip
      p = User.where(type: %w[Person Collaborator]).where.not(confirmed_at: nil).where('id = ? or email = ?', val.to_i, val.to_s).first
      error!('invalid co-author: ' + val.to_s, 404) if p.nil?
      coauthor_ids << p.id
    end
    coauthor_ids
  end
end
