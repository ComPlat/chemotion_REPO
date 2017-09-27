# == Schema Information
#
# Table name: dois
#
#  id             :integer          not null, primary key
#  molecule_id    :integer
#  inchikey       :string
#  molecule_count :integer
#  analysis_id    :integer
#  analysis_type  :string
#  analysis_count :integer
#  metadata       :jsonb
#  minted         :boolean          default(FALSE)
#  minted_at      :datetime
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  doiable_id     :integer
#  doiable_type   :string
#  suffix         :string
#
# Indexes
#
#  index_dois_on_suffix  (suffix) UNIQUE
#  index_on_dois         (inchikey,molecule_count,analysis_type,analysis_count) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (molecule_id => molecules.id)
#

class Doi < ActiveRecord::Base

  belongs_to :doiable, polymorphic: true
  belongs_to :molecule
  belongs_to :analysis, class_name: 'Container'


  before_save :align_suffix

  def build_suffix
    s = "#{inchikey}"
    s += ".#{molecule_count}" if molecule_count.to_i > 0
    if analysis_type.present?
      term_id = analysis_type.split('|').first.sub!(':','')
      s += "/#{term_id}"
      s += ".#{analysis_count}" if analysis_count.to_i > 0
    end
    s
  end

  def generate_doi
    "#{Datacite::Mds.new.doi_prefix}/#{suffix}"
  end

  def full_doi
    "#{Datacite::Mds.new.doi_prefix}/#{suffix}"
  end

  def self.find_by_doi(doi)
    d = split_doi(doi)
    find_by(suffix: d[:suffix])
  end

  def self.find_by_split_suffix(suffix)
    split_suffix = split_suffix(suffix)
    find_by(split_suffix)
  end

  def self.create_for_analysis!(analysis, ik = nil)
    if !ik
      rt = analysis.root_element
      ik = (rt.is_a?(Sample) && rt.molecule.inchikey) ||
        (rt.is_a?(Reaction) && rt.products_short_rinchikey_trimmed)
      raise "only works with sample/reaction analysis" unless ik
    end
    type = analysis.extended_metadata['kind'].delete(' ')
    type = type.presence || 'nd'
    ds = Doi.select("*, coalesce(analysis_count, 0) as real_count")
            .where(inchikey: ik, analysis_type: type)
            .order('real_count desc')
    if ds.blank?
      ac = 0
      version = ''
    else
      ac = ds.first.analysis_count.to_i.next
      version = ".#{ac}"
    end
    term_id = type.split('|').first.sub!(':','')
    suffix = "#{ik}/#{term_id}#{version}"
    Doi.create!(
      inchikey: ik,
      doiable_id: analysis.id,
      doiable_type: analysis.class.name,
      analysis_count: ac,
      suffix: suffix,
      analysis_type: type
    )
  end

  def self.create_for_element!(element, ik = nil)
    klass = element.class.name
    ik ||= case klass
           when 'Sample'
             element.molecule.inchikey
           when 'Reaction'
             "reaction/" + element.products_short_rinchikey_trimmed
           end

    ds = Doi.select("*, coalesce(molecule_count, 0) as real_count")
            .where(inchikey: ik)
            .order('real_count desc')
    if ds.blank?
      mc = 0
      version = ''
    else
      mc = ds.first.molecule_count.to_i.next
      version = ".#{mc}"
    end
    suffix = "#{ik}#{version}"
    d = Doi.create!(
      inchikey: ik,
      doiable_id: element.id,
      doiable_type: klass,
      molecule_count: mc,
      suffix: suffix
    )
  end

  private

  def self.extract_suffix(doi)
    if doi.match(/(10\..+?)\//)
      $'
    end
  end

  def self.split_doi(doi)
    if doi.match(/(10\..+?)\//)
      { prefix: $1, suffix: $', split_suffix: split_suffix($') }
    else
      {}
    end
  end

  def self.split_suffix(suffix)
    if suffix.match(/([\w-]+)(?:\.(\d+))?(?:\/((?:.+62\.5)|(?:[^.]+))?(?:\.(\d+))?)?\z/)
      {
        inchikey: $1,
        molecule_count: $2,
        analysis_type: $3,
        analysis_count: $4,
      }
    else
      {}
    end
  end

  def align_suffix
    if suffix_changed? && !inchikey_changed? && !analysis_type_changed?
      s = self.class.split_suffix(suffix)
      self.inchikey = s[:inchikey]
      self.molecule_count = s[:molecule_count]
      self.analysis_type = s[:analysis_type]
      self.analysis_count = s[:analysis_count]
    else !suffix_changed? && inchikey_changed?
      self.suffix = build_suffix
    end
    # throw(:abort) unless suffix == build_suffix
    suffix == build_suffix
  end

end
