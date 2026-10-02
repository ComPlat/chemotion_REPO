# frozen_string_literal: true

# Chemotion Repository-only channel subject constants.
# Referenced as Channel::PUBLICATION_REVIEW etc. — works via include because
# Ruby's constant lookup traverses the ancestor chain.
module RepoChannel
  extend ActiveSupport::Concern

  PUBLICATION_REVIEW = 'Publication Review'
  PUBLICATION_PUBLISHED = 'Publication Published'
  SUBMITTING = 'Publication Submission'
end
