# frozen_string_literal: true

# Helper for public API
module PublicHelpers
  extend Grape::API::Helpers
  include ApplicationHelper

  def get_pub_reaction(id)
    reaction = Reaction.where('id = ?', id)
    .select(
      <<~SQL
      reactions.id, reactions.name, reactions.description, reactions.reaction_svg_file, reactions.short_label,
      reactions.status, reactions.tlc_description, reactions.tlc_solvents, reactions.rf_value,
      reactions.temperature, reactions.timestamp_start,reactions.timestamp_stop,reactions.observation,
      reactions.rinchi_string, reactions.rinchi_long_key, reactions.rinchi_short_key,reactions.rinchi_web_key,
      (select label from publication_collections where (elobj ->> 'element_type')::text = 'Reaction' and (elobj ->> 'element_id')::integer = reactions.id) as embargo,
      (select json_extract_path(taggable_data::json, 'publication') from publications where element_type = 'Reaction' and element_id = reactions.id) as publication,
      (select taggable_data -> 'new_version' -> 'id' from element_tags where taggable_type = 'Reaction' and taggable_id = reactions.id) as new_version,
      (select taggable_data -> 'versions' from element_tags where taggable_type = 'Reaction' and taggable_id = reactions.id) as versions,
      reactions.duration
      SQL
    )
    .includes(
          container: :attachments
    ).last
    literatures = Repo::FetchHandler.literatures_by_cat(reaction.id,'Reaction') || []
    reaction.products.each do |p|
      literatures += Repo::FetchHandler.literatures_by_cat(p.id,'Sample')
    end

    pub = Publication.find_by(element_type: 'Reaction', element_id: reaction.id)
    pub_info = Repo::FetchHandler.get_pub_info(pub)
    infos = {}
    ana_infos = {}
    pd_infos = {}

    pub.state != Publication::STATE_COMPLETED && pub.descendants.each do |pp|
      review = pp.review || {}
      info = review['info'] || {}
      next if info.empty?
      if pp.element_type == 'Sample'
        pd_infos[pp.element_id] = info['comment']
      else
        ana_infos[pp.element_id] = info['comment']
      end
    end

    concept = Concept.find_by(id: pub.concept_id) if ENV['REPO_VERSIONING'] == 'true'

    scheme_list = Repo::FetchHandler.get_reaction_table(reaction.id)
    entities = Entities::RepoReactionEntity.represent(reaction, serializable: true)
    entities[:products].each do |p|
      label_ids = p[:tag][:taggable_data]['user_labels'] || [] unless p[:tag][:taggable_data].nil?
      p[:labels] = UserLabel.public_labels(label_ids, current_user, pub.state == Publication::STATE_COMPLETED) unless label_ids.nil?
      product_publication = Publication.find_by(element_type: 'Sample', element_id: p[:id])
      p[:pub_info] = Repo::FetchHandler.get_pub_info(product_publication)
      p[:ana_infos] = Repo::FetchHandler.get_ana_info(product_publication)
      pub_product = p
      p[:xvialCom] = build_xvial_com(p[:molecule][:inchikey], current_user&.id)
      p[:zip_download_url] = product_publication.taggable_data.dig('zip_download_url') if product_publication && product_publication.taggable_data
      p[:chemotion_zip_url] = product_publication.taggable_data.dig('chemotion_zip_url') if product_publication && product_publication.taggable_data
      pub_product_tag = pub_product[:tag][:taggable_data]
      next if pub_product_tag.nil?

      unless pub_product_tag['versions'].nil?
        p[:versions] = pub_product_tag['versions'].reduce([]) do |versions, version_id|
          sample = Sample.find(version_id)
          if sample&.publication&.state == 'completed'
            versions.append Entities::SampleEntity.represent(sample, serializable: true)
          end
          versions
        end
      end

      xvial = pub_product_tag['xvial'] && pub_product_tag['xvial']['num']
      next unless xvial.present?

      unless current_user.present? && User.reviewer_ids.include?(current_user.id)
        pub_product_tag['xvial']['num'] = 'x'
      end
      p[:xvialCom][:hasSample] = true
    end
    label_ids = (pub.taggable_data && pub.taggable_data['user_labels']) || []
    labels = UserLabel.public_labels(label_ids, current_user, pub.state == Publication::STATE_COMPLETED) unless label_ids.nil?

    reaction_versions = reaction.versions&.map do |version_id|
      ver_re = Reaction.find_by(id: version_id)
      { id: ver_re.id, name: ver_re.name, short_label: ver_re.short_label, doi: ver_re.doi&.full_doi } if ver_re.present?
    end

    entities[:publication]['review']['history'] = []
    entities[:publication]['review'] = nil if pub.state === Publication::STATE_COMPLETED
    entities[:literatures] = literatures unless entities.nil? || literatures.nil? || literatures.length == 0
    entities[:schemes] = scheme_list unless entities.nil? || scheme_list.nil? || scheme_list.length == 0
    entities[:isLogin] = current_user.present?
    entities[:isCI] = current_user.present? && current_user.id == User.chemotion_user.id
    entities[:embargo] = reaction.embargo
    entities[:labels] = labels
    entities[:infos] = { pub_info: pub_info, pd_infos: pd_infos, ana_infos: ana_infos }
    entities[:isReviewer] = current_user.present? && User.reviewer_ids.include?(current_user.id) ? true : false
    entities[:isPublisher] = (current_user.present? && current_user.id == pub.published_by)
    entities[:new_version] = reaction.new_version
    entities[:versions] = reaction_versions
    entities[:elementType] = 'reaction'
    entities[:segments] = Labimotion::SegmentEntity.represent(reaction.segments)
    entities[:publication][:concept] = Entities::ConceptEntity.represent(concept) if ENV['REPO_VERSIONING'] == 'true'
    fundings = Repo::FetchHandler.get_funding_references(reaction)
    entities[:fundingReferences] = fundings if fundings.present?
    entities
  end

  def get_pub_molecule(id, adv_flag=nil, adv_type=nil, adv_val=nil, _label_val=nil)
    molecule = Molecule.find(id)
    pub_id = Collection.public_collection_id
    adv = build_author_filter_sql(adv_flag, adv_type, adv_val)

    pub_samples = fetch_published_samples(molecule, pub_id, adv, nil)
    build_molecule_response(molecule, pub_samples)
  end

  def get_pub_sample(id, pid, adv_flag=nil, adv_type=nil, adv_val=nil, _label_val=nil)
    molecule = Molecule.find(id)
    pub = Publication.find(pid)
    sample = pub.element
    pub_id = Collection.public_collection_id
    adv = build_author_filter_sql(adv_flag, adv_type, adv_val)

    pub_samples = fetch_published_samples(molecule, pub_id, adv, sample.id)
    build_molecule_response(molecule, pub_samples)
  end

  private

  def build_author_filter_sql(adv_flag, adv_type, adv_val)
    if adv_flag.present? && adv_flag == true && adv_type.present? && adv_type == 'Authors' && adv_val.present?
      <<~SQL
        INNER JOIN publication_authors rs on rs.element_id = samples.id and rs.element_type = 'Sample' and rs.state = 'completed'
        and rs.author_id in ('#{adv_val.join("','")}')
      SQL
    else
      ''
    end
  end

  def fetch_published_samples(molecule, pub_id, adv, sample_id = nil)
    where_clause = if sample_id.present?
                     "samples.id = #{sample_id}"
                   else
                     <<~SQL
                       samples.id in (
                         SELECT samples.id FROM samples
                         INNER JOIN collections_samples cs on cs.collection_id = #{pub_id} and cs.sample_id = samples.id and cs.deleted_at ISNULL
                         INNER JOIN publications pub on pub.element_type='Sample' and pub.element_id=samples.id  and pub.deleted_at ISNULL
                         #{adv}
                       )
                     SQL
                   end

    Collection.public_collection.samples
      .includes(:molecule, :tag)
      .where("samples.molecule_id = ?", molecule.id)
      .where(where_clause)
      .select(
        <<~SQL
        samples.*,
        (select published_at from publications where element_type='Sample' and element_id=samples.id and deleted_at is null) as published_at,
        (select taggable_data -> 'new_version' -> 'id' from element_tags where taggable_type = 'Sample' and taggable_id = samples.id) as new_version,
        (select taggable_data -> 'versions' from element_tags where taggable_type = 'Sample' and taggable_id = samples.id) as versions,
        (select taggable_data -> 'reaction_id' from element_tags where taggable_type = 'Sample' and taggable_id = samples.id) as reaction_id
        SQL
      )
      .order('published_at desc')
  end

  def process_published_sample(sample)
    pub = Publication.find_by(element_type: 'Sample', element_id: sample.id)
    tag = pub.taggable_data
    return nil unless tag

    container = Entities::ContainerEntity.represent(sample.container)
    literatures = fetch_sample_literatures(sample.id)
    reaction_ids = fetch_reaction_ids(sample)
    sid = pub.taggable_data["sid"] unless pub.nil? || pub.taggable_data.nil?

    xvial_data = extract_xvial_data(sample)
    xvial = xvial_data[:xvial]
    comp_num = xvial_data[:comp_num]

    label_ids = sample.tag.taggable_data['user_labels'] || [] unless sample.tag.taggable_data.nil?
    user_labels = UserLabel.public_labels(label_ids, current_user, pub.state == Publication::STATE_COMPLETED) unless label_ids.nil?

    pub_info = Repo::FetchHandler.get_pub_info(pub)
    ana_infos = Repo::FetchHandler.get_ana_info(pub)
    embargo = PublicationCollections.where("(elobj ->> 'element_type')::text = 'Sample' and (elobj ->> 'element_id')::integer = #{sample.id}")&.first&.label
    segments = Labimotion::SegmentEntity.represent(sample.segments)
    concept = Entities::ConceptEntity.represent(pub.concept) if ENV['REPO_VERSIONING'] == 'true'
    isPublisher = (current_user.present? && current_user.id == pub.published_by)
    sample_versions = build_sample_versions(sample)

    fundings = Repo::FetchHandler.get_funding_references(sample)
    tag[:fundingReferences] = fundings if fundings.present?

    tag.merge(
      container: container, literatures: literatures,
      sample_svg_file: sample.sample_svg_file, short_label: sample.short_label,
      name: sample.name, description: sample.description,
      melting_point: sample.melting_point, boiling_point: sample.boiling_point,
      sample_id: sample.id, reaction_ids: reaction_ids, sid: sid, xvial: xvial, comp_num: comp_num,
      embargo: embargo, labels: user_labels, showed_name: sample.showed_name, pub_id: pub.id,
      ana_infos: ana_infos, pub_info: pub_info, segments: segments, published_at: pub.published_at,
      molecular_mass: sample.molecular_mass, sum_formula: sample.sum_formula,
      decoupled: sample.decoupled, molfile: sample.molfile,
      isPublisher: isPublisher, new_version: sample.new_version, versions: sample_versions, concept: concept
    )
  end

  def fetch_sample_literatures(sample_id)
    Literature.by_element_attributes_and_cat(sample_id, 'Sample', 'public')
      .joins("inner join users on literals.user_id = users.id")
      .select(
        <<~SQL
        literatures.*,
        json_object_agg(literals.id, literals.litype) as litype,
        json_object_agg(literals.id, users.first_name || chr(32) || users.last_name) as ref_added_by
        SQL
      ).group('literatures.id').as_json
  end

  def fetch_reaction_ids(sample)
    reaction_ids = ReactionsProductSample.where(sample_id: sample.id).pluck(:reaction_id)
    if reaction_ids.empty? && sample.reaction_id.present?
      reaction_ids = [sample.reaction_id]
    end
    reaction_ids
  end

  def extract_xvial_data(sample)
    return { xvial: nil, comp_num: nil } if sample.tag.taggable_data.nil?

    xvial = sample.tag.taggable_data['xvial'] && sample.tag.taggable_data['xvial']['num']
    if xvial.present?
      unless current_user.present? && User.reviewer_ids.include?(current_user.id)
        xvial = 'x'
      end
    end
    comp_num = sample.tag.taggable_data['xvial'] && sample.tag.taggable_data['xvial']['comp_num']

    { xvial: xvial, comp_num: comp_num }
  end

  def build_sample_versions(sample)
    sample.versions&.map do |version_id|
      ver_s = Sample.find_by(id: version_id)
      if ver_s.present?
        {
          id: ver_s.id,
          name: ver_s.name,
          short_label: ver_s.short_label,
          doi: ver_s.doi&.full_doi,
          molecule_id: ver_s.molecule_id,
          suffix: ver_s.doi&.suffix
        }
      end
    end
  end

  def build_molecule_response(molecule, pub_samples)
    xvial_com = build_xvial_com(molecule.inchikey, current_user&.id)

    published_samples = pub_samples.map { |s| process_published_sample(s) }.flatten.compact

    x = published_samples.select { |s| s[:xvial].present? }
    xvial_com[:hasSample] = x.length.positive?

    {
      molecule: MoleculeGuestSerializer.new(molecule).serializable_hash.deep_symbolize_keys,
      published_samples: published_samples,
      isLogin: current_user.present?,
      isCI: current_user.present? && current_user.id == User.chemotion_user.id,
      isReviewer: current_user.present? && User.reviewer_ids.include?(current_user.id),
      xvialCom: xvial_com,
      elementType: 'molecule'
    }
  end

  public

  def send_notification(attachment, user, status, has_error = false)
    data_args = { filename: attachment.filename, comment: 'the file has been updated' }
    level = 'success'
    if has_error
      data_args[:comment] = ' an error has occurred, the file is not changed.'
      level = 'error'
    elsif status == 4
      data_args[:comment] = ' file has not changed.'
      level = 'info'
    elsif @status == 7
      data_args[:comment] = ' an error has occurred while force saving the document, please review your changes.'
      level = 'error'
    end
    Message.create_msg_notification(
      channel_subject: Channel::EDITOR_CALLBACK, message_from: user.id,
      data_args: data_args, attach_id: attachment.id, research_plan_id: attachment.attachable_id, level: level
    )
  end

  def de_encode_json(json, key = '', viv = '', encode = true)
    if encode
      encode_json(json)
    else
      decode_json(json, key, viv)
    end
  end

  def represent_structure(molfile)
    molecule_viewer = Matrice.molecule_viewer
    if molecule_viewer.blank? || molecule_viewer[:chembox].blank?
      { molfile: molfile }
    else
      options = { timeout: 40, body: { mol: molfile }.to_json, headers: { 'Content-Type' => 'application/json' } }
      response = HTTParty.post("#{molecule_viewer[:chembox]}/core/rdkit/v1/structure", options)
      if response.code == 200
        { molfile: (response.parsed_response && response.parsed_response['molfile']) || molfile }
      else
        { molfile: molfile }
      end
    end
  end

  def raw_file(att)
    Base64.encode64(att.read_file)
  rescue StandardError
    nil
  end

  def raw_file_obj(att)
    {
      id: att.id,
      file: raw_file(att),
      predictions: JSON.parse(att.get_infer_json_content),
    }
  end

  def add_to_zip_and_update_file_text(zip, filename, file_content)
    zip.put_next_entry filename
    zip.write file_content
    "#{filename} #{Digest::MD5.hexdigest(file_content)}\n"
  end

  def export_and_add_to_zip(container_id, zip)
    return '' if Labimotion::Dataset.find_by(element_id: container_id, element_type: 'Container').blank?
    export = Labimotion::ExportDataset.new(container_id)
    export.export
    # export.spectra
    export_file_name = export.res_name
    zip.put_next_entry export_file_name
    export_file_content = export.read
    export_file_checksum = Digest::MD5.hexdigest(export_file_content)
    zip.write export_file_content
    "#{export_file_name} #{export_file_checksum}\n"
  end

  def prepare_and_export_dataset(container_id)
    env['api.format'] = :binary
    export = Labimotion::ExportDataset.new(container_id)
    export.export
    # export.spectra

    content_type('application/vnd.ms-excel')
    ds_filename = export.res_name
    filename = URI.encode_www_form_component(ds_filename)
    header('Content-Disposition', "attachment; filename=\"#{filename}\"")

    export.read
  end
end
