class SampleSerializer < ActiveModel::Serializer
  attributes *DetailLevels::Sample.new.base_attributes

  has_one :molecule, :serializer => MoleculeListSerializer
  has_one :container, :serializer => ContainerSerializer
  has_one :tag

  has_many :residues, serializer: ResidueSerializer
  has_many :elemental_compositions, serializer: ElementalCompositionSerializer
  has_many :segments

  def is_repo_public
    cols = (object.tag&.taggable_data || {})['collection_labels']&.select do |c|
      c['id'] == ENV['PUBLIC_COLL_ID']&.to_i || c['id'] == ENV['SCHEME_ONLY_REACTIONS_COLL_ID']&.to_i
    end
    cols.present? && cols.length.positive?
  end

  def code_log
    CodeLogSerializer.new(object.code_log).serializable_hash
  end

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'sample'
  end

  def _contains_residues
    object.residues.any?
  end

  def molecule_svg
    molecule.molecule_svg_file
  end

  def is_restricted
    false
  end

  def children_count
    unless object.new_record?
      object.children.count.to_i
    end
  end

  def parent_id
    object.parent.id if object.parent
  end

  def pubchem_tag
    unless molecule
      nil
    else
      molecule.tag ? molecule.tag.taggable_data : nil
    end
  end

  def can_update
    false
  end

  def can_copy
    false
  end

  def can_publish
    false
  end

  class Level0 < ActiveModel::Serializer
    include SamplePolicySerializable
    include SampleLevelSerializable
    define_restricted_methods_for_level(0)

    def molecule
      {
        molecular_weight: object.molecule.try(:molecular_weight),
        exact_molecular_weight: object.molecule.try(:exact_molecular_weight),
      }
    end
  end

  class Level1 < ActiveModel::Serializer
    include SamplePolicySerializable
    include SampleLevelSerializable
    define_restricted_methods_for_level(1)
  end

  class Level2 < ActiveModel::Serializer
    include SamplePolicySerializable
    include SampleLevelSerializable
    define_restricted_methods_for_level(2)

    def analyses
      object.analyses.map {|x| x['datasets'] = {:datasets => []}}
    end
  end

  class Level3 < ActiveModel::Serializer
    include SamplePolicySerializable
    include SampleLevelSerializable
    define_restricted_methods_for_level(3)
  end
end

class SampleSerializer::Level10 < SampleSerializer
  include SamplePolicySerializable
end
