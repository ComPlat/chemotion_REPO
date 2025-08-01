# frozen_string_literal: true

require 'digest'
require 'zip'

# Standalone service for generating publication zip files
class PublicationZipService
  attr_reader :publication, :error, :logger

  def initialize(publication)
    @publication = publication
    app_host = Rails.application.routes.default_url_options[:host] rescue nil
    app_port = Rails.application.routes.default_url_options[:port] rescue nil
    app_protocol = Rails.application.config.force_ssl ? 'https' : 'http'
    @error = nil
    @logger = Logger.new(File.join(Rails.root, 'log', 'publication_zip.log'))
  end

  # Generate and save publication zip file
  def generate_zip(kinds: nil, tracking: false)
    generate_and_save_zip
  end

  # Generate and save publication zip file
  def generate_and_save_zip
    @logger.info("[ZIP_GENERATION_START] Publication: #{@publication.id}")

    begin
      # For Collections, bundle existing zip files instead of generating JSON-LD
      if @publication.element_type == 'Collection'
        zip_data = generate_collection_bundle
        return error_result('Failed to generate collection bundle') unless zip_data
        @logger.info("[COLLECTION_BUNDLE_SUCCESS] Collection bundle generated - Size: #{zip_data.size} bytes")
      else
        # Generate publication data using existing JsonLd service for Sample/Reaction
        zip_data = generate_publication_data
        return error_result('Failed to generate publication data') unless zip_data
        @logger.info("[DATA_GENERATION_SUCCESS] Publication data generated - Size: #{zip_data.size} bytes")
      end
      # Generate the target file path
      file_path = generate_file_path
      return error_result('Failed to generate file path') unless file_path

      # Ensure directory structure exists
      ensure_directory_structure(file_path)

      # Save zip file to the target location
      saved_path = save_zip_file(zip_data, file_path)
      return error_result('Failed to save zip file') unless saved_path

      @logger.info("[ZIP_SAVE_SUCCESS] Zip file saved - Path: #{saved_path}, Size: #{File.size(saved_path)} bytes")

      success_result(saved_path)

    rescue StandardError => e
      @logger.error("[ZIP_GENERATION_ERROR] Error occurred - Publication: #{@publication.id}")
      @logger.error("Zip generation error: #{e.message}")
      @logger.error(e.backtrace.join("\n"))

      error_result("Zip generation service error: #{e.message}")
    end
  end

  private

  def base_directory
    case @publication.element_type&.downcase
    when 'sample'
      Rails.public_path.join('zip/samples')
    when 'reaction'
      Rails.public_path.join('zip/reactions')
    when 'collection'
      Rails.public_path.join('zip/collections')
    else
      # Default fallback to reactions for backward compatibility
      Rails.public_path.join('zip/others')
    end
  end

  def generate_publication_data
    begin
      service = JsonLd::JsonLdService.new
      service.generate_data(@publication)
    rescue StandardError => e
      @logger.error("[DATA_GENERATION_ERROR] Failed to generate publication data - Publication: #{@publication.id}")
      @logger.error("Data generation error: #{e.message}")
      @logger.error(e.backtrace.join("\n"))
      nil
    end
  end

  def generate_collection_bundle
    begin
      collection = @publication.element
      return nil unless collection

      zip_files = []
      # Collect zip files from collection's samples
      if collection.respond_to?(:samples)
        collection.samples.each do |sample|
          sample_pub = Publication.find_by(element_type: 'Sample', element_id: sample.id, state: 'completed', ancestry: nil)
          if sample_pub && sample_pub.zip_file_path && File.exist?(sample_pub.zip_file_path)
            zip_files << { path: sample_pub.zip_file_path, name: "sample_#{sample.id}.zip" }
            @logger.debug("[COLLECTION_ZIP] Found sample zip: #{sample_pub.zip_file_path}")
          end
        end
      end

      # Collect zip files from collection's reactions
      if collection.respond_to?(:reactions)
        collection.reactions.each do |reaction|
          reaction_pub = Publication.find_by(element_type: 'Reaction', element_id: reaction.id, state: 'completed', ancestry: nil)
          if reaction_pub && reaction_pub.zip_file_path && File.exist?(reaction_pub.zip_file_path)
            zip_files << { path: reaction_pub.zip_file_path, name: "reaction_#{reaction.id}.zip" }
            @logger.debug("[COLLECTION_ZIP] Found reaction zip: #{reaction_pub.zip_file_path}")
          end
        end
      end

      @logger.info("[COLLECTION_ZIP] Found #{zip_files.size} zip files to bundle")

      return nil if zip_files.empty?

      # Create a BagIt-compliant zip file containing all the collected zip files
      manifest_entries = []

      Zip::OutputStream.write_buffer do |zip|
        # Add BagIt declaration file
        bagit_content = "BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n"
        zip.put_next_entry('bagit.txt')
        zip.write(bagit_content)

        # Add README explaining the collection structure
        readme_content = generate_collection_readme(collection, zip_files)
        readme_data = readme_content.encode('UTF-8')
        zip.put_next_entry('data/README.txt')
        zip.write(readme_data)
        manifest_entries << { name: 'data/README.txt', checksum: Digest::MD5.hexdigest(readme_data) }

        # Add all collected zip files to the data directory
        zip_files.each do |zip_file|
          file_content = File.binread(zip_file[:path])
          entry_name = "data/#{zip_file[:name]}"

          zip.put_next_entry(entry_name)
          zip.write(file_content)

          # Calculate MD5 checksum for manifest
          checksum = Digest::MD5.hexdigest(file_content)
          manifest_entries << { name: entry_name, checksum: checksum }

          @logger.debug("[COLLECTION_ZIP] Added to bag: #{entry_name} (MD5: #{checksum})")
        end

        # Create manifest-md5.txt
        manifest_content = manifest_entries.map { |entry| "#{entry[:checksum]}  #{entry[:name]}" }.join("\n") + "\n"
        zip.put_next_entry('manifest-md5.txt')
        zip.write(manifest_content)

        # Create bag-info.txt with collection metadata
        bag_info_content = generate_bag_info(collection, zip_files.size)
        zip.put_next_entry('bag-info.txt')
        zip.write(bag_info_content)

        @logger.info("[COLLECTION_ZIP] Created BagIt-compliant collection bundle with #{zip_files.size} items")
      end
    rescue StandardError => e
      @logger.error("[COLLECTION_BUNDLE_ERROR] Failed to generate collection bundle - Publication: #{@publication.id}")
      @logger.error("Collection bundle error: #{e.message}")
      @logger.error(e.backtrace.join("\n"))
      nil
    end
  end

  def generate_collection_readme(collection, zip_files)
    readme = []
    readme << "Collection BagIt Package"
    readme << "=" * 80
    readme << ""
    readme << "Collection ID: #{collection.id}"
    readme << "Collection Label: #{collection.label}" if collection.respond_to?(:label)
    readme << "Publication ID: #{@publication.id}"
    readme << "Publication DOI: #{@publication.doi}" if @publication.doi.present?
    readme << "Created: #{Time.current.utc.iso8601}"
    readme << ""
    readme << "This BagIt package contains published data from a collection."
    readme << "Each included file is a BagIt-compliant package containing published samples or reactions."
    readme << ""
    readme << "Contents:"
    readme << "-" * 80

    zip_files.each do |zip_file|
      readme << "  #{zip_file[:name]}"
    end

    readme << ""
    readme << "For more information about BagIt format, see: https://tools.ietf.org/html/rfc8493"
    readme << ""

    readme.join("\n")
  end

  def generate_bag_info(collection, item_count)
    bag_info = []
    bag_info << "Source-Organization: Chemotion Repository"
    bag_info << "Organization-Address: #{ENV['PUBLIC_URL']}" if ENV['PUBLIC_URL'].present?
    bag_info << "Contact-Name: Chemotion Repository"
    bag_info << "Bagging-Date: #{Time.current.utc.strftime('%Y-%m-%d')}"
    bag_info << "Bag-Software-Agent: Chemotion ELN PublicationZipService"
    bag_info << "Payload-Oxum: 0.#{item_count + 1}"  # Will be recalculated by validator if needed
    bag_info << "Collection-ID: #{collection.id}"
    bag_info << "Collection-Label: #{collection.label}" if collection.respond_to?(:label)
    bag_info << "Publication-ID: #{@publication.id}"
    bag_info << "Publication-DOI: #{@publication.doi}" if @publication.doi.present?
    bag_info << "Publication-Type: Collection"
    bag_info << "Item-Count: #{item_count}"
    bag_info << ""

    bag_info.join("\n")
  end

  def generate_file_path
    begin
      # Get published_at date, fallback to current date if not available
      date = @publication.published_at || Time.current
      year = date.year
      month = date.month

      # Generate filename: publication_xxx.zip where xxx is the publication ID
      filename = "publication_#{@publication.element_type}_#{@publication.id}.zip"

      # Construct full path based on element_type: public/zip/[samples|reactions]/year/month/publication_xxx.zip
      file_path = base_directory.join(year.to_s, month.to_s, filename)

      @logger.debug("[FILE_PATH_GENERATION] Generated file path - Element Type: #{@publication.element_type}, Year: #{year}, Month: #{month}, Filename: #{filename}, Full path: #{file_path}")

      file_path.to_s
    rescue StandardError => e
      @logger.error("[FILE_PATH_ERROR] Failed to generate file path - Publication: #{@publication.id}")
      @logger.error("File path generation error: #{e.message}")
      @logger.error(e.backtrace.join("\n"))
      nil
    end
  end

  def ensure_directory_structure(file_path)
    begin
      directory = File.dirname(file_path)
      FileUtils.mkdir_p(directory) unless Dir.exist?(directory)
      @logger.debug("[DIRECTORY_CREATE] Ensured directory exists: #{directory}")
      true
    rescue StandardError => e
      @logger.error("[DIRECTORY_ERROR] Failed to create directory structure - Path: #{file_path}")
      @logger.error("Directory creation error: #{e.message}")
      @logger.error(e.backtrace.join("\n"))
      false
    end
  end

  def save_zip_file(zip_data, file_path)
    begin
      # Write zip data to file
      File.open(file_path, 'wb') do |file|
        zip_data.rewind
        bytes_written = file.write(zip_data.read)
        @logger.debug("[FILE_WRITE] Wrote zip data to file - Bytes: #{bytes_written}, Expected: #{zip_data.size}")
      end

      # Verify file was created successfully
      if File.exist?(file_path)
        @logger.info("[FILE_SAVE_SUCCESS] Zip file saved successfully - Path: #{file_path}, Size: #{File.size(file_path)} bytes")
        file_path
      else
        @logger.error("[FILE_SAVE_ERROR] File was not created - Path: #{file_path}")
        nil
      end
    rescue StandardError => e
      @logger.error("[FILE_SAVE_ERROR] Failed to save zip file - Path: #{file_path}")
      @logger.error("File save error: #{e.message}")
      @logger.error(e.backtrace.join("\n"))
      nil
    end
  end

  def success_result(file_path)
    # Calculate relative path from public directory for web access
    # Ensure file_path is absolute before calling relative_path_from
    absolute_file_path = Pathname.new(file_path).expand_path
    relative_path = absolute_file_path.relative_path_from(Rails.public_path).to_s
    download_url = "#{ENV['PUBLIC_URL']}/#{relative_path}"

    result = {
      success: true,
      file_path: relative_path, # Return relative path for storage
      full_path: file_path,     # Keep full path for immediate use if needed
      relative_path: relative_path,
      download_url: download_url,
      file_size: File.size(file_path),
      message: 'Publication zip file successfully generated and saved'
    }

    @logger.info("[ZIP_COMPLETE] Zip generation completed successfully - Publication: #{@publication.id}, Path: #{file_path}, URL: #{download_url}")

    result
  end

  def error_result(message)
    @error = message
    result = {
      success: false,
      error: message
    }
    @logger.error("[ZIP_ERROR] #{message} - Publication: #{@publication.id}")
    result
  end
end
