# frozen_string_literal: true

# == Schema Information
#
# Table name: containers
#
#  id                :integer          not null, primary key
#  ancestry          :string
#  containable_id    :integer
#  containable_type  :string
#  name              :string
#  container_type    :string
#  description       :text
#  extended_metadata :hstore
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  parent_id         :integer
#
# Indexes
#
#  index_containers_on_containable  (containable_type,containable_id)
#

class Container < ApplicationRecord
  include ElementCodes
  include Labimotion::Datasetable
  include Taggable

  belongs_to :containable, polymorphic: true, optional: true
  has_many :attachments, as: :attachable
  has_one :publication, as: :element
  has_one :doi, as: :doiable

  before_save :content_to_plain_text
  # TODO: dependent destroy for attachments should be implemented when attachment get paranoidized instead of this DJ
  before_destroy :delete_attachment
  before_destroy :destroy_datasetable

  ## has_closure_tree order: "extended_metadata->'index' asc"  ## TODO: Paggy
  has_closure_tree

  scope :analyses_for_root, lambda { |root_id|
    where(container_type: 'analysis').joins(
      "inner join container_hierarchies ch on ch.generations = 2
      and ch.ancestor_id = #{root_id} and ch.descendant_id = containers.id ",
    )
  }

  scope :analyses_container, ->(id) {
    where(container_type: 'analyses').joins(
      <<~SQL
        inner join container_hierarchies ch
        on (ch.ancestor_id = #{id} and ch.descendant_id = containers.id)
        or (ch.descendant_id = #{id} and ch.ancestor_id = containers.id)
      SQL
    )
  }

  before_save :check_doi

  def analyses
    Container.analyses_for_root(id)
  end

  def root_element
    root.containable
  end

  def self.create_root_container(**args)
    root_con = Container.create(name: 'root', container_type: 'root', **args)
    root_con.children.create(container_type: 'analyses')
    root_con
  end

  def delete_attachment
    if Rails.env.production?
      attachments.each do |attachment|
        attachment.delay(run_at: 96.hours.from_now, queue: 'attachment_deletion').destroy!
      end
    else
      attachments.each(&:destroy!)
    end
  end

  def generate_doi version
    type = self.extended_metadata['kind'].delete(' ') if self.extended_metadata['kind']
    version_str = version.to_i == 0 ? "" : "." + version.to_s
    term_id = (type || '').split('|').first.sub!(':','')
    if self.root.containable.respond_to? :molecule
      ds_version = self.root.containable.molecule.inchikey + "/" + term_id + version_str
    elsif self.root.containable.respond_to? :products_short_rinchikey_trimmed
      ds_version = "reaction/" + self.root.containable.products_short_rinchikey_trimmed+ "/" + term_id + version_str
    else
      ds_version =  term_id + version_str
    end
    "#{Datacite::Mds.new.doi_prefix}/#{ds_version}"
  end

  def full_doi
    return nil unless (d = Doi.find_by(doiable: self))
    d.full_doi
  end

  def unassociate_doi(d = self.doi)
    d.update(doiable: nil) unless d.nil?
    self.extended_metadata.delete('reserved_doi')
    at = self.tag
    at.taggable_data.delete('reserved_doi')
    at.save
  end

  def check_doi
    # unassoicate doi if type has changed
    if (d = self.doi) && self.container_type == 'analysis' && self.publication&.state != 'completed'
      if self.extended_metadata['kind']&.delete(' ') != d.analysis_type
        unassociate_doi(d)
      end
    end
    true
  end
  # rubocop:disable Style/StringLiterals

  def content_to_plain_text
    return unless extended_metadata_changed?
    return if extended_metadata.blank? || (extended_metadata.present? && extended_metadata['content'].blank?)

    plain_text = Chemotion::QuillToPlainText.convert(extended_metadata['content'])
    return if plain_text.blank?

    self.plain_text_content = plain_text
  end
  # rubocop:enable Style/StringLiterals
end
