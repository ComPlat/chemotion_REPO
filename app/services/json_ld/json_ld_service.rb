# frozen_string_literal: true

require 'digest'
require 'zip'

module JsonLd
  class JsonLdService < BaseJsonLdService
    def initialize
    end

    # Generate publication data package with JSON-LD and attachments as zip
    def generate_data(publication)
      # Generate JSON-LD using existing service
      service = JsonLd::PublicationJsonLdService.new(publication)
      json_ld = service.generate
      nmr_json_ld = service.generate(kinds: ['NMR'])
      ms_json_ld = service.generate(kinds: ['MS'])

      # Get attachments for the publication's element
      attachments = get_publication_attachments(publication)

      # Create BagIt-compliant zip
      create_bagit_zip(publication, json_ld, nmr_json_ld, ms_json_ld, attachments)
    end

    private

    def get_publication_attachments(publication)
      attachments = []
      element = publication.element

      return attachments unless element

      case publication.element_type
      when 'Sample'
        collect_sample_attachments(element, attachments)
      when 'Reaction'
        collect_reaction_attachments(element, attachments)
      when 'Container'
        collect_container_attachments(element, attachments)
      when 'Collection'
        # Collection attachments handling if needed
      end

      attachments
    end

    def collect_sample_attachments(sample, attachments)
      return unless sample&.analyses

      sample.analyses.each do |analysis|
        next unless analysis&.extended_metadata

        analysis.children.each do |dataset|
          if dataset.respond_to?(:attachments)
            dataset.attachments.each do |attachment|
              attachments << {
                attachment: attachment,
                sample_id: sample.id,
                analysis_id: analysis.id,
                dataset_id: dataset.id
              }
            end
          end
        end
      end
    end

    def collect_reaction_attachments(reaction, attachments)
      return unless reaction

      if reaction.respond_to?(:analyses)
        reaction.analyses.each do |analysis|
          next unless analysis&.extended_metadata

          analysis.children.each do |dataset|
            if dataset.respond_to?(:attachments)
              dataset.attachments.each do |attachment|
                attachments << {
                  attachment: attachment,
                  reaction_id: reaction.id, # Mark as reaction-level analysis
                  analysis_id: analysis.id,
                  dataset_id: dataset.id
                }
              end
            end
          end
        end
      end

      if reaction.respond_to?(:samples)
        reaction.samples.each do |sample|
          collect_sample_attachments(sample, attachments)
        end
      end
    end

    def collect_container_attachments(container, attachments)
      return unless container&.children

      container.children.each do |dataset|
        if dataset.respond_to?(:attachments) && dataset.respond_to?(:container) && dataset.container.respond_to?(:containable) && dataset.container.containable.respond_to?(:id)

          # For containers, we'll use the container's containable id as both sample_id and analysis_id
          dataset.attachments.each do |attachment|
            attachments << {
              attachment: attachment,
              sample_id: dataset.container.containable.id,
              analysis_id: dataset.container.containable.id,
              dataset_id: dataset.id
            }
          end
        end
      end
    end

    def create_bagit_zip(publication, json_ld, nmr_json_ld, ms_json_ld, attachments)
      Zip::OutputStream.write_buffer do |zip|
        bag_files = []

        # BagIt declaration file
        zip.put_next_entry 'bagit.txt'
        bagit_declaration = "BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n"
        zip.write bagit_declaration

        # Add JSON-LD file to data directory
        json_ld_content = JSON.pretty_generate(json_ld)
        zip.put_next_entry 'data/publication-metadata.json'
        zip.write json_ld_content
        bag_files << {
          path: 'data/publication-metadata.json',
          content: json_ld_content
        }

        # Add NMR JSON-LD file to data directory
        nmr_json_ld_content = JSON.pretty_generate(nmr_json_ld)
        zip.put_next_entry 'data/nmr-metadata.json'
        zip.write nmr_json_ld_content
        bag_files << {
          path: 'data/nmr-metadata.json',
          content: nmr_json_ld_content
        }

        # Add MS JSON-LD file to data directory
        ms_json_ld_content = JSON.pretty_generate(ms_json_ld)
        zip.put_next_entry 'data/ms-metadata.json'
        zip.write ms_json_ld_content
        bag_files << {
          path: 'data/ms-metadata.json',
          content: ms_json_ld_content
        }

        # Add attachments to data directory organized by sample or reaction, then analysis, then dataset
        if attachments.any?
          attachments.each do |attachment_info|
            begin
              attachment = attachment_info[:attachment]
              sample_id = attachment_info[:sample_id]
              reaction_id = attachment_info[:reaction_id]
              analysis_id = attachment_info[:analysis_id]
              dataset_id = attachment_info[:dataset_id]

              next unless attachment&.filename

              attachment_content = attachment.read_file
              safe_filename = attachment.filename.gsub(/[^\w\-_\.]/, '_')

              # Determine path based on whether it's a reaction or sample
              if reaction_id
                attachment_path = "data/reaction_#{reaction_id}/analysis_#{analysis_id}/dataset_#{dataset_id}/#{safe_filename}"
              else
                attachment_path = "data/sample_#{sample_id}/analysis_#{analysis_id}/dataset_#{dataset_id}/#{safe_filename}"
              end

              zip.put_next_entry attachment_path
              zip.write attachment_content
              bag_files << {
                path: attachment_path,
                content: attachment_content
              }
            rescue => e
              Rails.logger.error "Failed to add attachment #{attachment&.filename || 'unknown'}: #{e.message}"
              # Continue with other attachments
            end
          end
        end

        # Generate manifest-md5.txt
        generate_bagit_manifest(zip, bag_files)

        # Generate bag-info.txt
        generate_bagit_info(zip, publication, bag_files)

        # Add README
        add_bagit_readme(zip, publication, attachments, bag_files)

        # Update manifest with README
        generate_bagit_manifest(zip, bag_files)
      end
    end

    def generate_bagit_manifest(zip, bag_files)
      zip.put_next_entry 'manifest-md5.txt'
      manifest_content = bag_files.map do |file|
        md5_hash = Digest::MD5.hexdigest(file[:content])
        "#{md5_hash}  #{file[:path]}"
      end.join("\n") + "\n"
      zip.write manifest_content
    end

    def generate_bagit_info(zip, publication, bag_files)
      zip.put_next_entry 'bag-info.txt'
      bag_info = <<~BAGINFO
        Bag-Software-Agent: Chemotion Repository
        Bagging-Date: #{Time.current.strftime('%Y-%m-%d')}
        Payload-Oxum: #{bag_files.sum { |f| f[:content].bytesize }}.#{bag_files.count}
        Source-Organization: Chemotion Repository
        Contact-Name: Chemotion Repository
        External-Description: Publication data package containing JSON-LD metadata and associated files
        External-Identifier: publication-#{publication.id}
        Internal-Sender-Identifier: #{publication.id}
        Internal-Sender-Description: Publication ID #{publication.id} (#{publication.element_type})
      BAGINFO
      zip.write bag_info
    end

    def add_bagit_readme(zip, publication, attachments, bag_files)
      # Group attachments by sample and reaction for summary
      attachments_by_sample = attachments.select { |att| att[:sample_id] }.group_by { |att| att[:sample_id] }
      attachments_by_reaction = attachments.select { |att| att[:reaction_id] }.group_by { |att| att[:reaction_id] }

      readme_content = <<~README
        Publication Data Package (BagIt Format)
        ======================================

        This is a BagIt-compliant data package containing:
        - publication-metadata.jsonld: JSON-LD metadata for the publication
        #{attachments.any? ? generate_attachment_summary(attachments_by_sample, attachments_by_reaction) : "- No attachment files"}

        Publication Details:
        - Publication ID: #{publication.id}
        - Element Type: #{publication.element_type}
        - Element ID: #{publication.element_id}
        - Generated: #{Time.current.iso8601}
        - Source: Chemotion Repository

        BagIt Structure:
        - bagit.txt: BagIt declaration
        - manifest-md5.txt: MD5 checksums for payload files
        - bag-info.txt: Bag metadata
        - data/: Payload directory containing actual data files
          - publication-metadata.jsonld: Main metadata file
          #{attachments.any? ? "- sample_*/reaction_*/: Folders organized by sample/reaction ID containing analysis and dataset attachments" : ""}

        For more information about BagIt format, see: https://tools.ietf.org/html/rfc8493
      README

      zip.put_next_entry 'data/README.txt'
      zip.write readme_content
      bag_files << {
        path: 'data/README.txt',
        content: readme_content
      }
    end

    def generate_attachment_summary(attachments_by_sample, attachments_by_reaction)
      summary = ""

      if attachments_by_sample.any?
        summary += "- Samples with attachments:\n"
        attachments_by_sample.each do |sample_id, sample_attachments|
          analyses_by_id = sample_attachments.group_by { |att| att[:analysis_id] }
          total_files = sample_attachments.count
          summary += "  - sample_#{sample_id}/: #{analyses_by_id.keys.count} analysis(es) with #{total_files} file(s)\n"

          analyses_by_id.each do |analysis_id, analysis_attachments|
            datasets_count = analysis_attachments.group_by { |att| att[:dataset_id] }.keys.count
            files_count = analysis_attachments.count
            summary += "    - analysis_#{analysis_id}/: #{datasets_count} dataset(s) with #{files_count} file(s)\n"
          end
        end
      end

      if attachments_by_reaction.any?
        summary += "- Reactions with attachments:\n"
        attachments_by_reaction.each do |reaction_id, reaction_attachments|
          analyses_by_id = reaction_attachments.group_by { |att| att[:analysis_id] }
          total_files = reaction_attachments.count
          summary += "  - reaction_#{reaction_id}/: #{analyses_by_id.keys.count} analysis(es) with #{total_files} file(s)\n"

          analyses_by_id.each do |analysis_id, analysis_attachments|
            datasets_count = analysis_attachments.group_by { |att| att[:dataset_id] }.keys.count
            files_count = analysis_attachments.count
            summary += "    - analysis_#{analysis_id}/: #{datasets_count} dataset(s) with #{files_count} file(s)\n"
          end
        end
      end

      summary
    end
  end
end
