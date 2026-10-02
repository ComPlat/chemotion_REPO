# frozen_string_literal: true

module Chemotion
  # Repo-only molecule endpoints. Kept out of MoleculeAPI (upstream ELN file)
  # so rebases against ELN don't conflict. Mounted via Chemotion::RepoAPI.
  class MoleculeRepoAPI < Grape::API
    resource :molecules do
      namespace :chemdraw do
        desc 'Convert a ChemDraw (.cdx / .cdxml) file to a molfile'
        params do
          requires :data, type: String, desc: 'Base64-encoded ChemDraw file content'
          requires :format, type: String, desc: 'ChemDraw format', values: %w[cdx cdxml]
        end
        post do
          decoded = Base64.decode64(params[:data])
          molfile = Chemotion::OpenBabelService.molfile_from_chemdraw(decoded, params[:format])
          error!('Could not parse ChemDraw file. Verify it is a valid .cdx or .cdxml.', 422) if molfile.blank?
          { molfile: molfile }
        end
      end
    end
  end
end
