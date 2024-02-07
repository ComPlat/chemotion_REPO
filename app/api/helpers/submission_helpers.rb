# frozen_string_literal: true

# A helper for submission
module SubmissionHelpers
  extend Grape::API::Helpers

  def ols_validation(analyses)
    analyses.each do |ana|
      error!('analyses check fail', 404) if (ana.extended_metadata['kind'].match /^\w{3,4}\:\d{6,7}\s\|\s\w+/).nil?
    end
  end

  def coauthor_validation(coauthors)
    coauthor_ids = []
    coauthors&.each do |coa|
      val = coa.strip
      usr = User.where(type: %w[Person Collaborator]).where.not(confirmed_at: nil).where('id = ? or email = ?', val.to_i, val.to_s).first
      error!('invalid co-author: ' + val.to_s, 404) if usr.nil?
      coauthor_ids << usr.id
    end
    coauthor_ids
  end


  def update_tag_doi(element)
    unless element.nil? || element&.doi.nil? || element&.tag.nil?
      mds = Datacite::Mds.new
      et = element.tag
      tag_data = (et.taggable_data && et.taggable_data['publication']) || {}
      tag_data['doi'] = "#{mds.doi_prefix}/#{element&.doi.suffix}"
      et.update!(
        taggable_data: (et.taggable_data || {}).merge(publication: tag_data)
      )
      if element&.class&.name == 'Reaction'
        element&.publication.children.each do |child|
          next unless child&.element&.class&.name == 'Sample'

          update_tag_doi(child.element)
        end
      end
    end
  end

  def accept_new_sample(root, sample)
    pub_s = Publication.create!(
      state: Publication::STATE_PENDING,
      element: sample,
      doi: sample&.doi,
      published_by: root.published_by,
      parent: root,
      taggable_data: root.taggable_data
    )
    sample.analyses.each do |sa|
      accept_new_analysis(pub_s, sa)
    end
  end

  def accept_new_analysis(root, analysis, nil_analysis = true)
    if nil_analysis
      ap = Publication.create!(
        state: Publication::STATE_PENDING,
        element: analysis,
        doi: analysis.doi,
        published_by: root.published_by,
        parent: root,
        taggable_data: root.taggable_data
      )
      atag = ap.taggable_data
      aids = atag&.delete('analysis_ids')
      aoids = atag&.delete('original_analysis_ids')
      ap.save! if aids || aoids
    end
    analysis.children.where(container_type: 'dataset').each do |ds|
      ds.attachments.each do |att|
        if MimeMagic.by_path(att.filename)&.type&.start_with?('image')
          file_path = File.join('public/images/publications/', att.id.to_s, '/', att.filename)
          public_path = File.join('public/images/publications/', att.id.to_s)
          FileUtils.mkdir_p(public_path)
          File.write(file_path, att.read_file.force_encoding("utf-8"))
        end
      end
    end
  end

  def public_literature(root_publication)
    publications = [root_publication] + root_publication.descendants
    publications.each do |pub|
      next unless pub.element_type == 'Reaction' || pub.element_type == 'Sample'
      literals = Literal.where(element_type: pub.element_type, element_id: pub.element_id)
      literals&.each { |l| l.update_columns(category: 'public') } unless literals.nil?
    end
  end

  def element_submit(root)
    root.descendants.each { |np| np.destroy! if np.element.nil? }
    root.element.reserve_suffix
    root.element.reserve_suffix_analyses(root.element.analyses) if root.element.analyses&.length > 0
    root.element.analyses&.each do |a|
      accept_new_analysis(root, a, Publication.find_by(element: a).nil?)
    end
    case root.element_type
    when 'Sample'
      analyses_ids = root.element.analyses.pluck(:id)
      root.update!(taggable_data: root.taggable_data.merge(analysis_ids: analyses_ids))
      root.element.analyses.each do |sa|
        accept_new_analysis(root, sa, Publication.find_by(element: sa).nil?)
      end

    when 'Reaction'
      root.element.products.each do |pd|
        Publication.find_by(element_type: 'Sample', element_id: pd.id)&.destroy! if pd.analyses&.length == 0
        next if pd.analyses&.length == 0
        pd.reserve_suffix
        pd.reserve_suffix_analyses(pd.analyses)
        pd.reload
        prod_pub = Publication.find_by(element: pd)
        if prod_pub.nil?
          accept_new_sample(root, pd)
        else
          pd.analyses.each do |rpa|
            accept_new_analysis(prod_pub, rpa, Publication.find_by(element: rpa).nil?)
          end
        end
      end
    end
    root.reload
    root.update_columns(doi_id: root.element.doi.id) unless root.doi_id == root.element.doi.id
    root.descendants.each { |pub_a|
      next if pub_a.element.nil?
      pub_a.update_columns(doi_id: pub_a.element.doi.id) unless pub_a.doi_id == pub_a.element&.doi&.id
    }
    update_tag_doi(root.element)
  end

end
