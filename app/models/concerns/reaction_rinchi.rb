# frozen_string_literal: true

# Module for tag behaviour
module ReactionRinchi
  extend ActiveSupport::Concern

  included do
    before_save :generate_rinchis
  end

  def generate_rinchis
    self.rinchi_string, self.rinchi_long_key,
      self.rinchi_short_key, self.rinchi_web_key = invoke_rinchis
  end

  def invoke_rinchis
    mols_rcts, mols_prds, mols_agts = retrieve_molfiles

    rcts = Rinchi::MolVect.new
    mols_rcts.each do |rct| rcts.push(rct) end
    prds = Rinchi::MolVect.new
    mols_prds.each do |prd| prds.push(prd) end
    agts = Rinchi::MolVect.new
    mols_agts.each do |agt| agts.push(agt) end

    Rinchi.convert(rcts, prds, agts)
  end

  def retrieve_molfiles
    mole_molfile_or_no = ->(x) {
      mf = x.molecule_molfile || no_structure
      version = x.molecule&.molfile_version
      if version =~ /^(V2000).*T9/
        mf = Chemotion::OpenBabelService.mofile_clear_coord_bonds(mf, $1)
      end
      mf
    }
    mols_rcts = starting_materials.map(&mole_molfile_or_no)
    mols_agts = reactants.map(&mole_molfile_or_no)
    mols_sols = solvents.map(&mole_molfile_or_no)
    mols_prds = products.map(&mole_molfile_or_no)

    [mols_rcts, mols_prds, (mols_agts + mols_sols)]
  end

  def no_structure
    <<~MOLFILE

      ACCLDraw04191619342D

      0  0  0  0  0  0  0  0  0  0999 V2000
    M  END
    MOLFILE
  end

  def products_rinchis
    mols_rcts, mols_prds, mols_agts = self.retrieve_molfiles
    rcts = Rinchi::MolVect.new
    # mols_rcts.each do |rct| rcts.push(rct) end
    [].each do |rct| rcts.push(rct) end
    prds = Rinchi::MolVect.new
    mols_prds.each do |prd| prds.push(prd) end
    agts = Rinchi::MolVect.new
    # mols_agts.each do |agt| agts.push(agt) end
    [].each do |agt| agts.push(agt) end
    Rinchi.convert(rcts, prds, agts)
  end

   def products_short_rinchikey
     _, _, result, _ = products_rinchis
     result
   end

   def products_short_rinchikey_trimmed
     products_short_rinchikey.sub(/Short-RInChIKey=/, '')
   end
end
