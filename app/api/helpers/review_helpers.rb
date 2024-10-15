# frozen_string_literal: true

# A helper for reviewing publications
# It includes the following methods:
# 1. get_review_list: Get the list of publications to review
# 2. fetch_reviewing_reaction: Fetch the details of a reaction for reviewing
# 3. fetch_reviewing_sample: Fetch the details of a sample for reviewing

module ReviewHelpers
  extend Grape::API::Helpers

  def get_review_list(params, current_user, is_reviewer = false)
    type = params[:type].blank? || params[:type] == 'All' ? %w[Sample Reaction] : params[:type].chop!
    state = params[:state].empty? || params[:state] == 'All' ? [Publication::STATE_PENDING, Publication::STATE_REVIEWED, Publication::STATE_ACCEPTED] : params[:state]
    pub_scope = Publication.where(state: state, ancestry: nil, element_type: type)
    pub_scope = pub_scope.where("published_by = ? OR (review -> 'reviewers')::jsonb @> '?' OR (review -> 'submitters')::jsonb @> '?'", current_user.id, current_user.id, current_user.id) unless is_reviewer
    unless params[:search_value].blank? || params[:search_value] == 'All'
      case params[:search_type]
      when 'Submitter'
        pub_scope = pub_scope.where(published_by: params[:search_value])
      when 'Embargo'
        embargo_search = <<~SQL
          (element_type = 'Reaction' and element_id in (select reaction_id from collections_reactions cr where cr.deleted_at is null and cr.collection_id = ?))
          or
          (element_type = 'Sample' and element_id in (select sample_id from collections_samples cs where cs.deleted_at is null and cs.collection_id = ?))
        SQL
        embargo_search = ActiveRecord::Base.send(:sanitize_sql_array, [embargo_search, params[:search_value], params[:search_value]])
        pub_scope = pub_scope.where(embargo_search)
      when 'Name'
        r_name_sql = " r.short_label like '%#{ActiveRecord::Base.send(:sanitize_sql_like, params[:search_value])}%' "
        s_name_sql = " s.short_label like '%#{ActiveRecord::Base.send(:sanitize_sql_like, params[:search_value])}%' "
        name_search = <<~SQL
          (element_type = 'Reaction' and element_id in (select id from reactions r where #{r_name_sql}))
          or
          (element_type = 'Sample' and element_id in (select id from samples s where #{s_name_sql}))
        SQL
        pub_scope = pub_scope.where(name_search)
      end
    end
    pub_scope = pub_scope.where("taggable_data->'user_labels' @> '?'", params[:label]) if params[:label].present?
    list = pub_scope.order('publications.updated_at desc')
    elements = []
    paginate(list).each do |e|
      element_type = e.element&.class&.name
      next if element_type.nil?

      u = User.with_deleted.find(e.published_by) unless e.published_by.nil?
      svg_file = e.element.reaction_svg_file if element_type == 'Reaction'
      title = e.element.short_label if element_type == 'Reaction'

      svg_file = e.element.sample_svg_file if element_type == 'Sample'
      title = e.element.short_label if element_type == 'Sample'
      review_info = Repo::FetchHandler.repo_review_info(e, current_user&.id)
      checklist = e.review && e.review['checklist'] if is_reviewer || review_info[:groupleader] == true
      scheme_only = element_type == 'Reaction' && e.taggable_data && e.taggable_data['scheme_only']

      label_ids = (e.taggable_data && e.taggable_data['user_labels']) || []
      labels = UserLabel.public_labels(label_ids, current_user, e.state == Publication::STATE_COMPLETED) unless label_ids.nil?
      elements.push(
        id: e.element_id, svg: svg_file, type: element_type, title: title, checklist: checklist || {}, review_info: review_info, isReviewer: is_reviewer,
        published_by: u&.name, submitter_id: u&.id, submit_at: e.created_at, state: e.state, embargo: Repo::FetchHandler.find_embargo_collection(e).label, scheme_only: scheme_only, labels: labels
      )
    end
    { elements: elements }
  rescue StandardError => e
    Publication.repo_log_exception(e, { params: params, user_id: current_user&.id, is_reviewer: is_reviewer })
    { error: e.message }
  end

  def fetch_reviewing_reaction(reaction, publication, current_user)
    reaction = Reaction.where(id: params[:id])
    .select(
      <<~SQL
        reactions.id, reactions.name, reactions.description, reactions.reaction_svg_file, reactions.short_label,
        reactions.status, reactions.tlc_description, reactions.tlc_solvents, reactions.rf_value,
        reactions.temperature, reactions.timestamp_start,reactions.timestamp_stop,reactions.observation,
        reactions.rinchi_string, reactions.rinchi_long_key, reactions.rinchi_short_key,reactions.rinchi_web_key,
        (select json_extract_path(taggable_data::json, 'publication') from publications where element_type = 'Reaction' and element_id = reactions.id) as publication,
        reactions.duration
      SQL
    ).includes(container: :attachments).last
    literatures = Repo::FetchHandler.literatures_by_cat(reaction.id, 'Reaction', 'detail') || []
    reaction.products.each do |p|
    literatures += Repo::FetchHandler.literatures_by_cat(p.id, 'Sample', 'detail')
    end
    schemeList = Repo::FetchHandler.get_reaction_table(reaction.id)
    review_info = Repo::FetchHandler.repo_review_info(publication, current_user&.id)
    publication.review&.slice!('history') unless User.reviewer_ids.include?(current_user.id) || review_info[:groupleader] == true
    published_user = User.with_deleted.find(publication.published_by) unless publication.nil?
    entities = Entities::RepoReactionEntity.represent(reaction, serializable: true)
    entities[:literatures] = literatures unless entities.nil? || literatures.blank?
    entities[:schemes] = schemeList unless entities.nil? || schemeList.blank?
    entities[:segments] = Labimotion::SegmentEntity.represent(reaction.segments)
    embargo = Repo::FetchHandler.find_embargo_collection(publication)
    entities[:embargo] = embargo&.label
    entities[:embargoId] = embargo&.id
    label_ids = publication.taggable_data['user_labels'] || [] unless publication.taggable_data.nil?
    user_labels = UserLabel.public_labels(label_ids, current_user, publication.state == Publication::STATE_COMPLETED) unless label_ids.nil?
    entities[:labels] = user_labels
    {
    reaction: entities,
    selectEmbargo: Publication.find_by(element_type: 'Collection', element_id: embargo&.id),
    pub_name: published_user&.name || '',
    review_info: review_info
    }
  rescue StandardError => e
    Publication.repo_log_exception(e, { reaction: reaction&.id, publication: publication&.id, current_user: current_user&.id })
    { error: e.message }
  end

  def fetch_reviewing_sample(sample, publication, current_user)
    review_sample = { **sample.serializable_hash.deep_symbolize_keys }
    review_sample[:segments] = sample.segments.present? ? Labimotion::SegmentEntity.represent(sample.segments) : []
    containers = Entities::ContainerEntity.represent(sample.container)
    publication = Publication.find_by(element_id: params[:id], element_type: 'Sample')
    review_info = review_info = Repo::FetchHandler.repo_review_info(publication, current_user&.id)
    # preapproved = publication.review.dig('checklist', 'glr', 'status') == true
    # is_leader = publication.review.dig('reviewers')&.include?(current_user&.id)
    publication.review&.slice!('history') unless User.reviewer_ids.include?(current_user.id) || review_info[:groupleader] == true
    published_user = User.with_deleted.find(publication.published_by) unless publication.nil?
    literatures = Repo::FetchHandler.literatures_by_cat(params[:id], 'Sample', 'detail')
    # embargo = PublicationCollections.where("(elobj ->> 'element_type')::text = 'Sample' and (elobj ->> 'element_id')::integer = #{sample.id}")&.first&.label
    embargo = Repo::FetchHandler.find_embargo_collection(publication)
    review_sample[:embargo] = embargo&.label
    review_sample[:embargoId] = embargo&.id
    review_sample[:user_labels] = publication.taggable_data['user_labels'] || [] unless publication.taggable_data.nil?
    review_sample[:showed_name] = sample.showed_name
    label_ids = publication.taggable_data['user_labels'] || [] unless publication.taggable_data.nil?
    user_labels = UserLabel.public_labels(label_ids, current_user, publication.state == Publication::STATE_COMPLETED) unless label_ids.nil?
    {
      molecule: MoleculeGuestSerializer.new(sample.molecule).serializable_hash.deep_symbolize_keys,
      sample: review_sample,
      labels: user_labels,
      publication: publication,
      literatures: literatures,
      analyses: containers,
      selectEmbargo: Publication.find_by(element_type: 'Collection', element_id: embargo&.id),
      doi: Entities::DoiEntity.represent(sample.doi, serializable: true),
      pub_name: published_user&.name,
      review_info: review_info
    }
  rescue StandardError => e
    Publication.repo_log_exception(e, { sample: sample&.id, publication: publication&.id, current_user: current_user&.id })
    { error: e.message }
  end

  def save_repo_authors(declared_params, pub, current_user)
    et = ElementTag.find_or_create_by(taggable_id: declared_params[:elementId], taggable_type: declared_params[:elementType])
    tagg_data = declared_params[:taggData] || {}
    leaders = declared_params[:leaders]
    if tagg_data.present?
      tagg_data['author_ids'] = tagg_data['creators']&.map { |cr| cr['id'] }
      tagg_data['affiliation_ids'] = [tagg_data['creators']&.map { |cr| cr['affiliationIds'] }.flatten.uniq]
      tagg_data['affiliations'] = tagg_data['affiliations']&.select { |k, _| tagg_data['affiliation_ids'].first&.include?(k.to_i) }

      pub_taggable_data = pub.taggable_data || {}
      pub_taggable_data = pub_taggable_data.deep_merge(tagg_data || {})
      pub.update(taggable_data: pub_taggable_data)

      et_taggable_data = et.taggable_data || {}
      pub_tag = et_taggable_data['publication'] || {}
      pub_tag = pub_tag.deep_merge(tagg_data || {})
      et_taggable_data['publication'] = pub_tag
      et.update(taggable_data: et_taggable_data)
    end
    if !leaders.nil?
      review = pub.review || {}
      orig_leaders = review['reviewers'] || []
      curr_leaders = leaders.map { |l| l['id'] }

      del_leaders = orig_leaders - curr_leaders
      new_leaders = curr_leaders - orig_leaders
      pub.update(review: review.deep_merge({ 'reviewers' => curr_leaders }))
      reassign_leaders(pub, current_user, del_leaders, new_leaders) if del_leaders.present? || new_leaders.present?
    end
    pub
  rescue StandardError => e
    Publication.repo_log_exception(e, { declared_params: declared_params, pub: pub&.id, current_user: current_user&.id })
    { error: e.message }
  end

  def reassign_leaders(pub, current_user, del_leaders, new_leaders)
    pub_user = User.with_deleted.find(pub.published_by)
    element = pub.element
    return false unless pub_user && element

    if new_leaders.present?
      new_leader_list = User.where(id: new_leaders, type: 'Person')
      new_leader_list&.each do |user|
        col = user.find_or_create_grouplead_collection
        case pub.element_type
        when 'Sample'
          CollectionsSample
        when 'Reaction'
          CollectionsReaction
        end.create_in_collection([element.id], [col.id])
      end
    end

    if del_leaders.present?
      del_leader_list = User.where(id: del_leaders, type: 'Person')
      del_leader_list&.each do |user|
        col = user.find_or_create_grouplead_collection
        case pub.element_type
        when 'Sample'
          CollectionsSample
        when 'Reaction'
          CollectionsReaction
        end.remove_in_collection([element.id], [col.id])
      end
    end
  rescue StandardError => e
    Publication.repo_log_exception(e, { pub: pub&.id, current_user: current_user&.id, del_leaders: del_leaders, new_leaders: new_leaders })
    raise e
  end

  def review_advanced_search(params, current_user)
    result = case params[:type]
              when 'Submitter'
                query_submitter(params[:element_type], params[:state], current_user)
              when 'Embargo'
                query_embargo(current_user)
              else
                []
    end
    { result: result }
  rescue StandardError => e
    Publication.repo_log_exception(e, { params: params, current_user: current_user&.id })
    { error: e.message }
  end


  private

  def query_submitter(element_type, state, current_user)
    if User.reviewer_ids.include?(current_user.id)
      state_sql = state == 'All' || state.empty? ? " state in ('pending', 'reviewed', 'accepted')" : ActiveRecord::Base.send(:sanitize_sql_array, [' state=? ', state])
      type_sql = element_type == 'All' || element_type.empty? ? " element_type in ('Sample', 'Reaction')" : ActiveRecord::Base.send(:sanitize_sql_array, [' element_type=? ', element_type.chop])
      search_scope = User.where(type: 'Person').where(
        <<~SQL
          users.id in (
            select published_by from publications pub where ancestry is null and deleted_at is null
            and #{state_sql} and #{type_sql})
        SQL
      )
                         .order('first_name ASC')
    else
      search_scope = User.where(id: current_user.id)
    end
    result = search_scope.select(
      <<~SQL
        id as key, first_name, last_name, first_name || chr(32) || last_name as name, first_name || chr(32) || last_name || chr(32) || '(' || name_abbreviation || ')' as label
      SQL
    )
  rescue StandardError => e
    Publication.repo_log_exception(e, { element_type: element_type, state: state, current_user: current_user&.id })
    { error: e.message }
  end

  def query_embargo(current_user)
    search_scope = if User.reviewer_ids.include?(current_user.id)
                     Collection.where(
                       <<~SQL
                         ancestry::integer in (select id from collections cx where label = 'Embargoed Publications')
                       SQL
                     )
                   else
                     Collection.where(ancestry: current_user.publication_embargo_collection.id)
                   end
    result = search_scope.select(
      <<~SQL
        id as key, label as name, label as label
      SQL
    ).order('label ASC')
  rescue StandardError => e
    Publication.repo_log_exception(e, { current_user: current_user&.id })
    { error: e.message }
  end

end
