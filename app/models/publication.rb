# == Schema Information
#
# Table name: publications
#
#  id                    :integer          not null, primary key
#  state                 :string
#  metadata              :jsonb
#  taggable_data         :jsonb
#  dois                  :jsonb
#  element_type          :string
#  element_id            :integer
#  doi_id                :integer
#  created_at            :datetime
#  updated_at            :datetime
#  deleted_at            :datetime
#  original_element_type :string
#  original_element_id   :integer
#  ancestry              :string
#  metadata_xml          :text
#  published_by          :integer
#  published_at          :datetime
#  review                :jsonb
#
# Indexes
#
#  index_publications_on_ancestry  (ancestry)
#

class Publication < ActiveRecord::Base
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

  acts_as_paranoid
  has_ancestry
  belongs_to :element, polymorphic: true
  belongs_to :original_element, polymorphic: true
  belongs_to :doi

  STATE_START = 'start'

  STATE_DC_METADATA_UPLOADING = 'dc_metadata_uploading'
  STATE_DC_METADATA_UPLOADED = 'dc_metadata_uploaded'

  # STATE_DC_METADATA_ANALYSES_UPLOADING = 'dc_metadata_analyses_uploading'
  # STATE_DC_METADATA_ANALYSES_UPLOADED = 'dc_metadata_analyses_uploaded'

  STATE_DC_DOI_REGISTERING = 'dc_doi_registering'
  STATE_DC_DOI_REGISTERED = 'dc_doi_registered'

  STATE_PUBCHEM_REGISTERING = 'pubchem_registering'
  STATE_PUBCHEM_REGISTERED = 'pubchem_registered'

  # STATE_DC_DOI_MINT_ANALYSES_START = 'dc_doi_mint_analyses_start'
  # STATE_DC_DOI_MINT_ANALYSES_DONE = 'dc_doi_mint_analyses_done'

  STATE_COMPLETING = 'completing'
  STATE_COMPLETED = 'completed'
  STATE_PUBLISHED = 'published'

  STATE_ACCEPTED = 'accepted'
  STATE_PENDING = 'pending'
  STATE_DECLINED = 'declined'
  STATE_REVIEWED = 'reviewed'
  STATE_RETRACTED = 'retracted'

  def embargoed?(root_publication = root)
    cid = User.find(root_publication.published_by).publication_embargo_collection.id
    embargo_col = root_publication.element.collections.select { |c| c['ancestry'].to_i == cid }
    embargo_col.present? ? true : false
  end

  # Moving publication element to collections according to publication state

  def update_state(new_state)
    update_columns(state: new_state)
    descendants.each { |d| d.update_columns(state: new_state) }
    process_element(new_state)
  end

  def process_element(new_state = state)
    case new_state
    when Publication::STATE_PENDING
      move_to_pending_collection
    when Publication::STATE_REVIEWED
      move_to_review_collection
    when Publication::STATE_ACCEPTED
      move_to_accepted_collection
    when Publication::STATE_DECLINED
      declined_reverse_original_element
      declined_move_collections
    end
  end

  # WARNING: for STATE_ACCEPTED the method does more than just notify users (see ChemotionRepoPublishingJob)
  # TODO: separate publishing responsability
  def inform_users(new_state = state, current_user_id = 0)
    method = if ENV['PUBLISH_MODE'] == 'production' && Rails.env.production?
               :perform_later
             elsif ENV['PUBLISH_MODE'] == 'staging'
               :perform_now
             end
    return unless method

    queue_name = new_state.to_s
    klass = if new_state == Publication::STATE_ACCEPTED && !embargoed?
              queue_name = 'publishing'
              ChemotionRepoPublishingJob
            else
              ChemotionRepoReviewingJob
            end
    klass.set(queue: "#{queue_name} #{id}").send(method, id, new_state, current_user_id)
  end

  # remove publication element from editable collections
  def move_to_accepted_collection
    pub_user = User.find(published_by)
    return false unless pub_user && element
    return true unless embargoed?

    ## do not move if in reviewing, but why ???
    # reviewing_col = element.collections.where(id: pub_user.reviewing_collection.id).pluck(:id)
    # return false if reviewing_col.present?

    case element_type
    when 'Sample'
      CollectionsSample
    when 'Reaction'
      CollectionsReaction
    end.remove_in_collection(
      element.id,
      element.collections.where(
        id: [pub_user.pending_collection.id, pub_user.reviewing_collection.id]
      ).pluck(:id) + Collection.element_to_review_collection.pluck(:id)
    )
  end

  # move publication element from reviewer editable collection to submitter editable collection
  # move publication element from submitter readable collection to reviewer readable collection
  def move_to_review_collection
    pub_user = User.find(published_by)
    return false unless pub_user && element

    case element_type
    when 'Sample'
      CollectionsSample
    when 'Reaction'
      CollectionsReaction
    end.move_to_collection(
      element.id,
      [pub_user.pending_collection.id] + Collection.element_to_review_collection.pluck(:id),
      [pub_user.reviewing_collection.id] + Collection.reviewed_collection.pluck(:id)
    )
  end

  def move_to_pending_collection
    pub_user = User.find(published_by)
    return false unless pub_user && element

    case element_type
    when 'Sample'
      CollectionsSample
    when 'Reaction'
      CollectionsReaction
    end.move_to_collection(
      element.id,
      [pub_user.reviewing_collection.id] + Collection.reviewed_collection.pluck(:id),
      [pub_user.pending_collection.id] + Collection.element_to_review_collection.pluck(:id)
    )
  end

  def declined_reverse_original_element
    oet = original_element&.tag
    oet&.taggable_data&.delete('publish_pending')
    oet&.taggable_data&.delete('public_reaction') if element_type == 'Reaction'
    oet&.taggable_data&.delete('public_sample') if element_type == 'Sample'
    oet&.save!
    original_element&.analyses&.each do |a|
      a.reload
      a.tag&.taggable_data&.delete('public_analysis') && a.tag.save!
      a.extended_metadata&.delete('public_analysis') && a.save!
    end
    declined_reverse_original_reaction_elements
  end

  def declined_reverse_original_reaction_elements
    element_type == 'Reaction' && original_element&.samples&.each do |s|
      spp = s.tag&.taggable_data&.delete('publish_pending')
      sps = s.tag&.taggable_data&.delete('public_sample')
      s.tag&.save! unless spp.nil? && sps.nil?
      original_element&.analyses&.each do |a|
        a.reload
        a.tag&.taggable_data&.delete('public_analysis') && a.tag.save!
        a.extended_metadata&.delete('public_analysis') && a.save!
      end
    end
  end

  def declined_move_collections
    all_col_id = User.find(published_by).all_collection&.id
    return unless element && all_col_id

    col_ids = element&.collections&.pluck(:id)
    et = element.tag
    et.taggable_data = et.taggable_data.merge(decline: true)
    tag_pub = et.taggable_data&.delete('publication')
    et.save!
    case element_type
    when 'Reaction'
      CollectionsReaction
    when 'Sample'
      CollectionsSample
    end.move_to_collection(element_id, col_ids, all_col_id)
  end

  # NB: ?NOT USED? Was it meant for declining/rejecting publication
  # NB: was Moved to model from ChemotionRepoReviewingJob
  # TODO: move this to publising concern ?
  # def release_original_element
  #   ot = original_element&.tag&.taggable_data&.delete("publish_#{element_type.downcase}")
  #   original_element.tag.save! unless ot.nil?
  #
  #   case element_type
  #   when 'Sample'
  #     clear_orig_analyses(original_element)
  #   when 'Reaction'
  #     clear_orig_analyses(original_element)
  #     original_element&.samples&.each do |s|
  #       t = s.tag&.taggable_data&.delete('publish_sample')
  #       s.tag.save! unless t.nil?
  #       clear_orig_analyses(s)
  #     end
  #   end
  # end

  # TODO: mv this to publishing concern ??
  # def clear_orig_analyses(el = element)
  #   el&.analyses&.each do |a|
  #     t = a.tag&.taggable_data&.delete('publish_analysis')
  #     a.tag.save! unless t.nil?
  #   end
  # end

  def publication_logger
    @@publication_logger ||= Logger.new(File.join(Rails.root, 'log', 'publication.log'))
  end

  def doi_bag
    d = doi
    case element_type
    when 'Sample'
      dois = {
        sample: {
          DOI: d.full_doi,
          suffix: d.suffix,
          inchikey: d.inchikey,
          count: d.molecule_count
        },
        analyses_dois: {}
      }
      children.each do |a|
        d = a.doi
        dois[:analyses_dois][a.element_id.to_s] = {
          DOI: d.full_doi,
          suffix: d.suffix,
          type: d.analysis_type,
          count: d.analysis_count
        }
      end
    when 'Reaction'
      dois = {
        reaction: {
          DOI: d.full_doi,
          suffix: d.suffix,
          inchikey: d.inchikey,
          count: d.molecule_count
        },
        analyses_dois: {}
      }
      children.where(element_type: 'Container').each do |a|
        d = a.doi
        dois[:analyses_dois][a.element_id.to_s] = {
          DOI: d.full_doi,
          suffix: d.suffix,
          type: d.analysis_type,
          count: d.analysis_count
        }
      end
      dois['samples'] = {}
      children.where(element_type: 'Sample').each do |new_sample|
        d = new_sample.doi
        if d
          dois['samples'][new_sample.element_id.to_s] = {
            sample: {
              DOI: d.full_doi,
              suffix: d.suffix,
              inchikey: d.inchikey,
              count: d.molecule_count
            },
            analyses_dois: {}
          }
        end
      end
    when 'Container'
      parent_doi = parent.doi
      dois = {
        analysis: {
          DOI: d.full_doi,
          suffix: d.suffix,
          inchikey: d.inchikey,
          count: d.molecule_count
        },
        parent_element: {
          DOI: parent_doi.full_doi,
          suffix: parent_doi.suffix,
          inchikey: parent_doi.inchikey,
          count: parent_doi.molecule_count
        }
      }
    end
    return  dois
  end

  def scheme_only
    taggable_data && taggable_data['scheme_only'] == true ? true : false
  end

  def rights_data
    rights = {
      schemeURI: 'https://spdx.org/licenses/',
      rightsIdentifierScheme: 'SPDX',
      rightsIdentifier: 'CC-BY-SA-4.0',
      rightsURI: 'http://creativecommons.org/licenses/by-sa/4.0/',
      rightsName: 'Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)'
    }
    if taggable_data && taggable_data['license'].present?
      case taggable_data['license']
      when 'CC BY'
        rights[:rightsIdentifier] = 'CC-BY-4.0'
        rights[:rightsURI] = 'http://creativecommons.org/licenses/by/4.0/'
        rights[:rightsName] = 'Attribution 4.0 International (CC BY 4.0)'
      when 'CC0'
        rights[:rightsIdentifier] = 'CC0-1.0'
        rights[:rightsURI] = 'http://creativecommons.org/publicdomain/zero/1.0/'
        rights[:rightsName] = 'CC0 1.0 Universal'
      end
    end
    rights
  end

  def datacite_metadata_xml
    parent_element = parent&.element

    metadata_obj = OpenStruct.new(element: element, pub_tag: taggable_data, dois: doi_bag, parent_element: parent_element.presence, rights: rights_data)
    erb_file = if element_type == 'Container'
                 "app/publish/datacite_metadata_#{parent_element.class.name.downcase}_#{element_type.downcase}.html.erb"
               else
                 "app/publish/datacite_metadata_#{element_type.downcase}.html.erb"
               end
    metadata_file = ERB.new(File.read(File.join(
        Rails.root,
        erb_file
    )))
    metadata_file.result(metadata_obj.instance_eval { binding })
  end

  def persit_datacite_metadata_xml!
    mt = datacite_metadata_xml
    self.update!(metadata_xml: mt)
    mt
  end

  def transition_from_start_to_metadata_uploading!
    return unless valid_transition(STATE_DC_METADATA_UPLOADING)
    mt = datacite_metadata_xml
    self.update!(metadata_xml: mt, state: STATE_DC_METADATA_UPLOADING)
  end

  def transition_from_metadata_uploading_to_uploaded!
    return unless valid_transition(STATE_DC_METADATA_UPLOADED)
    if (ENV['DATACITE_MODE'] == 'test' || ENV['PUBLISH_MODE'] == 'production') && scheme_only == false
      resp = Datacite::Mds.new.upload_metadata(metadata_xml)
      success = resp.is_a?(Net::HTTPSuccess)
      message = "#{resp.inspect}: metadata upload#{"ing fail" if !success}ed"
    else
      success = true
      message = "metadata not uploaded in mode #{ENV['PUBLISH_MODE']}"
    end
    logger([message, metadata])
    raise "#{message}" unless success
    self.update!(state: STATE_DC_METADATA_UPLOADED)
  end

  def transition_from_metadata_uploaded_to_doi_registering!
    return unless valid_transition(STATE_DC_DOI_REGISTERING)
    self.update!(state: STATE_DC_DOI_REGISTERING)
  end

  def transition_from_doi_registering_to_registered!
    return unless valid_transition(STATE_DC_DOI_REGISTERED)
    mds = Datacite::Mds.new
    suffix = doi.suffix
    short_doi = "#{mds.doi_prefix}/#{suffix}"
    url = "https://#{mds.doi_domain}/inchikey/#{suffix}"
    if (ENV['DATACITE_MODE'] == 'test' || ENV['PUBLISH_MODE'] == 'production') && scheme_only == false
      resp = mds.mint(short_doi, url)
      success = resp.is_a?(Net::HTTPSuccess)
      message = "#{resp.inspect}: DOI mint#{'ing fail' unless success}ed"
    else
      success = true
      message = "DOI not minted in mode #{ENV['PUBLISH_MODE']}"
    end
    logger([message, "doi: #{short_doi}", "url: #{url}"])
    raise "#{message}:\n #{short_doi} <-> #{url}" unless success
    doi_date = DateTime.now
    case element_type
    when 'Sample'
      chem_first = element.pubchem_cid.blank?
      tag_data = {
        doi_reg_at: doi_date,
        sample_version: doi.molecule_count,
        doi: short_doi
      }
      tag_data[:chem_first] = doi_date if chem_first
      element.update_publication_tag(tag_data)
    when 'Container'
      et = ElementTag.find_or_create_by(
        taggable_type: 'Container', taggable_id: element_id
      )
      tag_data = parent.element.publication_tag.merge({
        published_at: doi_date,
        dataset_version: doi.analysis_count,
        analysis_doi: short_doi
      })
      et.update!(
        taggable_data: (et.taggable_data || {}).merge(publication: tag_data)
      )
    when 'Reaction'
      tag_data = {
        doi_reg_at: doi_date,
        reaction_version: doi.molecule_count,
        doi: short_doi
      }
      element.update_publication_tag(tag_data)
    end

    pd = taggable_data.merge(tag_data)
    self.update!(state: STATE_DC_DOI_REGISTERED,taggable_data: taggable_data.merge(pd))
  end

  def transition_from_doi_registered_to_pubchem_registering!
    return unless valid_transition(STATE_PUBCHEM_REGISTERING)
    self.update!(state: STATE_PUBCHEM_REGISTERING)
  end

  def transition_from_doi_pubchem_registering_to_registered!
    return unless valid_transition(STATE_PUBCHEM_REGISTERED)
    if element_type == 'Sample'
      metadata_obj = OpenStruct.new(sample: element)
      metadata_file = ERB.new(File.read(
        File.join(Rails.root,'app', 'publish', 'pubchem_metadata.sdf.erb')
      ))
      mt = metadata_file.result(metadata_obj.instance_eval { binding })
      if (production = Rails.env.production? && ENV['PUBLISH_MODE'] == 'production') && scheme_only == false
        ftp = Net::FTP.new('ftp-private.ncbi.nlm.nih.gov')
        ftp.passive = true
        ftp.login(ENV['PUBCHEM_LOGIN'], ENV['PUBCHEM_PASSWORD'])
        ftp.puttextcontent(mt, doi.suffix + '.sdf.in')
        ftp.close
      end
      message = "\n---MOLFILE START---"
      element.update_publication_tag(pubchem_reg_at: DateTime.now)
      pd = taggable_data.merge(pubchem_reg_at: DateTime.now)
      logger([message, mt, "Pubchem FTP upload #{production ? '' : 'NOT'} sent (mode: #{ENV['PUBLISH_MODE']})"])
    end
    self.update!(state: STATE_PUBCHEM_REGISTERED, taggable_data: taggable_data.merge(pd))
  end

  def transition_from_pubchem_registered_to_completing!
    return unless valid_transition(STATE_COMPLETING)
    self.update!(state: STATE_COMPLETING)
  end

  def transition_from_doi_registered_to_completing!
    return unless valid_transition(STATE_COMPLETING)
    self.update!(state: STATE_COMPLETING)
  end

  def transition_from_completing_to_completed!
    return unless valid_transition(STATE_COMPLETED)
    pd = {}
    if element_type != 'Container'
      creator_ids = taggable_data['author_ids']
      su_id = User.chemotion_user.id

      pending_collection_ids = Collection.joins(
        "INNER JOIN sync_collections_users ON sync_collections_users.collection_id = collections.id"
      ).where("sync_collections_users.shared_by_id = ?", su_id)
       .where("sync_collections_users.user_id in (?)", creator_ids)
       .where("collections.label = 'Pending Publications'").pluck(:id)

       my_published_collection_ids = Collection.joins(
        "INNER JOIN sync_collections_users ON sync_collections_users.collection_id = collections.id"
      ).where("sync_collections_users.shared_by_id = ?", User.chemotion_user.id)
       .where("sync_collections_users.user_id in (?)", creator_ids)
       .where("collections.label = 'Published Elements'")
       .pluck(:id)


      if element_type == 'Reaction' && scheme_only
        published_collection_ids = my_published_collection_ids + [Collection.scheme_only_reactions_collection.id]
      else
        published_collection_ids = my_published_collection_ids + [Collection.public_collection_id]
      end


      collections_klass = "Collections#{element_type}".constantize
      collections_klass.remove_in_collection([element_id], pending_collection_ids)
      collections_klass.remove_in_collection([element_id], Collection.element_to_review_collection.pluck(:id))
      collections_klass.create_in_collection([element_id], published_collection_ids)

      time = DateTime.now
      element.update_publication_tag(published_at: time)
      pd = taggable_data.merge(published_at: time)
      logger(['moved to collections'])
    end
    self.update!(state: STATE_COMPLETED, taggable_data: taggable_data.merge(pd), published_at: time)
  end

  def default_line
     @default_line ||= "#{element_type} #{element_id}: "
  end

  def valid_transition(to_state)
    case to_state
    when STATE_START
      valid = [STATE_START].include?(state)

    when STATE_ACCEPTED
      valid = [STATE_ACCEPTED].include?(state)

    when STATE_DC_METADATA_UPLOADING
      valid = [STATE_ACCEPTED].include?(state)

    when STATE_DC_METADATA_UPLOADED
      valid = [STATE_DC_METADATA_UPLOADING].include?(state)

    when STATE_DC_DOI_REGISTERING
      valid = [STATE_DC_METADATA_UPLOADED].include?(state)

    when STATE_DC_DOI_REGISTERED
      valid = [STATE_DC_DOI_REGISTERING].include?(state)

    when STATE_PUBCHEM_REGISTERING
      valid = (element_type == 'Sample') && [STATE_DC_DOI_REGISTERED].include?(state)

    when STATE_PUBCHEM_REGISTERED
      valid = [STATE_PUBCHEM_REGISTERING].include?(state)

    when STATE_COMPLETING
      valid = if element_type == 'Sample'
                [STATE_PUBCHEM_REGISTERED].include?(state)
              else
                [STATE_DC_DOI_REGISTERED, STATE_COMPLETING].include?(state)
              end

    when STATE_COMPLETED
      valid = [STATE_COMPLETING].include?(state)
    end

    log_invalid_transition(to_state) unless valid
    valid
  end

  def log_invalid_transition(to_state)
    logger("CANNOT TRANSITION from #{state} to #{to_state}")
  end

  def logger(message_arr)
    message = [message_arr].flatten.join("\n")
    publication_logger.info(
      <<~INFO
      ******** MODE #{ENV['PUBLISH_MODE']}********
      Publication #{id}. STATE: #{state}: #{default_line}
      #{message}
      ********************************************************************************
      INFO
    )
  end
end
