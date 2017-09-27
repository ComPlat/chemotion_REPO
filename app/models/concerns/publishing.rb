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

    def publication_tag
      self.tag.taggable_data['publication']
    end

    def reserve_suffix
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
            doi d = analysis.doi= Doi.create_for_analysis!(analysis)
          end
        else
          doi = Doi.create_for_analysis!(analysis)
        end
      end
    end

    def full_doi
      return nil unless (d = Doi.find_by(doiable: self))
      d.full_doi
    end

    def generate_doi(version)
      version_str = version.to_i.zero? ? '' : '.' + version.to_s
      inchikey_version = self.molecule.inchikey + version_str
      "#{Datacite::Mds.new.doi_prefix}/#{inchikey_version}"
    end

    def create_publication_tag(contributor, author_ids, license)
      authors = User.where(id: author_ids, type: %w(Person Collaborator))
                      .includes(:affiliations)
                      .order("position(users.id::text in '#{author_ids}')")
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
      et = self.tag
      if (pub_sample.is_a? Reaction)
        et.update!(
          taggable_data: (et.taggable_data || {}).merge(public_reaction: pub_sample.id, publish_pending: true)
        )
      else
        et.update!(
          taggable_data: (et.taggable_data || {}).merge(public_sample: pub_sample.id, publish_pending: true)
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

    def tag_reserved_suffix(ori_analyses)
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
      end
      true
    end
  end
end
