# frozen_string_literal: true

# A helper for fetching data from the repository
# It includes the following methods:
# 1. find_embargo_collection: Find the embargo collection of a publication
# 2. repo_review_info: Get the review information of a publication
# 3. repo_review_level: Get the review level of a publication
# 4. literatures_by_cat: Fetch literatures by category
# 5. get_reaction_table: Fetch the reaction table

module Repo
  class FetchHandler

    def self.find_embargo_collection(root_publication)
      has_embargo_col = root_publication.element&.collections&.select { |c| c['ancestry'].to_i == User.with_deleted.find(root_publication.published_by).publication_embargo_collection.id }
      has_embargo_col && has_embargo_col.length > 0 ? has_embargo_col.first : OpenStruct.new(label: '')
    rescue StandardError => e
      Rails.logger.error(e.message)
      Rails.logger.error(e.backtrace.join("\n"))
      raise e
    end

    def self.repo_review_info(root_publication, user_id)
      {
        submitter: root_publication&.published_by == user_id || root_publication&.review&.dig('submitters')&.include?(user_id) || false,
        reviewer: User.reviewer_ids&.include?(user_id) || false,
        groupleader: root_publication&.review&.dig('reviewers')&.include?(user_id),
        leaders: User.where(id: root_publication&.review&.dig('reviewers'))&.map{ |u| { name: u.name, id: u.id, type: u.type } },
        preapproved: root_publication&.review&.dig('checklist', 'glr', 'status') == true,
        review_level: Repo::FetchHandler.repo_review_level(root_publication, user_id)
      }
    rescue StandardError => e
      Rails.logger.error(e.message)
      Rails.logger.error(e.backtrace.join("\n"))
      raise e
    end

    def self.repo_review_level(root_publication, user_id)
      return 3 if User.reviewer_ids&.include? user_id
      return 0 if root_publication.nil?
      return 2 if root_publication.published_by === user_id || root_publication&.review&.dig('submitters')&.include?(user_id)
      sync_cols = root_publication.element.sync_collections_users.where(user_id: user_id)
      return 1 if (sync_cols&.length > 0)
      return 0
    rescue StandardError => e
      Rails.logger.error(e.message)
      Rails.logger.error(e.backtrace.join("\n"))
      raise e
    end

    def self.literatures_by_cat(id, type, cat='public')
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

    def self.get_reaction_table(id)
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
end
