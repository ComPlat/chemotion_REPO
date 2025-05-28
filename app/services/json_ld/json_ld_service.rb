# frozen_string_literal: true

require 'digest'
require 'zip'

module JsonLd
  class JsonLdService < BaseJsonLdService
    def initialize(base_url: nil)
      super(base_url: base_url)
    end

    # Generate publication data package with JSON-LD and attachments as zip
    def generate_data(publication, kinds: nil, tracking: false)
      # Generate JSON-LD using existing service
      service = JsonLd::PublicationJsonLdService.new(publication, kinds, tracking, base_url: @base_url)
      json_ld = service.generate

      # Get attachments for the publication's element
      attachments = get_publication_attachments(publication, kinds)

      # Create BagIt-compliant zip
      create_bagit_zip(publication, json_ld, attachments)
    end

    private

    def get_publication_attachments(publication, kinds = nil)
      attachments = []
      element = publication.element

      return attachments unless element

      case publication.element_type
      when 'Sample'
        collect_sample_attachments(element, attachments, kinds)
      when 'Reaction'
        collect_reaction_attachments(element, attachments, kinds)
      when 'Container'
        collect_container_attachments(element, attachments, kinds)
      when 'Collection'
        # Collection attachments handling if needed
      end

      attachments
    end

    def collect_sample_attachments(sample, attachments, kinds = nil)
      return unless sample&.analyses

      sample.analyses.each do |analysis|
        next unless analysis&.extended_metadata

        # If kinds is provided, filter by those kinds, otherwise include all
        if kinds
          next unless kinds.any? { |kind| analysis.extended_metadata['kind']&.include?(kind) }
        end

        analysis.children.each do |dataset|
          if dataset.respond_to?(:attachments)
            dataset.attachments.each do |attachment|
              attachments << {
                attachment: attachment,
                analysis_id: analysis.id,
                dataset_id: dataset.id
              }
            end
          end
        end
      end
    end

    def collect_reaction_attachments(reaction, attachments, kinds = nil)
      return unless reaction

      if reaction.respond_to?(:analyses)
        reaction.analyses.each do |analysis|
          next unless analysis&.extended_metadata

          # If kinds is provided, filter by those kinds, otherwise include all
          if kinds
            next unless kinds.any? { |kind| analysis.extended_metadata['kind']&.include?(kind) }
          end

          analysis.children.each do |dataset|
            if dataset.respond_to?(:attachments)
              dataset.attachments.each do |attachment|
                attachments << {
                  attachment: attachment,
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
          collect_sample_attachments(sample, attachments, kinds)
        end
      end
    end

    def collect_container_attachments(container, attachments, kinds = nil)
      return unless container&.children

      container.children.each do |dataset|
        if dataset.respond_to?(:attachments) && dataset.respond_to?(:container) && dataset.container.respond_to?(:containable) && dataset.container.containable.respond_to?(:id)
          # For containers, check if we need to filter by instrument kinds
          if kinds && dataset.container.respond_to?(:extended_metadata) && dataset.container.extended_metadata&.dig('kind')
            next unless kinds.any? { |kind| dataset.container.extended_metadata['kind']&.include?(kind) }
          end

          # For containers, we'll use the container's containable id as analysis_id
          dataset.attachments.each do |attachment|
            attachments << {
              attachment: attachment,
              analysis_id: dataset.container.containable.id,
              dataset_id: dataset.id
            }
          end
        end
      end
    end

    def create_bagit_zip(publication, json_ld, attachments)
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

        # Add attachments to data directory organized by analysis if any
        if attachments.any?
          attachments.each do |attachment_info|
            begin
              attachment = attachment_info[:attachment]
              analysis_id = attachment_info[:analysis_id]
              dataset_id = attachment_info[:dataset_id]

              next unless attachment&.filename

              attachment_content = attachment.read_file
              safe_filename = attachment.filename.gsub(/[^\w\-_\.]/, '_')
              attachment_path = "data/analyses/analysis_#{analysis_id}/dataset_#{dataset_id}/#{safe_filename}"

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
      # Group attachments by analysis for summary
      attachments_by_analysis = attachments.group_by { |att| att[:analysis_id] }

      readme_content = <<~README
        Publication Data Package (BagIt Format)
        ======================================

        This is a BagIt-compliant data package containing:
        - publication-metadata.jsonld: JSON-LD metadata for the publication
        #{attachments.any? ? generate_attachment_summary(attachments_by_analysis) : "- No attachment files"}

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
          #{attachments.any? ? "- analyses/: Folders organized by analysis ID containing dataset attachments" : ""}

        For more information about BagIt format, see: https://tools.ietf.org/html/rfc8493
      README

      zip.put_next_entry 'data/README.txt'
      zip.write readme_content
      bag_files << {
        path: 'data/README.txt',
        content: readme_content
      }
    end

    def generate_attachment_summary(attachments_by_analysis)
      summary = "- analyses/: Organized by analysis ID:\n"
      attachments_by_analysis.each do |analysis_id, attachments|
        datasets_count = attachments.group_by { |att| att[:dataset_id] }.keys.count
        files_count = attachments.count
        summary += "  - analysis_#{analysis_id}/: #{datasets_count} dataset(s) with #{files_count} file(s)\n"
      end
      summary
    end
  end
end
