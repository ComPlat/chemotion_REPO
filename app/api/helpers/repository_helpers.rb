module RepositoryHelpers
  extend Grape::API::Helpers

  def check_repo_review_permission(element)
    return true if User.reviewer_ids&.include? current_user.id
    pub = Publication.find_by(element_id: element.id, element_type: element.class.name)
    return false if pub.nil?
    return true if pub && pub.published_by == current_user.id && ( pub.state == Publication::STATE_REVIEWED || pub.state == Publication::STATE_PENDING)
    return false
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
        literatures.* , literals.element_type,
        json_object_agg(users.name_abbreviation, users.first_name || chr(32) || users.last_name) as ref_added_by
        SQL
      ).group('literatures.id, literals.element_type').as_json
    literatures
  end

  def get_reaction_table(id)
    schemeAll = ReactionsSample.where('reaction_id = ? and type != ?', id, 'ReactionsPurificationSolventSample')
    .joins(:sample)
    .joins("inner join molecules on samples.molecule_id = molecules.id")
    .select(
      <<~SQL
      reactions_samples.id,
      molecules.iupac_name, molecules.sum_formular,
      molecules.molecular_weight,
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
    value = r['real_amount_value'].nil? ? r['target_amount_value'].to_f : r['real_amount_value'].to_f
    unit = r['real_amount_value'].nil? ? r['target_amount_unit'] : r['real_amount_unit']

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
      value = r['real_amount_value'].nil? ? r['target_amount_value'].to_f : r['real_amount_value'].to_f
      unit = r['real_amount_value'].nil? ? r['target_amount_unit'] : r['real_amount_unit']

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
