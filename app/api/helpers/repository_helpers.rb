module RepositoryHelpers
  extend Grape::API::Helpers

  def get_pub_reaction(id)
    reaction = Reaction.where('id = ?', id)
    .select(
      <<~SQL
      reactions.id, reactions.name, reactions.description, reactions.reaction_svg_file, reactions.short_label,
      reactions.status, reactions.tlc_description, reactions.tlc_solvents, reactions.rf_value,
      reactions.temperature, reactions.timestamp_start,reactions.timestamp_stop,reactions.observation,
      reactions.rinchi_string, reactions.rinchi_long_key, reactions.rinchi_short_key,reactions.rinchi_web_key,
      (select label from publication_collections where (elobj ->> 'element_type')::text = 'Reaction' and (elobj ->> 'element_id')::integer = reactions.id) as embargo,
      (select json_extract_path(taggable_data::json, 'publication') from publications where element_type = 'Reaction' and element_id = reactions.id) as publication,
      reactions.duration
      SQL
    )
    .includes(
          container: :attachments
    ).last
    literatures = get_literature(reaction.id,'Reaction') || []
    reaction.products.each do |p|
      literatures += get_literature(p.id,'Sample')
    end

    pub = Publication.find_by(element_type: 'Reaction', element_id: reaction.id)
    pub_info = (pub.review.present? && pub.review['info'].present? && pub.review['info']['comment']) || ''
    infos = {}
    ana_infos = {}
    pd_infos = {}
    pub.descendants.each do |pp|
      review = pp.review || {}
      info = review['info'] || {}
      next if info.empty?
      if pp.element_type == 'Sample'
        pd_infos[pp.element_id] = info['comment']
      else
        ana_infos[pp.element_id] = info['comment']
      end
    end

    schemeList = get_reaction_table(reaction.id)
    entities = Entities::RepoReactionEntity.represent(reaction, serializable: true)
    entities[:products].each do |p|
      label_ids = p[:tag]['taggable_data']['user_labels'] || [] unless p[:tag]['taggable_data'].nil?
      p[:labels] = UserLabel.public_labels(label_ids) unless label_ids.nil?
      pub_product = p
      p[:xvialCom] = build_xvial_com(p[:molecule][:inchikey], current_user&.id)
      pub_product_tag = pub_product[:tag]['taggable_data']
      next if pub_product_tag.nil?

      xvial = pub_product_tag['xvial'] && pub_product_tag['xvial']['num']
      next unless xvial.present?

      unless current_user.present? && User.reviewer_ids.include?(current_user.id)
        pub_product_tag['xvial']['num'] = 'x'
      end
      p[:xvialCom][:hasSample] = true
    end
    entities[:publication]['review']['history'] = []
    entities[:literatures] = literatures unless entities.nil? || literatures.nil? || literatures.length == 0
    entities[:schemes] = schemeList unless entities.nil? || schemeList.nil? || schemeList.length == 0
    entities[:isLogin] = current_user.present?
    entities[:embargo] = reaction.embargo
    entities[:infos] = { pub_info: pub_info, pd_infos: pd_infos, ana_infos: ana_infos }
    entities[:isReviewer] = current_user.present? && User.reviewer_ids.include?(current_user.id) ? true : false
    entities[:elementType] = 'reaction'
    entities[:segments] = Labimotion::SegmentEntity.represent(reaction.segments)
    entities
  end

  def get_pub_molecule(id, adv_flag=nil, adv_type=nil, adv_val=nil)
    molecule = Molecule.find(id)
    xvial_com = build_xvial_com(molecule.inchikey, current_user&.id)
    pub_id = Collection.public_collection_id
    if adv_flag.present? && adv_flag == true && adv_type.present? && adv_type == 'Authors' && adv_val.present?
      adv = <<~SQL
        INNER JOIN publication_authors rs on rs.element_id = samples.id and rs.element_type = 'Sample' and rs.state = 'completed'
        and rs.author_id in ('#{adv_val.join("','")}')
      SQL
    else
      adv = ''
    end

    pub_samples = Collection.public_collection.samples
      .includes(:molecule,:tag).where("samples.molecule_id = ?", molecule.id)
      .where(
        <<~SQL
          samples.id in (
            SELECT samples.id FROM samples
            INNER JOIN collections_samples cs on cs.collection_id = #{pub_id} and cs.sample_id = samples.id and cs.deleted_at ISNULL
            INNER JOIN publications pub on pub.element_type='Sample' and pub.element_id=samples.id  and pub.deleted_at ISNULL
            #{adv}
          )
        SQL
      )
      .select(
        <<~SQL
        samples.*, (select published_at from publications where element_type='Sample' and element_id=samples.id and deleted_at is null) as published_at
        SQL
      )
      .order('published_at desc')
    published_samples = pub_samples.map do |s|
      container = Entities::ContainerEntity.represent(s.container)
      tag = s.tag.taggable_data['publication']
      #u = User.find(s.tag.taggable_data['publication']['published_by'].to_i)
      #time = DateTime.parse(s.tag.taggable_data['publication']['published_at'])
      #published_time = time.strftime("%A, %B #{time.day.ordinalize} %Y %H:%M")
      #aff = u.affiliations.first
      next unless tag
      literatures = Literature.by_element_attributes_and_cat(s.id, 'Sample', 'public')
        .joins("inner join users on literals.user_id = users.id")
        .select(
          <<~SQL
          literatures.*,
          json_object_agg(literals.id, literals.litype) as litype,
          json_object_agg(literals.id, users.first_name || chr(32) || users.last_name) as ref_added_by
          SQL
        ).group('literatures.id').as_json
      reaction_ids = ReactionsProductSample.where(sample_id: s.id).pluck(:reaction_id)
      pub = Publication.find_by(element_type: 'Sample', element_id: s.id)
      sid = pub.taggable_data["sid"] unless pub.nil? || pub.taggable_data.nil?
      label_ids = s.tag.taggable_data['user_labels'] || [] unless s.tag.taggable_data.nil?
      user_labels = UserLabel.public_labels(label_ids) unless label_ids.nil?
      xvial = s.tag.taggable_data['xvial'] && s.tag.taggable_data['xvial']['num'] unless s.tag.taggable_data.nil?
      if xvial.present?
        unless current_user.present? && User.reviewer_ids.include?(current_user.id)
          xvial = 'x'
        end
      end
      comp_num = s.tag.taggable_data['xvial'] && s.tag.taggable_data['xvial']['comp_num'] unless s.tag.taggable_data.nil?
      pub_info = (pub.review.present? && pub.review['info'].present? && pub.review['info']['comment']) || ''
      ana_infos = {}
      pub.descendants.each do |pp|
        review = pp.review || {}
        info = review['info'] || {}
        next if info.empty?
        ana_infos[pp.element_id] = info['comment']
      end
      embargo = PublicationCollections.where("(elobj ->> 'element_type')::text = 'Sample' and (elobj ->> 'element_id')::integer = #{s.id}")&.first&.label
      segments = Labimotion::SegmentEntity.represent(s.segments)
      tag.merge(container: container, literatures: literatures, sample_svg_file: s.sample_svg_file, short_label: s.short_label, melting_point: s.melting_point, boiling_point: s.boiling_point,
        sample_id: s.id, reaction_ids: reaction_ids, sid: sid, xvial: xvial, comp_num: comp_num, embargo: embargo, labels: user_labels,
        showed_name: s.showed_name, pub_id: pub.id, ana_infos: ana_infos, pub_info: pub_info, segments: segments)
    end
    x = published_samples.select { |s| s[:xvial].present? }
    xvial_com[:hasSample] = x.length.positive?
    published_samples = published_samples.flatten.compact
    {
      molecule: MoleculeGuestSerializer.new(molecule).serializable_hash.deep_symbolize_keys,
      published_samples: published_samples,
      isLogin: current_user.nil? ? false : true,
      isReviewer: (current_user.present? && User.reviewer_ids.include?(current_user.id)) ? true : false,
      xvialCom: xvial_com,
      elementType: 'molecule'
    }
  end

  def check_repo_review_permission(element)
    return true if User.reviewer_ids&.include? current_user.id
    pub = Publication.find_by(element_id: element.id, element_type: element.class.name)
    return false if pub.nil?
    return true if pub && pub.published_by == current_user.id && ( pub.state == Publication::STATE_REVIEWED || pub.state == Publication::STATE_PENDING)
    return false
  end

  def repo_review_info(pub, user_id, lst)
    {
      submitter: pub&.published_by == user_id || false,
      reviewer: User.reviewer_ids&.include?(user_id) || false,
      groupleader: pub&.review&.dig('reviewers')&.include?(user_id),
      leaders: User.where(id: pub&.review&.dig('reviewers'))&.map{ |u| u.name },
      preapproved: pub&.review&.dig('checklist', 'glr', 'status') == true,
      review_level: repo_review_level(pub&.element_id, pub&.element_type)
    }
  end

  def repo_review_level(id, type)
    return 3 if User.reviewer_ids&.include? current_user.id
    pub = Publication.find_by(element_id: id, element_type: type.classify)
    return 0 if pub.nil?
    return 2 if pub.published_by === current_user.id
    sync_cols = pub.element.sync_collections_users.where(user_id: current_user.id)
    return 1 if (sync_cols&.length > 0)
    return 0
  end

  def get_literature(id, type, cat='public')
    literatures = Literature.by_element_attributes_and_cat(id, type.classify, cat)
      .joins("inner join users on literals.user_id = users.id")
      .select(
        <<~SQL
        literatures.* , literals.element_type, literals.element_id,
        json_object_agg(literals.id, literals.litype) as litype,
        json_object_agg(literals.id, users.first_name || chr(32) || users.last_name) as ref_added_by
        SQL
      ).group('literatures.id, literals.element_type, literals.element_id').as_json
    literatures
  end

  def get_reaction_table(id)
    schemeAll = ReactionsSample.where('reaction_id = ? and type != ?', id, 'ReactionsPurificationSolventSample')
    .joins(:sample)
    .joins("inner join molecules on samples.molecule_id = molecules.id")
    .select(
      <<~SQL
      reactions_samples.id,
      (select name from molecule_names mn where mn.id = samples.molecule_name_id) as molecule_iupac_name,
      molecules.iupac_name, molecules.sum_formular,
      molecules.molecular_weight, samples.name, samples.short_label,
      samples.real_amount_value, samples.real_amount_unit,
      samples.target_amount_value, samples.target_amount_unit,
      samples.purity, samples.density, samples.external_label,
      samples.molarity_value, samples.molarity_unit,
      reactions_samples.equivalent,reactions_samples.scheme_yield,
      reactions_samples."position" as rs_position,
      case when reactions_samples."type" = 'ReactionsStartingMaterialSample' then 'starting_materials'
      when reactions_samples."type" = 'ReactionsReactantSample' then 'reactants'
      when reactions_samples."type" = 'ReactionsProductSample' then 'products'
      when reactions_samples."type" = 'ReactionsSolventSample' then 'solvents'
      when reactions_samples."type" = 'ReactionsPurificationSolventSample' then 'purification_solvents'
      else reactions_samples."type"
      end mat_group,
      case when reactions_samples."type" = 'ReactionsStartingMaterialSample' then 1
      when reactions_samples."type" = 'ReactionsReactantSample' then 2
      when reactions_samples."type" = 'ReactionsProductSample' then 3
      when reactions_samples."type" = 'ReactionsSolventSample' then 4
      when reactions_samples."type" = 'ReactionsPurificationSolventSample' then 5
      else 6
      end type_seq
      SQL
    ).order('reactions_samples.position ASC').as_json

    schemeSorted = schemeAll.sort_by {|o| o['type_seq']}
    solvents_sum = schemeAll.select{ |d| d['mat_group'] === 'solvents'}.sum { |r|
    value = (r['real_amount_value'].nil? || r['real_amount_value'].zero?) ? r['target_amount_value'].to_f : r['real_amount_value'].to_f
    unit = (r['real_amount_value'].nil? || r['real_amount_value'].zero?) ? r['target_amount_unit'] : r['real_amount_unit']

    has_molarity = !r['molarity_value'].nil? && r['molarity_value'] > 0.0 && (r['density'] === 0.0) || false
    has_density = !r['density'].nil? && r['density'] > 0.0 && (r['molarity_value'] === 0.0) || false

    molarity = r['molarity_value'] && r['molarity_value'].to_f || 1.0
    density = r['density'] && r['density'].to_f || 1.0
    purity = r['purity'] && r['purity'].to_f || 1.0
    molecular_weight = r['molecular_weight'] && r['molecular_weight'].to_f || 1.0

    r['amount_g'] = unit === 'g'? value : unit === 'mg'? value.to_f / 1000.0 : unit === 'mol' ?  (value / purity) * molecular_weight : unit === 'l' && !has_molarity && !has_density ? 0 : has_molarity ? value * molarity * molecular_weight : value * density * 1000
    r['amount_l'] = unit === 'l'? value : !has_molarity && !has_density ? 0 : has_molarity ? (r['amount_g'].to_f * purity) / (molarity * molecular_weight) : has_density ? r['amount_g'].to_f / (density * 1000) : 0
    r['amount_l'].nil? ? 0 : r['amount_l'].to_f
  }

    schemeList = []
    schemeList = schemeSorted.map do |r|
      scheme = {}
      value = (r['real_amount_value'].nil? || r['real_amount_value'].zero?) ? r['target_amount_value'].to_f : r['real_amount_value'].to_f
      unit = (r['real_amount_value'].nil? || r['real_amount_value'].zero?) ? r['target_amount_unit'] : r['real_amount_unit']
      has_molarity = !r['molarity_value'].nil? && r['molarity_value'] > 0.0 && (r['density'] === 0.0) || false
      has_density = !r['density'].nil? && r['density'] > 0.0 && (r['molarity_value'] === 0.0) || false

      molarity = r['molarity_value'] && r['molarity_value'].to_f || 1.0
      density = r['density'] && r['density'].to_f || 1.0
      purity = r['purity'] && r['purity'].to_f || 1.0
      molecular_weight = r['molecular_weight'] && r['molecular_weight'].to_f || 1.0
      r['amount_g'] = unit === 'g'? value : unit === 'mg'? value.to_f / 1000.0 : unit === 'mol' ?  (value / purity) * molecular_weight : unit === 'l' && !has_molarity && !has_density ? 0 : has_molarity ? value * molarity * molecular_weight : value * density * 1000
      r['amount_l'] = unit === 'l'? value : !has_molarity && !has_density ? 0 : has_molarity ? (r['amount_g'].to_f * purity) / (molarity * molecular_weight) : has_density ? r['amount_g'].to_f / (density * 1000) : 0

      if r['mat_group'] === 'solvents'
        r['equivalent'] = r['amount_l'] / solvents_sum
      else
        r['amount_mol'] = unit === 'mol'? value : has_molarity ? r['amount_l'] * molarity : r['amount_g'].to_f * purity / molecular_weight
        r['dmv'] = !has_molarity && !has_density ? '- / -' : has_density ? + density.to_s + ' / - ' : ' - / ' + molarity.to_s + r['molarity_unit']
      end

      r.delete('real_amount_value');
      r.delete('real_amount_unit');
      r.delete('target_amount_value');
      r.delete('target_amount_unit');
      r.delete('molarity_value');
      r.delete('molarity_unit');
      r.delete('purity');
      r.delete('molecular_weight');
      r.delete('rs_position');
      r.delete('density');
      r
    end
    schemeList
  end

end
