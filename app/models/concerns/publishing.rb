module Publishing
  class Net::FTP
    def puttextcontent(content, remotefile, &block)
      f = StringIO.new(content)
      begin
        storlines('STOR ' + remotefile, f, &block)
      ensure
        f.close
      end
    end
  end

  extend ActiveSupport::Concern

  included do

    has_one :publication, as: :element
    has_one :publication_as_source, as: :original_element
    has_one :doi, as: :doiable
    before_save :check_doi

  end

  def publication_tag
    self.tag.taggable_data['publication']
  end

  def reserve_suffix
    return if self.is_a?(Container)

    return Doi.create_for_element!(self) unless (d = self.doi)

    if self.is_a?(Sample) && d.inchikey != self.molecule.inchikey
      d.update!(doiable: nil)
      return Doi.create_for_element!(self)
    elsif self.is_a?(Reaction) && (d.inchikey.tr('reaction/','') != self.products_short_rinchikey_trimmed)
      d.update!(doiable: nil)
      return Doi.create_for_element!(self)
    end
    d
  end

  def reserve_suffix_analyses(as = Container.none)
    return if self.is_a?(Container)

    ids = as.map(&:id)
    if self.is_a?(Sample)
      ik = self.molecule.inchikey
      analysis_set = self.analyses.where(id: ids)
    elsif self.is_a?(Reaction)
      ik = self.products_short_rinchikey_trimmed
      analysis_set = self.analyses.where(id: ids) |
      Container.where(id: (self.samples.map(&:analyses).flatten.map(&:id) & ids))
    end

    analysis_set.each do |analysis|
      if (doi = analysis.doi)
        type = analysis.extended_metadata['kind'].delete(' ')
        if (doi&.inchikey != ik) || (type != doi&.analysis_type)
          doi.update!(doiable: nil)
          doi = Doi.create_for_analysis!(analysis)
        end
      else
        doi = Doi.create_for_analysis!(analysis)
      end
    end
  end

  ### for all
  def full_doi
    return nil unless (d = Doi.find_by(doiable: self))
    d.full_doi
  end

  ## for all
  def generate_doi(version)
    if self.is_a?(Container)
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
    else
      version_str = version.to_i.zero? ? '' : '.' + version.to_s
      inchikey_version = self.molecule.inchikey + version_str
      "#{Datacite::Mds.new.doi_prefix}/#{inchikey_version}"
    end
  end

  def create_publication_tag(contributor, author_ids, license)
    return if self.is_a?(Container)

    authors = User.where(id: author_ids, type: %w(Person Collaborator))
                    .includes(:affiliations)
                    .order(Arel.sql("position(users.id::text in '#{author_ids}')"))
    affiliations = authors.map(&:current_affiliations)
    affiliations_output = {}
    affiliations.flatten.each do |aff|
      affiliations_output[aff.id] = aff.output_full
    end
    publication = {
      published_by: author_ids[0],
      author_ids: author_ids,
      creators: authors.map { |author|
        {
          'givenName' => author.first_name,
          'familyName' => author.last_name,
          'name' => author.name,
          'ORCID' => author.orcid,
          'affiliationIds' => author.current_affiliations.map(&:id),
          'id' => author.id
        }
      },
      contributors: {
        'givenName' => contributor.first_name,
        'familyName' => contributor.last_name,
        'name' => contributor.name,
        'ORCID' => contributor.orcid,
        'affiliations' => contributor.current_affiliations.map{ |aff| aff.output_full },
        'affiliationIds' => contributor.current_affiliations.map{ |aff| aff.id },
        'id' => contributor.id
      },
      affiliations: affiliations_output,
      affiliation_ids: affiliations.map { |as| as.map(&:id) },
      queued_at: DateTime.now,
      license: license
    }
    et = self.tag
    et.update!(
      taggable_data: (et.taggable_data || {}).merge(publication: publication)
    )
  end

  ##
  # Update the tag['publication'] for a (being) published public sample

  def update_publication_tag(**args)
    return if self.is_a?(Container)

    data = args.slice(
      :doi_reg_at, :pubchem_reg_at, :published_at, :sample_version, :doi, :chem_first
    )
    et = self.tag
    td = et.taggable_data
    td['publication'].merge!(data)

    ## update molecule tag
    if self.is_a?(Sample)
      mt = self.molecule.tag
      mt_data = mt.taggable_data || {}
      # chemotion_first unless already chemotion_first
      mt_data['chemotion'] ||= {}

      if args[:chem_first] && mt_data['chemotion']['chemotion_first'].blank?
        mt_data['chemotion']['chemotion_first'] = args[:chem_first]
      end

      mt_data['chemotion']['doi'] = args[:doi] unless mt_data['chemotion']['doi'].present?
      mt_data['chemotion']['last_published_at'] = args[:published_at]

      mt.update!(taggable_data: mt_data)
    end
    et.save!
  end

  ##
  # Update the tag of the original sample (and of its analysis) used for publication

  def tag_as_published(pub_sample, ori_analyses)
    return if self.is_a?(Container)

    et = self.tag
    publish_pending = !et.taggable_data&.key?('previous_version')
    if (pub_sample.is_a? Reaction)
      et.update!(
        taggable_data: (et.taggable_data || {}).merge(public_reaction: pub_sample.id, publish_pending: publish_pending)
      )
    else
      et.update!(
        taggable_data: (et.taggable_data || {}).merge(public_sample: pub_sample.id, publish_pending: publish_pending)
      )
    end

    ori_analyses.each do |analysis|
      analysis.reload
      aid = pub_sample.analyses.select { |a| a.extended_metadata == analysis.extended_metadata }&.first&.id || true
      at = analysis.tag
      at.update!(
        taggable_data: (at.taggable_data || {}).merge(public_analysis: aid)
      )
      xm = analysis.extended_metadata
      xm.delete('publish')
      xm['public_analysis'] = aid
      analysis.update!(extended_metadata: xm)
    end
  end

  def tag_as_new_version(previous_element, scheme_only: false)
    previous_license = previous_element&.tag&.taggable_data['publication']['license']
    previous_users = previous_element&.tag&.taggable_data['publication']['creators']

    element_tag = self.tag
    element_tag.update!(
      taggable_data: (element_tag.taggable_data || {}).merge(
        previous_version: {
          id: previous_element.id,
          doi: {
            id: previous_element&.doi&.id
          },
          license: previous_license,
          scheme_only: scheme_only,
          users: previous_users
        }
      )
    )
  end

  def tag_replace_in_publication
    element_tag = self.tag
    element_tag.update!(
      taggable_data: (element_tag.taggable_data || {}).merge(
        replace_in_publication: true
      )
    )
  end

  def untag_replace_in_publication
    element_tag = self.tag

    taggable_data = element_tag.taggable_data || {}
    taggable_data.delete('replace_in_publication')

    element_tag.update!(
      taggable_data: taggable_data
    )
  end

  def update_versions_tag
    element_tag = self.tag

    if element_tag.taggable_data['new_version'].nil?
      # recursively find all versions of the latest element
      versions = self.find_versions
    else
      # copy the list of versions from the latest element
      new_version = self.class.find_by(id: element_tag.taggable_data['new_version']['id'])
      versions = new_version&.tag&.taggable_data['versions']
    end

    element_tag.update!(
      taggable_data: (element_tag.taggable_data || {}).merge(
        versions: versions
      )
    )

    # call this method recursively for all versions
    unless element_tag.taggable_data['previous_version'].nil?
      previous_version = self.class.find_by(id: element_tag.taggable_data['previous_version']['id'])
      previous_version.update_versions_tag
    end
  end

  def find_versions
    element_tag = self.tag
    versions = [self.id]

    unless element_tag.taggable_data['previous_version'].nil?
      previous_version = self.class.find_by(id: element_tag.taggable_data['previous_version']['id'])
      versions += previous_version.find_versions
    end

    return versions
  end

  def tag_as_previous_version(new_element)
    element_tag = self.tag
    element_tag.update!(
      taggable_data: (element_tag.taggable_data || {}).merge(
        new_version: {
          id: new_element.id
        })
    )
  end

  def untag_as_previous_version
    element_tag = self.tag
    taggable_data = element_tag.taggable_data || {}
    taggable_data.delete('new_version')
    element_tag.update!(taggable_data: taggable_data)
  end

  def get_new_version_short_label
    m = self.previous_version.short_label.match /^(.*)-V(\d+)$/
    if m
      # increment the version part of the short_label of the previous version
      version = Integer(m[2]) + 1
      self.short_label = "#{m[1]}-V#{version}"
    else
      # append "-V1" to the short_label of the previous version
      self.short_label = "#{self.previous_version.short_label}-V1"
    end
  end

  def tag_reserved_suffix(ori_analyses)
    return if self.is_a?(Container)

    et = self.tag
    et.update!(
      taggable_data: (et.taggable_data || {}).merge(reserved_doi: self.doi.full_doi)
    )
    ori_analyses.each do |analysis|
      at = analysis.tag
      d = analysis.doi.full_doi
      at.update!(
        taggable_data: (at.taggable_data || {}).merge(reserved_doi: d)
      )
      xm = analysis.extended_metadata
      xm['reserved_doi'] = d
      xm['publish'] = true
      analysis.update!(extended_metadata: xm)
    end
  end

  def untag_reserved_suffix()
    return if self.is_a?(Container)

    et = self.tag
    taggable_data = et.taggable_data || {}
    taggable_data.delete('reserved_doi')
    et.update!(taggable_data: taggable_data)

    self.analyses.each do |analysis|
      at = analysis.tag
      td = at.taggable_data
      td.delete('reserved_doi')
      at.update!(taggable_data: td)

      xm = analysis.extended_metadata
      xm.delete('reserved_doi')
      analysis.update!(extended_metadata: xm)
    end
  end

  # remove doi link if molecule changes
  def check_doi
    d = self.doi
    return true unless d
    if self.is_a?(Sample) && molecule_id_changed?
      d.update!(doiable: nil)
      self.untag_reserved_suffix

    elsif self.is_a?(Reaction) && (d.inchikey.tr('reaction/', '') != self.products_short_rinchikey_trimmed)
      d.update!(doiable: nil)
      self.untag_reserved_suffix
      self.products.each do |s|
        sd = s.doi
        sd.update!(doiable: nil) unless sd.nil?
        s.untag_reserved_suffix
      end
    elsif self.is_a?(Container)
      if self.container_type == 'analysis' && self.publication&.state != 'completed'
        if self.extended_metadata['kind']&.delete(' ') != d.analysis_type
          unassociate_doi(d)
        end
      end
    end
    true
  end

  ## for Container
  def unassociate_doi(d = self.doi)
    d.update(doiable: nil) unless d.nil?
    self.extended_metadata.delete('reserved_doi')
    at = self.tag
    at.taggable_data.delete('reserved_doi')
    at.save
  end
end