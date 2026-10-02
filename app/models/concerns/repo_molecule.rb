# frozen_string_literal: true

module RepoMolecule
  extend ActiveSupport::Concern

  # Chemotion Repository uses 'DECOUPLED' as the marker for structure-less
  # molecules; upstream uses 'DUMMY'. These overrides switch the marker
  # without modifying the upstream method bodies.
  module Overrides
    def create_molecule_names
      return if inchikey == 'DECOUPLED'

      super
    end
  end

  module ClassOverrides
    def find_or_create_dummy
      find_or_create_by(inchikey: 'DECOUPLED')
    end
  end

  included do
    prepend Overrides
    singleton_class.prepend(ClassOverrides)
  end

  class_methods do
  end

  def regenerate_svg
    return unless Rails.configuration.try(:ketcher_service).try(:url).present?

    if molecule_svg_file.present? && File.exist?(full_svg_path)
      svg = File.read(full_svg_path)
      if svg&.include?('Open Babel')
        regenerate_svg_process
      end
    else
      regenerate_svg_process
    end
  end

  def regenerate_svg_process
    svg_digest = "#{inchikey}#{Time.now}"
    svg = Molecule.svg_reprocess(nil, molfile)
    svg_process = SVG::Processor.new.structure_svg('ketcher', svg, svg_digest, true)
    if svg.present?
      attach_svg(svg)
      update_columns(molecule_svg_file: self.molecule_svg_file)
    end
  end

end
