namespace :data do
  desc 'clean faulty molfile from ChemDoodle'
  task :ver_20190318_doodle_cleaning, [:dry_run] => [:environment] do |t, args|
    clean_molecule = Proc.new do |molecule, dry_run, matcher|
      dry_run = true unless dry_run.equal? false
      matcher ||= 'ChemDoodle'
      mol = molecule.molfile
      unless mol =~ /#{matcher}/
        puts "Molecule ##{molecule.id}: nothing to do"
        next
      end
      puts "Molecule ##{molecule.id}: doodle cleaning"
      cleaned_mol = Chemotion::OpenBabelService.get_ob_molfile_from_molfile(mol)
      inf = Chemotion::OpenBabelService.molecule_info_from_structure(cleaned_mol)


      if inf[:inchikey] != molecule.inchikey
        puts "InChIKey MISMATCH"
        next
      end
      puts "updating molfile"
        molecule.molfile = cleaned_mol
      if inf[:cano_smiles] != molecule.cano_smiles
        puts "updating cano_smiles too: #{molecule.cano_smiles} -> #{inf[:cano_smiles]}"
        molecule.cano_smiles = inf[:cano_smiles]
      end

      # if copy_molfile
      #   File.write("doodle_#{molecule.id}.mol", mol)
      #   File.write("ob_#{molecule.id}.mol", cleaned_mol)
      # end
      molecule.save! unless dry_run
    end

    clean_molecules = Proc.new do |scope, dry_run, matcher|
      scope.find_each do |m|
        clean_molecule.call(m, dry_run, matcher)
      end
    end

    mols = Molecule.all
    dr = args[:dry_run].clone
    unless !!dr == dr
      dr = case args[:dry_run]
           when 'true'
             dr = true
           when 'false'
            dr = false
           else
             false
           end
    end
    clean_molecules.call(mols, args[:dry_run])
  end
end
