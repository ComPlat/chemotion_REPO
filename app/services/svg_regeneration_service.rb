# frozen_string_literal: true

# Service class for regenerating SVGs in background
# Looks up publication table and regenerates SVGs for published samples and reactions
class SvgRegenerationService
  def self.regenerate_molecules(params)
    scope = build_molecule_scope(params)
    processed = 0
    errors = 0
    skipped = 0

    scope.find_each do |molecule|
      begin
        svg_path = molecule.send(:full_svg_path)
        svg_file_exists = svg_path.present? && File.file?(svg_path)

        if svg_file_exists
          next skipped += 1 if params[:which] == 'openbabel' && !File.read(svg_path).match?('Open Babel')
          next skipped += 1 if params[:which] == 'missing'
        end

        if molecule.molfile.blank?
          skipped += 1
          next
        end

        molecule.regenerate_svg
        processed += 1
      rescue StandardError => e
        Rails.logger.error("Failed to regenerate SVG for molecule #{molecule.id}: #{e.message}")
        errors += 1
      end
    end

    { processed: processed, errors: errors, skipped: skipped, total: scope.count }
  end

  def self.regenerate_samples(params)
    # Get published sample IDs from publications table
    published_sample_ids = get_published_sample_ids(params)
    processed = 0
    errors = 0
    skipped = 0
    total = published_sample_ids.count

    published_sample_ids.each do |sample_id|
      begin
        sample = Sample.find_by(id: sample_id)
        unless sample
          skipped += 1
          next
        end

        svg_path = sample.send(:full_svg_path)
        svg_file_exists = svg_path.present? && File.file?(svg_path)

        if svg_file_exists
          next skipped += 1 if params[:which] == 'openbabel' && !File.read(svg_path).match?('Open Babel')
          next skipped += 1 if params[:which] == 'missing'
        end

        if sample.molfile.blank?
          skipped += 1
          next
        end

        sample.regenerate_svg
        processed += 1
      rescue StandardError => e
        Rails.logger.error("Failed to regenerate SVG for sample #{sample_id}: #{e.message}")
        errors += 1
      end
    end

    { processed: processed, errors: errors, skipped: skipped, total: total }
  end

  def self.regenerate_reactions(params)
    # Get published reaction IDs from publications table
    published_reaction_ids = get_published_reaction_ids(params)
    processed = 0
    errors = 0
    skipped = 0
    total = published_reaction_ids.count

    published_reaction_ids.each do |reaction_id|
      begin
        reaction = Reaction.find_by(id: reaction_id)
        unless reaction
          skipped += 1
          next
        end

        svg_path = reaction.send(:current_svg_full_path)
        svg_file_exists = svg_path.present? && File.file?(svg_path)

        if svg_file_exists && params[:which] == 'missing'
          skipped += 1
          next
        end

        reaction.regenerate_svg!
        processed += 1
      rescue StandardError => e
        Rails.logger.error("Failed to regenerate SVG for reaction #{reaction_id}: #{e.message}")
        errors += 1
      end
    end

    { processed: processed, errors: errors, skipped: skipped, total: total }
  end

  def self.regenerate_all(params)
    Rails.logger.info('Starting full SVG regeneration for all entities')

    mol_result = regenerate_molecules(params)
    Rails.logger.info("Molecules completed: #{mol_result}")

    sample_result = regenerate_samples(params)
    Rails.logger.info("Samples completed: #{sample_result}")

    reaction_result = regenerate_reactions(params.except(:which).merge(which: params[:which] == 'openbabel' ? 'missing' : params[:which]))
    Rails.logger.info("Reactions completed: #{reaction_result}")

    Rails.logger.info('Full SVG regeneration completed')

    {
      molecules: mol_result,
      samples: sample_result,
      reactions: reaction_result
    }
  end

  private_class_method def self.build_molecule_scope(params)
    scope = Molecule.all
    scope = scope.where(id: params[:from].to_i..) if params[:from].present?
    scope = scope.where(id: ..params[:to].to_i) if params[:to].present?
    scope
  end

  private_class_method def self.build_sample_scope(params)
    scope = Sample.all
    scope = scope.where(id: params[:from].to_i..) if params[:from].present?
    scope = scope.where(id: ..params[:to].to_i) if params[:to].present?
    scope
  end

  private_class_method def self.build_reaction_scope(params)
    scope = Reaction.all
    scope = scope.where(id: params[:from].to_i..) if params[:from].present?
    scope = scope.where(id: ..params[:to].to_i) if params[:to].present?
    scope
  end

  private_class_method def self.get_published_sample_ids(params)
    scope = Publication.where(element_type: 'Sample')

    # Apply ID range filters if provided
    if params[:from].present? || params[:to].present?
      scope = scope.where(element_id: params[:from].to_i..) if params[:from].present?
      scope = scope.where(element_id: ..params[:to].to_i) if params[:to].present?
    end

    scope.distinct.pluck(:element_id)
  end

  private_class_method def self.get_published_reaction_ids(params)
    scope = Publication.where(element_type: 'Reaction')

    # Apply ID range filters if provided
    if params[:from].present? || params[:to].present?
      scope = scope.where(element_id: params[:from].to_i..) if params[:from].present?
      scope = scope.where(element_id: ..params[:to].to_i) if params[:to].present?
    end

    scope.distinct.pluck(:element_id)
  end
end
