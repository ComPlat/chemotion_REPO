module RepoParamsHelpers
  extend Grape::API::Helpers

  params :get_review_list_params do
    requires :type, type: String, desc: 'Search Type', values: %w[All Samples Reactions]
    requires :state, type: String, desc: 'Publication State', values: %w[All pending reviewed accepted]
    optional :label, type: Integer, desc: 'User label'
    optional :search_type, type: String, desc: 'search type', values: %w[All Name Embargo Submitter]
    optional :search_value, type: String, desc: 'search value'
    optional :page, type: Integer, desc: 'page'
    optional :pages, type: Integer, desc: 'pages'
    optional :per_page, type: Integer, desc: 'per page'
  end

  params :publish_sample_params do
    requires :id, type: Integer, desc: 'Sample Id'
    requires :analysesIds, type: Array[Integer], desc: 'Selected analyses ids'
    optional :coauthors, type: Array[Integer], default: [], desc: 'Co-author (User)'
    optional :reviewers, type: Array[Integer], default: [], desc: 'reviewers (User)'
    optional :refs, type: Array[Integer], desc: 'Selected references'
    optional :embargo, type: Integer, desc: 'Embargo collection'
    requires :license, type: String, desc: 'Creative Common License'
    requires :addMe, type: Boolean, desc: 'add me as author'
  end

  params :publish_reaction_params do
    requires :id, type: Integer, desc: 'Reaction Id'
    requires :analysesIds, type: Array[Integer], desc: 'Selected analyses ids'
    optional :coauthors, type: Array[Integer], default: [], desc: 'Co-author (User)'
    optional :reviewers, type: Array[Integer], default: [], desc: 'reviewers (User)'
    optional :refs, type: Array[Integer], desc: 'Selected references'
    optional :embargo, type: Integer, desc: 'Embargo collection'
    requires :license, type: String, desc: 'Creative Common License'
    requires :addMe, type: Boolean, desc: 'add me as author'
  end

  params :publish_reaction_scheme_params do
    requires :id, type: Integer, desc: 'Reaction Id'
    requires :temperature, type: Hash, desc: 'Temperature'
    requires :duration, type: Hash, desc: 'Duration'
    requires :products, type: Array, desc: 'Products'
    optional :coauthors, type: Array[String], default: [], desc: 'Co-author (User)'
    optional :embargo, type: Integer, desc: 'Embargo collection'
    optional :reviewers, type: Array[Integer], default: [], desc: 'reviewers (User)'
    requires :license, type: String, desc: 'Creative Common License'
    requires :addMe, type: Boolean, desc: 'add me as author'
    requires :schemeDesc, type: Boolean, desc: 'publish scheme'
  end

  params :save_repo_authors_params do
    requires :elementId, type: Integer, desc: 'Element Id'
    requires :elementType, type: String, desc: 'Element Type'
    optional :leaders, type: Array, default: nil, desc: 'Leaders'
    optional :taggData, type: Hash do
      optional :creators, type: Array[Hash]
      optional :affiliations, type: Hash
      optional :contributors, type: Hash
    end
  end

  params :assign_embargo_params do
    requires :new_embargo, type: Integer, desc: 'Collection id'
    requires :element, type: Hash, desc: 'Element' do
      requires :id, type: Integer, desc: 'Element id'
      requires :type, type: String, desc: 'Element type', values: %w[Sample Reaction]
      requires :title, type: String, desc: 'Element title'
    end
  end

  params :save_repo_labels_params do
    requires :elementId, type: Integer, desc: 'Element Id'
    requires :elementType, type: String, desc: 'Element Type'
    optional :user_labels, type: Array[Integer]
  end

  params :reviewing_params do
    requires :id, type: Integer, desc: 'Element Id'
    requires :type, type: String, desc: 'Type', values: %w[sample reaction collection]
    optional :comments, type: Hash
    optional :comment, type: String
    optional :checklist, type: Hash
    optional :analysesIds, type: Array[Integer]
    optional :coauthors, type: Array[Integer]
    optional :reviewers, type: Array[Integer]
    optional :reviewComments, type: String
  end

end