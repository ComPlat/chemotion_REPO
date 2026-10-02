# frozen_string_literal: true

# Chemotion Repository-only helpers for UserAffiliation.
module RepoUserAffiliation
  extend ActiveSupport::Concern

  def ror_id
    affiliation&.ror_id
  end
end
