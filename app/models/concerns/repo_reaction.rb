# frozen_string_literal: true

module RepoReaction
  extend ActiveSupport::Concern

  # Prepended into the including class so Chemotion Repository behaviour
  # wraps the upstream implementations (super calls into Reaction).
  module Overrides
    def yield_amount(sample_id)
      rps = ReactionsProductSample.find_by(reaction_id: id, sample_id: sample_id)
      return nil if rps.nil?

      (rps.equivalent.nil? || rps.equivalent.zero?) ? rps.scheme_yield : rps.equivalent
    end

    def auto_set_short_label
      return if short_label.present?
      return auto_set_short_label_version if previous_version.present?

      super
    end
  end

  included do
    prepend Overrides
    has_many :fundings, as: :fundable, foreign_key: :element_id, foreign_type: :element_type, dependent: :destroy
  end

  class_methods do

  end

  def regenerate_svg!
    samples&.each do |sample|
      sample.regenerate_svg
    end
    svg = update_svg_file!
    update_columns(reaction_svg_file: svg) if svg.present?
  end

  def update_svg_file!
    svg = reaction_svg_file
    if svg.present? && svg.end_with?('</svg>')
      svg_file_name = "#{SecureRandom.hex(64)}.svg"
      svg_path = Rails.public_path.join('images', 'reactions', svg_file_name)
      svg_file = File.new(svg_path, 'w+')
      svg_file.write(svg)
      svg_file.close
      self.reaction_svg_file = svg_file_name
    else
      paths = {}
      {
        starting_materials: :reactions_starting_material_samples,
        reactants: :reactions_reactant_samples,
        products: :reactions_product_samples
      }.each do |prop, resource|
        collection = public_send(resource).includes(sample: :molecule)
        paths[prop] = collection.map do |reactions_sample|
          sample = reactions_sample.sample
          params = [ sample.get_svg_path ]
          params[0] = sample.svg_text_path if reactions_sample.show_label
          params.append(yield_amount(sample.id)) if prop == :products
          params
        end
      end
      begin
        composer = SVG::ReactionComposer.new(paths, temperature: temperature_display_with_unit,
                                                    duration: duration,
                                                    solvents: solvents_in_svg,
                                                    conditions: conditions,
                                                    show_yield: true)
        self.reaction_svg_file = composer.compose_reaction_svg_and_save
      rescue StandardError => _e
        Rails.logger.info('**** SVG::ReactionComposer failed ***')
      end
    end
    if reaction_svg_file_changed? && reaction_svg_file_was.present?
      file_was = File.join(Rails.public_path, 'images', 'reactions', reaction_svg_file_was)
      File.delete(file_was) if Reaction.where(reaction_svg_file: reaction_svg_file_was).length < 2 && File.exist?(file_was)
    end
    reaction_svg_file
  end

  def remove_from_previous_version
    previous_version = self.tag&.taggable_data['previous_version']
    if previous_version
      previous_element = Reaction.find_by(id: previous_version['id'])
      previous_element.untag_as_previous_version
    end
  end
end
