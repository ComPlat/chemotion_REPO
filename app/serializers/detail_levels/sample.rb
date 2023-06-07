class DetailLevels::Sample
  def base_attributes
    [
      :id, :type, :name, :short_label, :description, :created_at, :created_by,
      :target_amount_value, :target_amount_unit, :real_amount_value, :location,
      :real_amount_unit, :molfile, :solvent, :molarity_value, :molarity_unit,
      :is_top_secret, :is_restricted, :external_label, :analyses, :purity,
      :children_count, :parent_id, :imported_readout, :_contains_residues,
      :sample_svg_file, :density, :boiling_point, :melting_point, :stereo,
      :reaction_description, :container, :pubchem_tag, :xref, :code_log, :metrics,
      :can_update, :can_copy, :can_publish, :molecule_name_hash, # :molecule_computed_props,
      :showed_name, :decoupled,
      :molecular_mass, :sum_formula,
      :is_repo_public
    ]
  end



  def level0_attributes
    [
      :id, :type, :is_restricted, :external_label, :code_log,
      :can_update, :can_copy, :can_publish, :decoupled, :molecular_mass, :sum_formula
    ]
  end

  def level1_attributes
    level0_attributes + [:molfile]
  end

  def level2_attributes
    level1_attributes + [:analyses, :container]
  end

  def level3_attributes
    level2_attributes
  end

  # We dont need these attributes for Element List, take them out
  def list_removed_attributes
    [
      :description, :container, :analyses, :elemental_compositions,
      :target_amount_value, :target_amount_unit, :real_amount_value,
      :real_amount_unit, :purity, :solvent, :molarity_value, :molarity_unit,
      :children_count, :parent_id, :imported_readout, :location,
      :boiling_point, :melting_point, :reaction_description, :code_log,
      :can_update, :can_copy, :can_publish #, :showed_name, :molecule_name_hash
    ]
  end

  def report_base_attributes
    [
      :reactions, :molecule_iupac_name, :get_svg_path, :literatures
    ]
  end

  def report_level0_attributes
    [:decoupled, :molecular_mass, :sum_formula]
  end

  def report_level1_attributes
    report_level0_attributes + []
  end

  def report_level2_attributes
    report_level0_attributes + []
  end

  def report_level3_attributes
    report_level0_attributes + []
  end
end
