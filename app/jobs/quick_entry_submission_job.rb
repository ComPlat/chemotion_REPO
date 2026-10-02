# frozen_string_literal: true

# Handles the end-to-end Quick Entry pipeline off the request thread:
# SMILES → molfile, molecule + sample + analyses creation, attachment ingest,
# and hand-off to Repo::Submission for the review pipeline.
class QuickEntrySubmissionJob < ApplicationJob
  queue_as :quick_submitting

  def max_attempts
    1
  end

  def perform(payload)
    payload = payload.deep_symbolize_keys
    user = User.find(payload[:user_id])

    molfile = resolve_molfile(payload)
    raise 'Could not parse SMILES into a molecule' if molfile.blank?

    babel_info = begin
      Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    rescue StandardError
      {}
    end
    molecule = Molecule.find_or_create_by_molfile(molfile, **(babel_info || {}))
    raise 'Could not create molecule from structure' if molecule.blank?

    sample = build_sample(payload, user, molfile, molecule)
    apply_ranges(sample, payload)

    all_coll = Collection.get_all_collection_for_user(user.id)
    sample.collections << all_coll if all_coll.present?
    sample.container = Container.create_root_container
    sample.save!

    tag_with_review_label(sample)

    create_references(sample, user, payload[:references] || [])

    analysis_ids = create_analyses(sample, user, payload[:analysis_entries] || [])

    # NOTE: The submitter (contributor) is always added as the first author of a
    # Quick Entry submission. author_ids[0] becomes the publication's published_by
    # owner in Repo::Submission, so the submitter must stay first; co-authors and
    # group leads are appended after. There is intentionally no opt-out here.
    submission_params = {
      id: sample.id,
      analysesIds: analysis_ids,
      coauthors: payload[:coauthor_ids] || [],
      reviewers: payload[:reviewer_ids] || [],
      refs: [],
      license: payload[:license],
      addMe: true,
      addGroupLead: payload[:add_group_lead] ? true : false,
    }
    author_ids = [user.id] + (payload[:coauthor_ids] || [])
    author_ids |= user.group_leads.pluck(:id) if payload[:add_group_lead]

    SubmittingJob.perform_now(submission_params, 'Sample', author_ids, user.id)

    sample.reload
    mark_submitted(sample)
    notify_user(sample, user)
  rescue StandardError => e
    Publication.repo_log_exception(e, { job: 'QuickEntrySubmissionJob', payload: payload })
    notify_failure(payload, e)
    raise
  ensure
    cleanup_staged_files(payload[:staging_dir]) if payload && payload[:staging_dir]
  end

  private

  def resolve_molfile(payload)
    molfile = payload[:molfile]
    return molfile if molfile.present?

    smiles = payload[:smiles].to_s
    return nil if smiles.blank?

    begin
      mol = RdkitExtensionService.smiles_to_ctab(smiles)
      return mol if mol.present?
    rescue StandardError
      # fall through
    end

    begin
      pc_mol = Chemotion::PubchemService.molfile_from_smiles(smiles)
      return Chemotion::OpenBabelService.molfile_clear_hydrogens(pc_mol) if pc_mol.present?
    rescue StandardError
      nil
    end
  end

  def build_sample(payload, user, molfile, molecule)
    Sample.new(
      name: payload[:name],
      external_label: payload[:external_label].to_s,
      target_amount_value: payload[:target_amount_value],
      target_amount_unit: payload[:target_amount_unit],
      description: payload[:description].to_s,
      purity: payload[:purity] || 1.0,
      location: '',
      molfile: molfile,
      molecule_id: molecule.id,
      is_top_secret: false,
      decoupled: false,
      sample_type: 'Micromolecule',
      created_by: user.id,
    )
  end

  def apply_ranges(sample, payload)
    mp_low = payload[:melting_point_lowerbound]
    mp_high = payload[:melting_point_upperbound]
    if mp_low.present? || mp_high.present?
      low = mp_low.presence || mp_high
      high = mp_high.presence || mp_low
      sample.melting_point = Range.new(low, high)
    end

    bp_low = payload[:boiling_point_lowerbound]
    bp_high = payload[:boiling_point_upperbound]
    return unless bp_low.present? || bp_high.present?

    low = bp_low.presence || bp_high
    high = bp_high.presence || bp_low
    sample.boiling_point = Range.new(low, high)
  end

  def tag_with_review_label(sample)
    review_label = UserLabel.find_or_create_by!(title: 'new', access_level: 3) do |ul|
      ul.color = '#f44336'
      ul.description = 'Submission created via Quick Entry'
    end

    tag = sample.tag
    existing_labels = (tag.taggable_data || {})['user_labels'] || []
    tag.update!(
      taggable_data: (tag.taggable_data || {}).merge(
        'creation_source' => 'quick_entry',
        'user_labels' => (existing_labels + [review_label.id]).uniq,
      ),
    )
  end

  def create_analyses(sample, user, entries)
    return [] if entries.blank?

    sample.reload
    analyses_container = sample.container.analyses_container
    ids = []

    entries.each_with_index do |entry, idx|
      entry = entry.deep_symbolize_keys
      entry_name = entry[:name].to_s.strip
      if entry_name.blank?
        first_file = (entry[:files] || []).first
        entry_name = first_file ? File.basename(first_file[:filename].to_s, '.*') : "Analysis #{idx + 1}"
      end

      ext_meta = {}
      ext_meta['kind'] = entry[:type] if entry[:type].present?
      ext_meta['instrument'] = entry[:instrument] if entry[:instrument].present?
      content_value = entry[:content]
      if content_value.is_a?(Hash) && content_value[:ops]
        ext_meta['content'] = content_value.deep_stringify_keys.to_json
      elsif content_value.is_a?(String) && content_value.strip.present?
        ext_meta['content'] = { 'ops' => [{ 'insert' => content_value }] }.to_json
      end
      ext_meta['status'] = 'Confirmed'

      analysis = analyses_container.children.create!(
        container_type: 'analysis',
        name: entry_name,
        extended_metadata: ext_meta,
      )

      dataset_meta = {}
      dataset_meta['instrument'] = entry[:instrument] if entry[:instrument].present?
      dataset = analysis.children.create!(
        container_type: 'dataset',
        name: entry_name,
        extended_metadata: dataset_meta,
      )

      (entry[:files] || []).each do |file|
        next unless file[:path].present? && File.exist?(file[:path])

        Attachment.new(
          bucket: dataset.id,
          filename: file[:filename],
          file_path: file[:path],
          created_by: user.id,
          created_for: user.id,
          content_type: file[:content_type],
          attachable_type: 'Container',
          attachable_id: dataset.id,
        ).save!
      end
      ids << analysis.id
    end
    ids
  end

  def create_references(sample, user, refs)
    return if refs.blank?

    refs.each do |raw|
      ref = raw.respond_to?(:deep_symbolize_keys) ? raw.deep_symbolize_keys : raw.symbolize_keys
      title = ref[:title].to_s.strip
      doi = ref[:doi].to_s.strip
      url = ref[:url].to_s.strip
      isbn = ref[:isbn].to_s.strip
      next if [title, doi, url, isbn].all?(&:blank?)

      literature = Literature.find_or_create_by(
        doi: doi.presence,
        url: url.presence,
        title: title.presence,
        isbn: isbn.presence,
      )
      next unless literature&.persisted?

      if ref[:refs].is_a?(Hash) && (ref[:refs][:bibtex].present? || ref[:refs][:bibliography].present?)
        merged = (literature.refs || {}).merge(
          'bibtex' => ref[:refs][:bibtex],
          'bibliography' => ref[:refs][:bibliography],
        ).compact
        literature.update!(refs: merged)
      end

      Literal.find_or_create_by(
        literature_id: literature.id,
        user_id: user.id,
        element_type: 'Sample',
        element_id: sample.id,
        litype: ref[:litype].to_s.presence,
        category: 'detail',
      )
    end
  rescue StandardError => e
    Publication.repo_log_exception(e, { element: sample&.id, user: user&.id, refs: refs })
  end

  def mark_submitted(sample)
    tag = sample.tag
    return if tag.taggable_data.nil?

    publish_pending = !tag.taggable_data.key?('previous_version')
    tag.update!(taggable_data: tag.taggable_data.merge(publish_pending: publish_pending))
  rescue StandardError => e
    Publication.repo_log_exception(e, { element: sample&.id })
  end

  def notify_user(sample, user)
    Message.create_msg_notification(
      channel_id: Channel.find_by(subject: Channel::SUBMITTING)&.id,
      message_from: user.id,
      autoDismiss: 5,
      message_content: {
        data: "Quick Entry submission for Sample [#{sample.short_label}] is now pending review.",
      },
    )
  rescue StandardError => e
    Publication.repo_log_exception(e, { element: sample&.id, user: user&.id })
  end

  def notify_failure(payload, error)
    user_id = payload[:user_id]
    return if user_id.blank?

    Message.create_msg_notification(
      channel_id: Channel.find_by(subject: Channel::SUBMITTING)&.id,
      message_from: user_id,
      autoDismiss: 10,
      message_content: {
        data: "Quick Entry submission failed: #{error.message}",
      },
    )
  rescue StandardError
    nil
  end

  def cleanup_staged_files(staging_dir)
    return if staging_dir.blank?

    path = Pathname.new(staging_dir)
    return unless path.exist? && path.to_s.include?('quick_entry')

    FileUtils.remove_entry(path.to_s)
  rescue StandardError
    nil
  end
end
