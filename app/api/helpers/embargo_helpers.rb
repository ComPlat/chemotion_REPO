# frozen_string_literal: true

# A helper for submission
module EmbargoHelpers
  extend Grape::API::Helpers


  def ext_embargo_list(user_id)
    Publication.where(element_type: 'Collection')
    .where.not(state: 'completed')
    .where("review -> 'submitters' @> ?", user_id.to_s)
    .pluck(:element_id)
  end

  ## Get embargo selection list for submission
  def embargo_select_list(is_submit, current_user, is_reviewer, is_embargo_viewer)
    is_submitter = false
    if (is_reviewer || is_embargo_viewer) && is_submit == false
      es = Publication.where(element_type: 'Collection', state: 'pending').order(Arel.sql("taggable_data->>'label' ASC"))
    else
      is_submitter = current_user.type == 'Anonymous' ? false : true
      cols = if current_user.type == 'Anonymous'
              Collection.where(id: current_user.sync_in_collections_users.pluck(:collection_id)).where.not(label: 'chemotion')
            else
              ext_col_ids = ext_embargo_list(current_user.id) || []
              Collection.where(ancestry: current_user.publication_embargo_collection.id).or(Collection.where(id: ext_col_ids))
            end
      es = Publication.where(element_type: 'Collection', element_id: cols.pluck(:id)).order(Arel.sql("taggable_data->>'label' ASC")) unless cols&.empty?
    end
    { repository: es, current_user: { id: current_user.id, type: current_user.type, is_reviewer: is_reviewer, is_submitter: is_submitter } }
  rescue StandardError => e
    Publication.repo_log_exception(e, { is_submit: is_submit, user_id: current_user&.id, is_reviewer: is_reviewer, is_embargo_viewer: is_embargo_viewer })
    { error: e.message }
  end

  def assign_embargo(element, embargo, current_user, is_new = false)
    case element['type']
    when 'Sample'
      CollectionsSample
    when 'Reaction'
      CollectionsReaction
    end.create_in_collection(element['id'], [embargo.id])
    { element: element, new_embargo: embargo,
      is_new_embargo: is_new,
      message: "#{element['type']} [#{element['title']}] has been assigned to Embargo Bundle [#{embargo.label}]" }
  rescue StandardError => e
    Publication.repo_log_exception(e, { element: element&.id, user_id: current_user&.id, is_new: is_new })
    { error: e.message }
  end

  def embargo_list(embargo_collection, current_user)
    sample_list = Publication.where(ancestry: nil, element: embargo_collection.samples).order(updated_at: :desc)
    reaction_list = Publication.where(ancestry: nil, element: embargo_collection.reactions).order(updated_at: :desc)
    list = sample_list + reaction_list
    elements = []
    list.each do |e|
      element_type = e.element&.class&.name
      u = User.with_deleted.find(e.published_by) unless e.published_by.nil?
      svg_file = e.element.sample_svg_file if element_type == 'Sample'
      title = e.element.short_label if element_type == 'Sample'

      svg_file = e.element.reaction_svg_file if element_type == 'Reaction'
      title = e.element.short_label if element_type == 'Reaction'

      scheme_only = element_type == 'Reaction' && e.taggable_data && e.taggable_data['scheme_only']
      elements.push(
        id: e.element_id, svg: svg_file, type: element_type, title: title,
        published_by: u&.name, submit_at: e.created_at, state: e.state, scheme_only: scheme_only
      )
    end
    { elements: elements, embargo_id: params[:collection_id], current_user: { id: current_user.id, type: current_user.type } }
  rescue StandardError => e
    Publication.repo_log_exception(e, { embargo_collection: embargo_collection&.id, user_id: current_user&.id })
    { error: e.message }
  end

  def create_anonymous_user(embargo_collection, current_user)
    name_abbreviation = "e#{SecureRandom.random_number(9999)}"
    email = "#{embargo_collection.id}.#{name_abbreviation}@chemotion.net"
    pwd = Devise.friendly_token.first(8)
    first_name = 'External'
    last_name = 'Chemotion'
    type = 'Anonymous'

    params = { email: email, password: pwd, first_name: first_name, last_name: last_name, type: type, name_abbreviation: name_abbreviation, confirmed_at: Time.now }
    new_obj = User.create!(params)
    new_obj.profile.update!({data: {}})
    # sync collection with Anonymous user
    chemotion_user = User.chemotion_user
    root_label = 'with %s' %chemotion_user.name_abbreviation
    rc = Collection.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, is_locked: true, is_shared: true, label: root_label)

    # Chemotion Collection
    SyncCollectionsUser.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, collection_id: Collection.public_collection_id,
    permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)


    SyncCollectionsUser.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, collection_id: embargo_collection.id,
    permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)

    # send mail
    if ENV['PUBLISH_MODE'] == 'production'
      PublicationMailer.mail_external_review(current_user, embargo_collection.label, email, pwd).deliver_now
    end

    { message: 'A temporary account has been created' }
  rescue StandardError => e
    Publication.repo_log_exception(e, { embargo_collection: embargo_collection&.id, user_id: current_user&.id })
    { error: e.message }
  end

  def move_embargo(embargo_collection, params, current_user)
    element = params[:element]
    new_embargo_collection = Repo::EmbargoHandler.find_or_create_embargo(params[:new_embargo]&.to_i, current_user) if params[:new_embargo].present? && params[:new_embargo]&.to_i >= 0
    case element['type']
    when 'Sample'
      CollectionsSample
    when 'Reaction'
      CollectionsReaction
    end.remove_in_collection(element['id'], [embargo_collection.id])

    case element['type']
    when 'Sample'
      CollectionsSample
    when 'Reaction'
      CollectionsReaction
    end.create_in_collection(element['id'], [new_embargo_collection.id])

    embargo_collection&.publication&.refresh_embargo_metadata
    new_embargo_collection&.publication&.refresh_embargo_metadata
    { col_id: embargo_collection.id,
      new_embargo: new_embargo_collection.publication,
      is_new_embargo: params[:new_embargo]&.to_i == 0,
      message: "#{element['type']} [#{element['title']}] has been moved from Embargo Bundle [#{embargo_collection.label}] to Embargo Bundle [#{new_embargo_collection.label}]" }
    rescue StandardError => e
      Publication.repo_log_exception(e, { embargo_collection: embargo_collection&.id, params: params, user_id: current_user&.id })
      { error: e.message }
  end

end
