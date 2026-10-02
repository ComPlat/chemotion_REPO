# frozen_string_literal: true

# Chemotion Repository-only rinchi helpers.
# Must be included alongside ReactionRinchi (which provides #retrieve_molfiles
# and #no_structure).
module RepoReactionRinchi
  extend ActiveSupport::Concern

  def products_rinchis
    mols_rcts, mols_prds, mols_agts = self.retrieve_molfiles
    rcts = Rinchi::MolVect.new
    [].each do |rct| rcts.push(rct) end
    prds = Rinchi::MolVect.new
    mols_prds.each do |prd| prds.push(prd) end
    agts = Rinchi::MolVect.new
    [].each do |agt| agts.push(agt) end
    Rinchi.convert(rcts, prds, agts)
  end

  def no_structure_rinchis
    prds = Rinchi::MolVect.new
    mols_prds = []
    mols_prds.push(no_structure)
    mols_prds.each { |prd| prds.push(prd) }
    Rinchi.convert(Rinchi::MolVect.new, prds, Rinchi::MolVect.new)
  end

  def products_short_rinchikey
    _, _, result, _ = products_rinchis
    result
  end

  def products_short_rinchikey_trimmed
    if products_short_rinchikey.blank?
      _, _, result, _ = no_structure_rinchis
      result&.sub(/Short-RInChIKey=/, '')
    else
      products_short_rinchikey.sub(/Short-RInChIKey=/, '')
    end
  end
end
