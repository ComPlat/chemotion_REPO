# frozen_string_literal: true

# Create fix solvent migration
class FixSolventMigration < ActiveRecord::Migration[4.2]
  def change
    solvent_list = {}
    Sample.where.not(solvent: nil).find_each do |sample|
      next if sample.solvent.blank?

      solvent_list[sample.id] = sample.solvent
    end

    rename_column :samples, :solvent, :tmp_solvent
    add_column :samples, :solvent, :jsonb

    Sample.where.not(tmp_solvent: nil).find_each do |sample|
      next if sample.tmp_solvent.blank?

      solvent_string = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(sample.tmp_solvent) }

      if solvent_string.blank? || solvent_string[:value][:external_label].blank? || solvent_string[:value][:smiles].blank?
        File.write('REPO_failed_sample_solvent.log', "#{sample.id}:#{sample.solvent_string}  (can not file mapping) \n", mode: 'a')
      end
      solvent_json = [{ label: sample.tmp_solvent, smiles: solvent_string[:value][:smiles], ratio: '1' }].to_json
      begin
        sample.update_columns(solvent: solvent_json)
      rescue JSON::ParserError, TypeError
        File.write('REPO_failed_sample_solvent.log', "#{sample.id}: #{sample.solvent_string}  (TypeError) \n", mode: 'a')
      end
    end
    File.write('REPO_solvents.json', JSON.pretty_generate(solvent_list))

    remove_column :samples, :tmp_solvent
  end
end
