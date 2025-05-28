module Versioning
  extend ActiveSupport::Concern
  def concept_doi
    return nil if self.container_type != 'analysis'

    return nil unless (p = Publication.find_by(element_type: 'Container', element_id: self.id))
    p.concept&.doi&.full_doi
  end

  def versions
    return nil if self.container_type != 'analysis'

    version_ids = self.extended_metadata.fetch('versions', '').split('|')
    Container.where(id: version_ids).order(id: 'desc')
  end

  def update_versions(versions = nil)
    return nil if self.container_type != 'analysis'

    versions = self.find_versions if versions.nil?
    self.extended_metadata['versions'] = versions.join('|')
    self.save!

    # call this method recursively for all versions
    unless self.extended_metadata['previous_version_id'].nil?
      previous_version = Container.find_by(id: self.extended_metadata['previous_version_id'])
      previous_version.update_versions(versions)
    end
  end

  def find_versions
    return [self.id] if self.container_type != 'analysis'

    versions = [self.id]
    unless self.extended_metadata['previous_version_id'].nil?
      previous_version = Container.find_by(id: self.extended_metadata['previous_version_id'])
      versions += previous_version.find_versions
    end
    versions
  end
end
