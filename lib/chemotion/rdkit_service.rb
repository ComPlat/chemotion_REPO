# frozen_string_literal: true

module Chemotion
  # Service for RDKitChem
  module RdkitService
    class << self
      def svg_from_molfile(molfile)
        molfile_2d = molfile.gsub(/RDKit( +)3D/, 'RDKit\\12D')
        mol = RDKitChem::RWMol.mol_from_mol_block(molfile_2d)
        return nil if mol.nil?

        mol.wedge_mol_bonds(mol.get_conformer)

        drawer = RDKitChem::MolDraw2DSVG.new(2000, 2000)

        # black and white colour palette
        bw_cp = RDKitChem::ColourPalette.new
        bw_cp[-1] = RDKitChem::DrawColour.new(0, 0, 0)
        # set to use black and white
        drawer.draw_options.atomColourPalette = bw_cp

        drawer.draw_options.multipleBondOffset = 0.1
        drawer.draw_options.additionalAtomLabelPadding = 0.1
        drawer.draw_options.fixedBondLength = 50

        drawer.draw_molecule(mol)
        drawer.finish_drawing

        scale = drawer.scale
        padding = drawer.draw_options.padding
        width = (drawer.range.x + padding * 6) * scale
        height = (drawer.range.y + padding * 6) * scale
        x_offset = (2000 - width) / 2
        y_offset = (2000 - height) / 2

        svg = drawer.get_drawing_text
        svg.gsub!(/stroke-width:\d+px/, 'stroke-width:1.6')
        svg.gsub!(/<rect.*\/rect>/, '')
        view_box = "viewBox='0 0 #{width} #{height}'"
        svg.gsub!(/viewBox='[\w ]+'/, view_box)
        svg.gsub!(/width='\d+px'/, "width='#{width}px'")
        svg.gsub!(/height='\d+px'/, "height='#{height}px'")

        g_el = "<g transform='translate(-#{x_offset},-#{y_offset})'>"
        svg.gsub!(/<svg([^>]+)>/, "<svg\\1>#{g_el}")
        svg.gsub!('</svg>', '</g></svg>')
      end
    end
  end
end
