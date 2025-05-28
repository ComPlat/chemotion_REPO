# frozen_string_literal: true

module Repo
  class ConceptHandler
    def self.init_concept
      # states = ['pending', 'reviewed', 'accepted', 'completed', 'pubchem_registering']
      no_states = %w[withdrawn deleted retracted declined]
      dir = Rails.root.join('paggy/concept').to_s
      !File.directory?(dir) && FileUtils.mkdir_p(dir)
      log_path = Rails.root.join('paggy', 'concept', "init_concept_#{DateTime.now.strftime('%Y_%m_%d_%H_%M')}.txt").to_s

      File.open(log_path, 'a') do |log_file|
        # Eager load associations to reduce database queries
        root_publications = Publication.includes(:doi)
                                       .where(ancestry: nil)
                                       .where.not(state: no_states)
        # Process in batches to reduce memory usage
        root_publications.find_each(batch_size: 100) do |root|
          next if root.element_type == 'Collection'

          log_file.write("----- root type:#{root.element_type}, id:#{root.element_id} \n")

          # Load all descendants in one query with preloaded associations
          all_pubs = [root] + root.descendants.includes(:doi)

          # Group publications by concept requirement for batch processing
          publications_to_process = all_pubs.select { |pub| pub.concept_id.blank? && !no_states.include?(pub.state) }

          log_file.write("Found #{publications_to_process.size} publications requiring concept processing\n")

          if publications_to_process.empty?
            log_file.write("No publications to process for this root, continuing to next\n")
            next
          end

          # Preload elements and their associations to avoid N+1 queries
          elements_by_pub_id = preload_elements(publications_to_process)

          publications_to_process.each do |pub|
            doi = pub.doi
            element = elements_by_pub_id[pub.id]

            if doi.nil? || element.nil?
              log_file.write("Error....doi.nil?:#{doi&.id}, element.nil?:#{element&.id} \n")
              next
            end

            if doi.doiable != element
              log_file.write("doi.doiable does not match, element.id:#{element.id}, doi.id:#{doi.id}, doiable:#{doi.doiable} \n")
              next
            end

            # Process based on element type with optimized lookups
            concept = process_publication_by_type(pub, element, doi, log_file)

            pub.concept_id = concept.id if concept
          end

          # Batch update the concept_ids
          update_concept_ids(publications_to_process.select(&:concept_id), log_file)
        end
      end
    end

    def self.preload_elements(publications)
      # Logic to efficiently load all elements for the publications
      element_ids_by_type = publications.group_by(&:element_type).transform_values do |pubs|
        pubs.map(&:element_id)
      end

      elements_by_pub_id = {}
      element_ids_by_type.each do |type, ids|
        klass = type.constantize
        klass.where(id: ids).find_each do |element|
          pub = publications.find { |p| p.element_type == type && p.element_id == element.id }
          elements_by_pub_id[pub.id] = element if pub
        end
      end

      elements_by_pub_id
    end

    def self.process_publication_by_type(pub, element, doi, log_file)
      case pub.element_type
      when 'Container'
        process_container(element, doi, log_file)
      when 'Sample', 'Reaction'
        process_sample_or_reaction(pub, element, doi, log_file)
      end
    end

    def self.process_container(element, doi, _log_file)
      return unless ENV['REPO_VERSIONING'] == 'true'

      previous_version = element.extended_metadata['previous_version_id']
      if previous_version.nil?
        Concept.create_for_doi!(doi)
      else
        previous_publication = Publication.find_by(element_type: 'Container', element_id: previous_version)
        concept = previous_publication.concept
        concept.update_for_doi!(doi)
        concept
      end
    end

    def self.process_sample_or_reaction(pub, element, doi, _log_file)
      return unless ENV['REPO_VERSIONING'] == 'true'

      previous_version = element.tag.taggable_data.dig('previous_version', 'id')
      if previous_version.nil?
        Concept.create_for_doi!(doi)
      else
        previous_publication = Publication.find_by(element_type: pub.element_type, element_id: previous_version)
        concept = previous_publication.concept
        concept.update_for_doi!(doi)
        concept
      end
    end

    def self.update_concept_ids(publications, log_file)
      return if publications.empty?

      log_file.write("Updating concept_ids for #{publications.size} publications\n")

      # Use bulk update to minimize database calls
      publications.each_slice(100) do |batch|
        updates = batch.map { |pub| [pub.id, pub.concept_id] }
        pub_ids = updates.map(&:first)

        case_statement = "concept_id = CASE #{updates.map do |id, concept_id|
                                                "WHEN id = #{id} THEN #{concept_id}"
                                              end.join(' ')} END"
        Publication.where(id: pub_ids).update_all(case_statement)
      rescue StandardError => e
        log_file.write("ERROR in update_concept_ids: #{e.message}\n")
        log_file.write("#{e.backtrace.join("\n")}\n")
        raise
      end
    end
  end
end
