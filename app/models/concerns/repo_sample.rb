# frozen_string_literal: true

module RepoSample
  extend ActiveSupport::Concern

  # Prepended into the including class so that Chemotion Repository hooks
  # run before the upstream implementation (which is invoked via super).
  module Overrides
    def auto_set_short_label
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

  def molfile_pubchem
    version = Chemotion::OpenBabelService.molfile_version(self.molfile)
    mf = Chemotion::OpenBabelService.mofile_clear_coord_bonds(self.molfile, version)
    mf = molfile unless mf

    mf&.split(/^\$\$\$\$/).first
  end
  def pubchem_cid
    mol = self.molecule
    cid = mol.tag && mol.tag.taggable_data && mol.tag.taggable_data['pubchem_cid']
    if cid
      cid
    else
      mol.update_tag!(pubchem_tag: true)
      mol.tag.taggable_data['pubchem_cid']
    end
  end

  def regenerate_svg
    molecule&.regenerate_svg

    if sample_svg_file.present? && File.exist?(full_svg_path)
      svg = File.read(full_svg_path)
      fetch_svg if svg&.include?('Open Babel')
    else
      fetch_svg
    end
  end

  def reprocess_svg
    return if sample_svg_file.present?

    fetch_svg
  end

  def fetch_svg
    svg_digest = "#{molecule.inchikey}#{Time.now}"
    svg = Molecule.svg_reprocess(svg, molfile || molecule.molfile)
    svg_process = SVG::Processor.new.structure_svg('ketcher', svg, svg_digest, true) if svg.present?
    if svg.present? && svg_process.present? && svg_process[:svg_file_name].present? && File.exist?(svg_process[:svg_file_path])
      _svg = svg_process[:svg_file_name]
      attach_svg(_svg)
      update_columns(sample_svg_file: self.sample_svg_file) unless new_record?
    end
  end

  def user_labels
    tag&.taggable_data&.fetch('user_labels', nil)
  end

  def remove_from_previous_version
    previous_version = self.tag&.taggable_data['previous_version']
    if previous_version
      previous_element = Sample.find_by(id: previous_version['id'])
      previous_element.untag_as_previous_version
    end
  end


end
