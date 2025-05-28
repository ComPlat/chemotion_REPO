module Repo
  class VersionHandler
    def self.link_analyses(new_element, analyses_arr)
      unless new_element.container
        Container.create_root_container(containable: new_element)
        new_element.reload
      end
      analyses = Container.analyses_container(new_element.container.id).first

      analyses_arr&.each do |analysis|
        analysis_link = analyses.children.create(
          name: analysis.name,
          container_type: 'link',
          description: analysis.description
        )

        if analysis.container_type == 'link'
          analysis_link.extended_metadata = analysis.extended_metadata
        else
          analysis_link.extended_metadata = {
            target_id: analysis.id,
            target_type: analysis.container_type,
          }
        end
        analysis_link.save!
      end
    end

    def self.create_new_samples_version(sample, reaction, scheme_only, current_user = {})
      new_sample = sample.dup
      new_sample.previous_version = sample
      new_sample.collections << current_user.versions_collection
      new_sample.save!
      new_sample.copy_segments(segments: sample.segments, current_user_id: current_user.id) if sample.segments

      Repo::SubmissionApis.duplicate_literals(new_sample, sample.literals)

      ## TODO: check if this is correct ## Paggy
      # analyses = sample.analyses ? sample.analyses.or(sample.links) : sample.links
      ## *** ArgumentError Exception: Relation passed to #or must be structurally compatible. Incompatible values: [:joins]
      analyses = sample.analyses ? (sample.analyses.to_a + sample.links.to_a).uniq : sample.links

      Repo::VersionHandler.link_analyses(new_sample, analyses)

      new_sample.update_tag!(analyses_tag: true)

      sample.tag_as_previous_version(new_sample)
      new_sample.tag_as_new_version(sample)
      new_sample.update_versions_tag

      unless reaction.nil?
        new_sample.update_tag!(reaction_tag: reaction.id)

        if current_user.versions_collection.reactions.find_by(id: reaction.id).nil?
          # this sample will replace the old sample when beeing published
          new_sample.tag_replace_in_publication
        else
          # replace previous sample in reaction now
          reaction_sample = reaction.reactions_samples.find_by(sample_id: sample.id)
          reaction_sample.sample_id = new_sample.id
          reaction_sample.save!
        end
      end

      new_sample
    end

    def self.submit_new_sample_version(embargo_collection, publication_tag, author_ids, current_user, sample, parent_publication_id = nil)
      return unless ENV['REPO_VERSIONING'] == 'true'

      sample.collections.clear
      sample.collections << current_user.pending_collection
      sample.collections << Collection.element_to_review_collection
      sample.collections << embargo_collection unless embargo_collection.nil?
      sample.save!
      analyses = sample.analyses ? (sample.analyses.to_a + sample.links.to_a).uniq : sample.links
      if analyses.present?
        # create dois and publications for analyses
        sample.analyses.each do |analysis|

          # create doi, concept and concept doi
          doi = Doi.create_for_analysis!(analysis, sample.molecule.inchikey)

          # create or update concept
          previous_version = analysis.extended_metadata['previous_version_id']
          previous_publication = Publication.find_by(element_type: 'Container', element_id: previous_version)

          if previous_publication.nil?
            concept = Concept.create_for_doi!(doi)
          else
            concept = previous_publication.concept
            concept.update_for_doi!(doi)
          end

          # # create doi for analysis
          # if (doi = analysis.doi)
          #   doi.update(doiable: analysis)
          # else
          #   doi = Doi.create_for_analysis!(analysis, sample.molecule.inchikey)
          # end

          # create publication for analyses
          Publication.create!(
            state: Publication::STATE_PENDING,
            element: analysis,
            published_by: current_user.id,
            doi: doi,
            concept: concept,
            taggable_data: publication_tag.merge(
              author_ids: author_ids
            )
          )
          # update the concept with the taggable_data from the publication
          concept.update_tag

        end

        # create doi for sample
        doi = Doi.create_for_element!(sample)

        # update concept
        previous_version = sample.tag.taggable_data['previous_version']['id']
        previous_publication = Publication.find_by(element_type: 'Sample', element_id: previous_version)
        previous_publication.concept.update_for_doi!(doi)

        # if (doi = sample.doi)
        #   doi.update!(doiable: sample)
        # else
        #   doi = Doi.create_for_element!(sample)
        # end

        # create publication for sample
        publication = Publication.create!(
          state: Publication::STATE_PENDING,
          element: sample,
          published_by: current_user.id,
          doi: doi,
          concept: previous_publication.concept,
          parent_id: parent_publication_id,
          taggable_data: publication_tag.merge(
            author_ids: author_ids,
            analysis_ids: sample.analyses.pluck(:id)
          )
        )
        # update the concept with the taggable_data from the publication
        previous_publication.concept.update_tag
      end
      sample.analyses.each do |analysis|
        Publication.find_by(element: analysis).update(parent: publication)
      end
      sample
    end

    def self.create_new_reactions_version(reaction, parent, scheme_only, current_user = {})
      new_reaction = reaction.dup
      new_reaction.previous_version = reaction
      new_reaction.collections << current_user.versions_collection
      new_reaction.save!
      new_reaction.copy_segments(segments: reaction.segments, current_user_id: current_user.id)
      Repo::SubmissionApis.duplicate_literals(new_reaction, reaction.literals)

      dir = File.join(Rails.root, 'public', 'images', 'reactions')
      rsf = reaction.reaction_svg_file
      path = File.join(dir, rsf)
      new_rsf = "#{Time.now.to_i}-#{rsf}"
      dest = File.join(dir, new_rsf)
      if File.exists? path
        FileUtils.cp(path, dest)
        new_reaction.update_columns(reaction_svg_file: new_rsf)
      end

      Repo::VersionHandler.link_analyses(new_reaction, reaction.analyses)

      new_reaction.update_tag!(analyses_tag: true)

      reaction.tag_as_previous_version(new_reaction)
      new_reaction.tag_as_new_version(reaction, scheme_only: scheme_only)
      new_reaction.update_versions_tag

      reaction.reactions_samples.each  do |reaction_sample|
        # look for the sample in the public collection or the scheme only reactions collection
        unless scheme_only
          sample = Collection.public_collection.samples.find_by(id: reaction_sample.sample_id, created_by: current_user.id)
        else
          sample = Collection.scheme_only_reactions_collection.samples.find_by(id: reaction_sample.sample_id, created_by: current_user.id)
        end
        next unless sample

        # duplicate the reaction_sample object
        new_reaction_sample = reaction_sample.dup

        # check if new versions of the sample have already been created
        # if yes, use the *last* sample version for the new reaction_sample
        unless sample&.tag&.taggable_data['versions'].nil?
          last_sample_version_id = sample&.tag&.taggable_data['versions'].max()
          if last_sample_version_id > sample.id
            last_sample_version = Sample.find_by(id: last_sample_version_id)
            last_sample_version.update_tag!(reaction_tag: new_reaction.id)
            last_sample_version.untag_replace_in_publication

            new_reaction_sample.sample_id = last_sample_version_id
          end
        end

        # update the new reaction sample instance
        new_reaction_sample.reaction_id = new_reaction.id
        new_reaction_sample.save!

        # remove sample from versions collection again, overriding the behaviour in ReactionSampleCollections
        collections_sample = CollectionsSample.find_by(sample: sample, collection: current_user.versions_collection)
        collections_sample.delete unless collections_sample.nil?
      end

      new_reaction.update_svg_file!
      new_reaction.reload
      new_reaction.save!
      new_reaction.reload
      new_reaction
    end

    def self.submit_new_reaction_version(embargo_collection, publication_tag, author_ids, current_user, reaction)
      return unless ENV['REPO_VERSIONING'] == 'true'

      reaction.collections.clear
      reaction.collections << current_user.pending_collection
      reaction.collections << Collection.element_to_review_collection
      reaction.collections << embargo_collection unless embargo_collection.nil?
      reaction.save!

      princhi_string, princhi_long_key, princhi_short_key, princhi_web_key = reaction.products_rinchis

      # create dois and publications for analyses
      reaction.analyses.each do |analysis|
        # create doi for analysis
        # create doi, concept and concept doi
        doi = Doi.create_for_analysis!(analysis)

        # create or update concept
        previous_version = analysis.extended_metadata['previous_version_id']
        previous_publication = Publication.find_by(element_type: 'Container', element_id: previous_version)

        if previous_publication.nil?
          concept = Concept.create_for_doi!(doi)
        else
          concept = previous_publication.concept
          concept.update_for_doi!(doi)
        end


        # if (doi = analysis.doi)
        #   doi.update(doiable: analysis)
        # else
        #   doi = Doi.create_for_analysis!(analysis)
        # end

        # create publication for analyses
        Publication.create!(
          state: Publication::STATE_PENDING,
          element: analysis,
          published_by: current_user.id,
          doi: doi,
          concept: concept,
          taggable_data: publication_tag.merge(
            author_ids: author_ids
          )
        )

        # update the concept with the taggable_data from the publication
        concept.update_tag
      end

      # create doi for reaction
      doi = Doi.create_for_element!(reaction)

      # update concept
      previous_version = reaction.tag.taggable_data['previous_version']['id']
      previous_publication = Publication.find_by(element_type: 'Reaction', element_id: previous_version)
      previous_publication.concept.update_for_doi!(doi)

      # if (doi = reaction.doi)
      #   doi.update!(doiable: reaction)
      # else
      #   doi = Doi.create_for_element!(reaction)
      # end

      # create publication for reaction
      publication = Publication.create!(
        state: Publication::STATE_PENDING,
        element: reaction,
        published_by: current_user.id,
        doi: doi,
        concept: previous_publication.concept,
        taggable_data: publication_tag.merge(
          author_ids: author_ids,
          products_rinchi: {
            rinchi_string: princhi_string,
            rinchi_long_key: princhi_long_key,
            rinchi_short_key: princhi_short_key,
            rinchi_web_key: princhi_web_key
          }
        )
      )

      # update the concept with the taggable_data from the publication
      previous_publication.concept.update_tag

      reaction.analyses.each do |analysis|
        Publication.find_by(element: analysis).update(parent: publication)
      end

      reaction.reactions_samples.each  do |reaction_sample|
        # check if this sample is a new version of a sample
        new_sample_version = current_user.versions_collection.samples.find_by(id: reaction_sample.sample_id)
        if new_sample_version
          Repo::VersionHandler.submit_new_sample_version(embargo_collection, publication_tag, author_ids, current_user, new_sample_version, parent_publication_id = publication.id)
        end
      end
      reaction
    end

    def self.create_new_containers_version(element, analysis, link, current_user = {})
      analyses = Container.analyses_container(element.container.id).first

      previous_doi = Doi.find_by(doiable_type: 'Container', doiable_id: analysis.id)

      new_analysis = analyses.children.create(
        name: analysis.name,
        container_type: analysis.container_type,
        description: analysis.description
      )
      new_analysis.extended_metadata = analysis.extended_metadata
      new_analysis.extended_metadata[:previous_version_id] = analysis.id
      new_analysis.extended_metadata[:previous_version_doi_id] = previous_doi.id
      new_analysis.save!

      new_analysis.update_versions

      # duplicate datasets and copy attachments
      analysis.children.where(container_type: 'dataset').each do |dataset|
        new_dataset = new_analysis.children.create(container_type: 'dataset')
        new_dataset.name = dataset.name
        new_dataset.extended_metadata = dataset.extended_metadata
        new_dataset.save!
        new_dataset.copy_dataset(dataset)
        clone_attachs = dataset.attachments
        Usecases::Attachments::Copy.execute!(clone_attachs, new_dataset, current_user.id) if clone_attachs.present?

        # new_dataset = new_analysis.children.create(container_type: 'dataset')
        # dataset.attachments.each do |attachment|
        #   new_attachment = attachment.copy(
        #     attachable_type: 'Container',
        #     attachable_id: new_dataset.id,
        #     transferred: true
        #   )
        #   new_attachment.save!
        #   new_dataset.attachments << new_attachment
        #   # copy publication image file to public/images/publications/{attachment.id}/{attachment.filename}
        #   if MimeMagic.by_path(new_attachment.filename)&.type&.start_with?('image')
        #     file_path = File.join('public/images/publications/', new_attachment.id.to_s, '/', new_attachment.filename)
        #     public_path = File.join('public/images/publications/', new_attachment.id.to_s)
        #     FileUtils.mkdir_p(public_path)
        #     File.write(file_path, new_attachment.store.read_file.force_encoding('utf-8')) if new_attachment.store.file_exist?
        #   end
        # end

        # new_dataset.name = dataset.name
        # new_dataset.extended_metadata = dataset.extended_metadata
        # new_dataset.save!
      end
      # byebug
      Container.destroy(link.id)
      new_analysis
    # rescue StandardError => e
    #   log_exception(e, method: __method__)
    #   raise e
    end
  end
end