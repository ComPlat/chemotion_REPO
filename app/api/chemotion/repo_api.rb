# frozen_string_literal: true

# Chemotion Repository-only aggregator API.
# All repo-specific Grape APIs are mounted here so api.rb stays aligned with
# upstream ELN. Mounted in app/api/api.rb as: `mount Chemotion::RepoAPI`.
module Chemotion
  class RepoAPI < Grape::API
    # Request paths that should bypass the API-wide authenticate! before-hook
    # because they are reached by anonymous / machine-to-machine callers.
    PUBLIC_URLS = [
      '/api/v1/labimotion_hub/',
      '/api/v1/gate/receiving_chunk',
      '/api/v1/gate/receiving_zip',
      '/api/v1/gate/received',
      '/api/v1/search/',
      '/api/v1/suggestion',
      '/api/v1/external_tokens/nmrxiv/callback/',
      '/api/v1/repo_search/',
      '/api/v1/repo_compound_search/',
    ].freeze

    # List of element types the Chemotion Repository exposes. Upstream ELN
    # exposes a superset; the repo restricts to these three.
    ELEMENTS = %w[research_plan reaction sample].freeze

    # Mapping element name -> ActiveRecord model. Mirrors ELEMENTS so lookups
    # via `API::ELEMENT_CLASS[element]` inside an `API::ELEMENTS.each` loop
    # always resolve. Upstream ELN also exposes screen, wellplate, cell_line,
    # device_description, vessel, and sequence_based_macromolecule_sample —
    # intentionally omitted here.
    ELEMENT_CLASS = {
      'research_plan' => ResearchPlan,
      'reaction' => Reaction,
      'sample' => Sample,
    }.freeze

    mount Chemotion::IntImportsAPI
    mount Chemotion::ExternalTokenAPI
    mount Chemotion::RepositoryAPI
    mount Chemotion::ArticleAPI
    mount Chemotion::CollaborationAPI
    mount Chemotion::PublicRepoAPI
    mount Chemotion::RepoSearchAPI
    mount Chemotion::RepoCompoundSearchAPI
    mount Chemotion::PublicDownloadAPI
    mount Chemotion::CrossrefAPI
    mount Chemotion::AiServicesAPI
    mount Chemotion::TemplateSubmissionAPI
    mount Chemotion::MoleculeRepoAPI
  end
end
