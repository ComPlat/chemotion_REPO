namespace :publication do
  # Shared helper methods
  def log_message(message)
    puts "[#{Time.current}] #{message}"
  end

  def validate_publication_for_zip(publication, skip_existence_check: false)
    # Check if publication is eligible for zip generation
    unless %w[Sample Reaction].include?(publication.element_type)
      return { valid: false, error: "Unsupported element type: #{publication.element_type}" }
    end

    # Check if publication is completed
    unless publication.state == Publication::STATE_COMPLETED
      return { valid: false, error: "Publication not completed" }
    end

    # Check if zip already exists (only if not skipping check)
    if !skip_existence_check && publication.zip_file_exists?
      return { valid: false, error: "ZIP file already exists", skip_reason: "already_exists" }
    end

    { valid: true }
  end

  def generate_zip_for_publication(publication, force_regenerate: false)
    log_message "Processing Publication ##{publication.id} (#{publication.element_type} #{publication.element_id})"

    validation = validate_publication_for_zip(publication, skip_existence_check: force_regenerate)

    unless validation[:valid]
      if validation[:skip_reason] == "already_exists"
        log_message "  ZIP file already exists at: #{publication.zip_file_path}"
        log_message "  Download URL: #{publication.zip_download_url}"
        return { success: true, message: "ZIP file already exists" }
      else
        log_message "  Skipping: #{validation[:error]}"
        return { success: false, error: validation[:error] }
      end
    end

    # Log regeneration vs generation
    if force_regenerate
      if publication.zip_file_exists?
        log_message "  Existing ZIP file found at: #{publication.zip_file_path}"
        log_message "  Will regenerate and overwrite..."
      else
        log_message "  No existing ZIP file found, generating new one..."
      end
    end

    begin
      # Create a data hash to store the zip information
      data_hash = {}

      # Generate the zip file
      publication.generate_publication_zip!(data_hash)

      # Update the publication's taggable_data with the zip information
      if data_hash[:zip_file_path] || data_hash[:zip_download_url]
        updated_taggable_data = (publication.taggable_data || {}).merge(data_hash)
        publication.update!(taggable_data: updated_taggable_data)

        action_word = force_regenerate ? "regenerated" : "generated"
        log_message "  ✓ ZIP file #{action_word} successfully"
        log_message "  File path: #{data_hash[:zip_file_path]}"
        log_message "  Download URL: #{data_hash[:zip_download_url]}"

        # If this is a Reaction publication, also generate ZIP files for its child samples
        if publication.element_type == 'Reaction'
          generate_zip_for_reaction_samples(publication, force_regenerate)
        end

        return {
          success: true,
          file_path: data_hash[:zip_file_path],
          download_url: data_hash[:zip_download_url]
        }
      else
        action_word = force_regenerate ? "regenerate" : "generate"
        log_message "  ✗ Failed to #{action_word} ZIP file (no file path or URL returned)"
        return { success: false, error: "No file path or URL returned" }
      end

    rescue => e
      action_word = force_regenerate ? "regenerating" : "generating"
      log_message "  ✗ Error #{action_word} ZIP file: #{e.message}"
      log_message "  Backtrace: #{e.backtrace.first(5).join("\n  ")}"
      return { success: false, error: e.message }
    end
  end

  def generate_zip_for_reaction_samples(reaction_publication, force_regenerate)
    log_message "  🔍 Looking for published product samples for Reaction ##{reaction_publication.element_id}..."

    # Find all sample publications that belong to this reaction
    reaction = reaction_publication.element
    return unless reaction

    # Get only product samples from the reaction (not starting materials or reactants)
    product_sample_ids = reaction.reactions_product_samples.joins(:sample).pluck('samples.id')

    if product_sample_ids.empty?
      log_message "  ℹ️  No product samples found for this reaction"
      return
    end

    # Find published sample publications for these product samples only
    sample_publications = Publication.where(
      element_type: 'Sample',
      element_id: product_sample_ids,
      state: Publication::STATE_COMPLETED
    )

    if sample_publications.empty?
      log_message "  ℹ️  No published product sample publications found for this reaction"
      return
    end

    log_message "  📦 Found #{sample_publications.count} published product sample(s) for this reaction"

    sample_publications.each do |sample_pub|
      log_message "    Processing product Sample Publication ##{sample_pub.id} (Sample #{sample_pub.element_id})"

      # Check if sample already has ZIP file (unless force regenerating)
      if !force_regenerate && sample_pub.zip_file_exists?
        log_message "    ⏭️  Product sample already has ZIP file, skipping"
        next
      end

      begin
        # Create a data hash to store the zip information
        sample_data_hash = {}

        # Generate the zip file for the sample
        sample_pub.generate_publication_zip!(sample_data_hash)

        # Update the sample publication's taggable_data with the zip information
        if sample_data_hash[:zip_file_path] || sample_data_hash[:zip_download_url]
          updated_sample_taggable_data = (sample_pub.taggable_data || {}).merge(sample_data_hash)
          sample_pub.update!(taggable_data: updated_sample_taggable_data)

          action_word = force_regenerate ? "regenerated" : "generated"
          log_message "    ✓ Product sample ZIP file #{action_word} successfully"
          log_message "    File path: #{sample_data_hash[:zip_file_path]}"
          log_message "    Download URL: #{sample_data_hash[:zip_download_url]}"
        else
          action_word = force_regenerate ? "regenerate" : "generate"
          log_message "    ✗ Failed to #{action_word} product sample ZIP file (no file path or URL returned)"
        end

      rescue => e
        action_word = force_regenerate ? "regenerating" : "generating"
        log_message "    ✗ Error #{action_word} product sample ZIP file: #{e.message}"
      end
    end
  end

  def parse_publication_ids(args)
    if args[:publication_ids].present?
      args[:publication_ids].split(',').map(&:strip).map(&:to_i)
    else
      []
    end
  end

  def show_usage_examples(task_name)
    case task_name
    when :generate_zip
      log_message "Usage examples:"
      log_message "  # Generate ZIP for a single publication:"
      log_message "  rails publication:generate_zip[123]"
      log_message ""
      log_message "  # Generate ZIP for multiple publications:"
      log_message "  rails publication:generate_zip[123,456,789]"
      log_message ""
      log_message "  # Generate ZIP for all completed publications:"
      log_message "  rails publication:generate_zip_all"
    when :regenerate_zip
      log_message "Usage examples:"
      log_message "  # Regenerate ZIP for a single publication:"
      log_message "  rails publication:regenerate_zip[123]"
      log_message ""
      log_message "  # Regenerate ZIP for multiple publications:"
      log_message "  rails publication:regenerate_zip[123,456,789]"
      log_message ""
      log_message "  # Generate ZIP for all completed publications (skips existing):"
      log_message "  rails publication:generate_zip_all"
      log_message ""
      log_message "  # Regenerate ZIP for all completed publications (overwrites existing):"
      log_message "  rails publication:regenerate_zip_all"
    when :check_zip_status
      log_message "Usage examples:"
      log_message "  rails publication:check_zip_status[123]"
      log_message "  rails publication:check_zip_status[123,456,789]"
    end
  end

  def process_publication_list(publication_ids, force_regenerate: false)
    successful_count = 0
    failed_count = 0
    skipped_count = 0
    results = []

    publication_ids.each do |pub_id|
      publication = Publication.find_by(id: pub_id)

      if publication.nil?
        log_message "❌ Publication ##{pub_id} not found"
        failed_count += 1
        results << { id: pub_id, success: false, error: "Publication not found" }
        next
      end

      result = generate_zip_for_publication(publication, force_regenerate: force_regenerate)
      result[:id] = pub_id
      results << result

      if result[:success]
        if !force_regenerate && result[:message] == "ZIP file already exists"
          skipped_count += 1
        else
          successful_count += 1
        end
      else
        failed_count += 1
      end

      log_message ""
    end

    # Summary
    action_word = force_regenerate ? "regenerated" : "generated"
    log_message "📊 Summary:"
    log_message "  ✓ Successfully #{action_word}: #{successful_count}"
    log_message "  ⏭️  Skipped (already exists): #{skipped_count}" unless force_regenerate
    log_message "  ❌ Failed: #{failed_count}"
    log_message "  📈 Total processed: #{publication_ids.length}"

    if failed_count > 0
      log_message ""
      log_message "❌ Failed publications:"
      results.select { |r| !r[:success] }.each do |result|
        log_message "  Publication ##{result[:id]}: #{result[:error]}"
      end
    end
  end

  def find_completed_publications
    Publication.where(
      state: Publication::STATE_COMPLETED,
      element_type: %w[Sample Reaction]
    ).order(:id)
  end

  def validate_month_format(month_param)
    return { valid: false, error: "Please provide a month in YYYYMM format" } if month_param.blank?

    unless month_param.match?(/^\d{6}$/)
      return { valid: false, error: "Invalid month format. Please use YYYYMM format (e.g., 202507)" }
    end

    year = month_param[0..3].to_i
    month = month_param[4..5].to_i

    if year < 2000 || year > 2100
      return { valid: false, error: "Invalid year #{year}. Year should be between 2000 and 2100" }
    end

    if month < 1 || month > 12
      return { valid: false, error: "Invalid month #{month}. Month should be between 01 and 12" }
    end

    start_date = Date.new(year, month, 1).beginning_of_month
    end_date = start_date.end_of_month

    {
      valid: true,
      year: year,
      month: month,
      start_date: start_date,
      end_date: end_date,
      month_name: Date::MONTHNAMES[month]
    }
  end

  def validate_year_format(year_param)
    return { valid: false, error: "Please provide a year in YYYY format" } if year_param.blank?

    unless year_param.match?(/^\d{4}$/)
      return { valid: false, error: "Invalid year format. Please use YYYY format (e.g., 2025)" }
    end

    year = year_param.to_i

    if year < 2000 || year > 2100
      return { valid: false, error: "Invalid year #{year}. Year should be between 2000 and 2100" }
    end

    start_date = Date.new(year, 1, 1).beginning_of_year
    end_date = start_date.end_of_year

    {
      valid: true,
      year: year,
      start_date: start_date,
      end_date: end_date
    }
  end

  desc "Generate ZIP files for publications"
  task :generate_zip, [:publication_ids] => :environment do |task, args|
    publication_ids = parse_publication_ids(args)

    if publication_ids.empty?
      log_message "❌ Error: Please provide publication ID(s)"
      log_message ""
      show_usage_examples(:generate_zip)
      exit 1
    end

    log_message "🚀 Starting ZIP generation for #{publication_ids.length} publication(s): #{publication_ids.join(', ')}"
    log_message ""

    process_publication_list(publication_ids, force_regenerate: false)
  end

  desc "Regenerate ZIP files for publications (force regeneration even if ZIP exists)"
  task :regenerate_zip, [:publication_ids] => :environment do |task, args|
    publication_ids = parse_publication_ids(args)

    if publication_ids.empty?
      log_message "❌ Error: Please provide publication ID(s)"
      log_message ""
      show_usage_examples(:regenerate_zip)
      exit 1
    end

    log_message "🔄 Starting ZIP regeneration for #{publication_ids.length} publication(s): #{publication_ids.join(', ')}"
    log_message "⚠️  Note: This will overwrite existing ZIP files!"
    log_message ""

    process_publication_list(publication_ids, force_regenerate: true)
  end

  desc "Generate ZIP files for all completed publications"
  task :generate_zip_all => :environment do
    log_message "🔍 Finding all completed publications (Sample and Reaction types)..."

    publications = find_completed_publications
    total_count = publications.count

    if total_count == 0
      log_message "ℹ️  No completed Sample or Reaction publications found"
      exit 0
    end

    log_message "📊 Found #{total_count} completed publications"

    # Check how many already have ZIP files
    publications_with_zip = publications.select { |p| p.zip_file_exists? }
    publications_without_zip = publications.reject { |p| p.zip_file_exists? }

    log_message "  ✓ Already have ZIP files: #{publications_with_zip.length}"
    log_message "  🔄 Need ZIP generation: #{publications_without_zip.length}"

    if publications_without_zip.empty?
      log_message "✅ All publications already have ZIP files!"
      exit 0
    end

    log_message ""
    log_message "🚀 Starting ZIP generation for #{publications_without_zip.length} publications..."
    log_message ""

    successful_count = 0
    failed_count = 0

    publications_without_zip.each_with_index do |publication, index|
      log_message "Progress: #{index + 1}/#{publications_without_zip.length}"

      result = generate_zip_for_publication(publication, force_regenerate: false)

      if result[:success]
        log_message "  ✓ Publication ##{publication.id} - ZIP generated successfully"
        successful_count += 1
      else
        log_message "  ✗ Publication ##{publication.id} - #{result[:error]}"
        failed_count += 1
      end

      log_message ""
    end

    log_message "📊 Final Summary:"
    log_message "  ✓ Successfully generated: #{successful_count}"
    log_message "  ❌ Failed: #{failed_count}"
    log_message "  📈 Total processed: #{publications_without_zip.length}"
    log_message "  📁 Total publications with ZIP files: #{publications_with_zip.length + successful_count}"
  end

  desc "Regenerate ZIP files for all completed publications (force regeneration even if ZIP exists)"
  task :regenerate_zip_all => :environment do
    log_message "🔍 Finding all completed publications (Sample and Reaction types)..."

    publications = find_completed_publications
    total_count = publications.count

    if total_count == 0
      log_message "ℹ️  No completed Sample or Reaction publications found"
      exit 0
    end

    log_message "📊 Found #{total_count} completed publications"

    # Check how many already have ZIP files
    publications_with_zip = publications.select { |p| p.zip_file_exists? }
    publications_without_zip = publications.reject { |p| p.zip_file_exists? }

    log_message "  📁 Currently have ZIP files: #{publications_with_zip.length}"
    log_message "  📦 Currently without ZIP files: #{publications_without_zip.length}"
    log_message ""
    log_message "🔄 Will regenerate ZIP files for ALL #{total_count} publications"
    log_message "⚠️  Note: This will overwrite existing ZIP files!"
    log_message ""

    successful_count = 0
    failed_count = 0

    publications.each_with_index do |publication, index|
      log_message "Progress: #{index + 1}/#{total_count}"
      log_message "Processing Publication ##{publication.id} (#{publication.element_type} #{publication.element_id})"

      if publication.zip_file_exists?
        log_message "  🔄 Regenerating existing ZIP file..."
      else
        log_message "  📦 Creating new ZIP file..."
      end

      result = generate_zip_for_publication(publication, force_regenerate: true)

      if result[:success]
        log_message "  ✓ ZIP file regenerated successfully"
        successful_count += 1
      else
        log_message "  ✗ #{result[:error]}"
        failed_count += 1
      end

      log_message ""
    end

    log_message "📊 Final Summary:"
    log_message "  ✓ Successfully regenerated: #{successful_count}"
    log_message "  ❌ Failed: #{failed_count}"
    log_message "  📈 Total processed: #{total_count}"
    log_message "  📁 Total publications with ZIP files: #{successful_count}"
  end

  desc "Regenerate ZIP files for publications by publication month (format: YYYYMM, e.g., 202507)"
  task :regenerate_zip_by_month, [:month] => :environment do |task, args|
    # Parse and validate month parameter
    month_validation = validate_month_format(args[:month])

    unless month_validation[:valid]
      log_message "❌ Error: #{month_validation[:error]}"
      log_message ""
      log_message "Usage examples:"
      log_message "  # Regenerate ZIP files for July 2025:"
      log_message "  rails publication:regenerate_zip_by_month[202507]"
      log_message ""
      log_message "  # Regenerate ZIP files for December 2024:"
      log_message "  rails publication:regenerate_zip_by_month[202412]"
      exit 1
    end

    start_date = month_validation[:start_date]
    end_date = month_validation[:end_date]
    month_name = month_validation[:month_name]
    year = month_validation[:year]

    log_message "🔍 Finding publications published in #{month_name} #{year} (#{start_date} to #{end_date})..."

    # Find publications published in the specified month
    publications = Publication.where(
      state: Publication::STATE_COMPLETED,
      element_type: %w[Sample Reaction],
      published_at: start_date..end_date
    ).order(:published_at, :id)

    total_count = publications.count

    if total_count == 0
      log_message "ℹ️  No completed Sample or Reaction publications found for #{month_name} #{year}"
      exit 0
    end

    log_message "📊 Found #{total_count} completed publications for #{month_name} #{year}"

    # Check how many already have ZIP files
    publications_with_zip = publications.select { |p| p.zip_file_exists? }
    publications_without_zip = publications.reject { |p| p.zip_file_exists? }

    log_message "  📁 Currently have ZIP files: #{publications_with_zip.length}"
    log_message "  📦 Currently without ZIP files: #{publications_without_zip.length}"
    log_message ""
    log_message "🔄 Will regenerate ZIP files for ALL #{total_count} publications from #{month_name} #{year}"
    log_message "⚠️  Note: This will overwrite existing ZIP files!"
    log_message ""

    successful_count = 0
    failed_count = 0
    processed_publications = []

    publications.each_with_index do |publication, index|
      log_message "Progress: #{index + 1}/#{total_count}"
      log_message "Processing Publication ##{publication.id} (#{publication.element_type} #{publication.element_id}) - Published: #{publication.published_at&.strftime('%Y-%m-%d')}"

      if publication.zip_file_exists?
        log_message "  🔄 Regenerating existing ZIP file..."
      else
        log_message "  📦 Creating new ZIP file..."
      end

      result = generate_zip_for_publication(publication, force_regenerate: true)
      processed_publications << {
        id: publication.id,
        published_at: publication.published_at,
        success: result[:success],
        error: result[:error]
      }

      if result[:success]
        log_message "  ✓ ZIP file regenerated successfully"
        log_message "  File path: #{result[:file_path]}" if result[:file_path]
        log_message "  Download URL: #{result[:download_url]}" if result[:download_url]
        successful_count += 1
      else
        log_message "  ✗ Error regenerating ZIP file: #{result[:error]}"
        failed_count += 1
      end

      log_message ""
    end

    log_message "📊 Final Summary for #{month_name} #{year}:"
    log_message "  ✓ Successfully regenerated: #{successful_count}"
    log_message "  ❌ Failed: #{failed_count}"
    log_message "  📈 Total processed: #{total_count}"
    log_message "  📅 Date range: #{start_date} to #{end_date}"

    if failed_count > 0
      log_message ""
      log_message "❌ Failed publications:"
      processed_publications.select { |r| !r[:success] }.each do |result|
        log_message "  Publication ##{result[:id]} (#{result[:published_at]&.strftime('%Y-%m-%d')}): #{result[:error]}"
      end
    end

    # Show successful publications summary
    if successful_count > 0
      log_message ""
      log_message "✅ Successfully processed publications:"
      processed_publications.select { |r| r[:success] }.each do |result|
        log_message "  Publication ##{result[:id]} (#{result[:published_at]&.strftime('%Y-%m-%d')})"
      end
    end
  end

  desc "Check ZIP file status for publications"
  task :check_zip_status, [:publication_ids] => :environment do |task, args|
    publication_ids = parse_publication_ids(args)

    if publication_ids.empty?
      log_message "❌ Error: Please provide publication ID(s)"
      log_message ""
      show_usage_examples(:check_zip_status)
      exit 1
    end

    log_message "🔍 Checking ZIP file status for #{publication_ids.length} publication(s)"
    log_message ""

    publication_ids.each do |pub_id|
      publication = Publication.find_by(id: pub_id)

      if publication.nil?
        log_message "❌ Publication ##{pub_id}: Not found"
        next
      end

      log_message "📄 Publication ##{pub_id} (#{publication.element_type} #{publication.element_id}):"
      log_message "  State: #{publication.state}"
      log_message "  Element type: #{publication.element_type}"

      if publication.zip_file_path
        log_message "  ZIP file path: #{publication.zip_file_path}"
        log_message "  ZIP file exists: #{publication.zip_file_exists? ? '✓ Yes' : '❌ No'}"
      else
        log_message "  ZIP file path: ❌ Not set"
      end

      if publication.zip_download_url
        log_message "  Download URL: #{publication.zip_download_url}"
      else
        log_message "  Download URL: ❌ Not set"
      end

      log_message ""
    end
  end

  desc "Generate ZIP files for publications by publication month (format: YYYYMM, e.g., 202507)"
  task :generate_zip_by_month, [:month] => :environment do |task, args|
    # Parse and validate month parameter
    month_validation = validate_month_format(args[:month])

    unless month_validation[:valid]
      log_message "❌ Error: #{month_validation[:error]}"
      log_message ""
      log_message "Usage examples:"
      log_message "  # Generate ZIP files for July 2025:"
      log_message "  rails publication:generate_zip_by_month[202507]"
      log_message ""
      log_message "  # Generate ZIP files for December 2024:"
      log_message "  rails publication:generate_zip_by_month[202412]"
      exit 1
    end

    start_date = month_validation[:start_date]
    end_date = month_validation[:end_date]
    month_name = month_validation[:month_name]
    year = month_validation[:year]

    log_message "🔍 Finding publications published in #{month_name} #{year} (#{start_date} to #{end_date})..."

    # Find publications published in the specified month
    publications = Publication.where(
      state: Publication::STATE_COMPLETED,
      element_type: %w[Sample Reaction],
      published_at: start_date..end_date
    ).order(:published_at, :id)

    total_count = publications.count

    if total_count == 0
      log_message "ℹ️  No completed Sample or Reaction publications found for #{month_name} #{year}"
      exit 0
    end

    log_message "📊 Found #{total_count} completed publications for #{month_name} #{year}"

    # Check how many already have ZIP files
    publications_with_zip = publications.select { |p| p.zip_file_exists? }
    publications_without_zip = publications.reject { |p| p.zip_file_exists? }

    log_message "  ✓ Already have ZIP files: #{publications_with_zip.length}"
    log_message "  🔄 Need ZIP generation: #{publications_without_zip.length}"

    if publications_without_zip.empty?
      log_message "✅ All publications from #{month_name} #{year} already have ZIP files!"
      exit 0
    end

    log_message ""
    log_message "🚀 Starting ZIP generation for #{publications_without_zip.length} publications from #{month_name} #{year}..."
    log_message ""

    successful_count = 0
    failed_count = 0

    publications_without_zip.each_with_index do |publication, index|
      log_message "Progress: #{index + 1}/#{publications_without_zip.length}"
      log_message "Processing Publication ##{publication.id} (#{publication.element_type} #{publication.element_id}) - Published: #{publication.published_at&.strftime('%Y-%m-%d')}"

      result = generate_zip_for_publication(publication, force_regenerate: false)

      if result[:success]
        log_message "  ✓ ZIP file generated successfully"
        log_message "  File path: #{result[:file_path]}" if result[:file_path]
        log_message "  Download URL: #{result[:download_url]}" if result[:download_url]
        successful_count += 1
      else
        log_message "  ✗ Error generating ZIP file: #{result[:error]}"
        failed_count += 1
      end

      log_message ""
    end

    log_message "📊 Final Summary for #{month_name} #{year}:"
    log_message "  ✓ Successfully generated: #{successful_count}"
    log_message "  ❌ Failed: #{failed_count}"
    log_message "  📈 Total processed: #{publications_without_zip.length}"
    log_message "  📅 Date range: #{start_date} to #{end_date}"
    log_message "  📁 Total publications with ZIP files: #{publications_with_zip.length + successful_count}"
  end

  desc "Generate ZIP files for publications by publication year (format: YYYY, e.g., 2025)"
  task :generate_zip_by_year, [:year] => :environment do |task, args|
    # Parse and validate year parameter
    year_validation = validate_year_format(args[:year])

    unless year_validation[:valid]
      log_message "❌ Error: #{year_validation[:error]}"
      log_message ""
      log_message "Usage examples:"
      log_message "  # Generate ZIP files for 2025:"
      log_message "  rails publication:generate_zip_by_year[2025]"
      log_message ""
      log_message "  # Generate ZIP files for 2024:"
      log_message "  rails publication:generate_zip_by_year[2024]"
      exit 1
    end

    start_date = year_validation[:start_date]
    end_date = year_validation[:end_date]
    year = year_validation[:year]

    log_message "🔍 Finding publications published in year #{year} (#{start_date} to #{end_date})..."

    # Find publications published in the specified year
    publications = Publication.where(
      state: Publication::STATE_COMPLETED,
      element_type: %w[Sample Reaction],
      published_at: start_date..end_date
    ).order(:published_at, :id)

    total_count = publications.count

    if total_count == 0
      log_message "ℹ️  No completed Sample or Reaction publications found for year #{year}"
      exit 0
    end

    log_message "📊 Found #{total_count} completed publications for year #{year}"

    # Check how many already have ZIP files
    publications_with_zip = publications.select { |p| p.zip_file_exists? }
    publications_without_zip = publications.reject { |p| p.zip_file_exists? }

    log_message "  ✓ Already have ZIP files: #{publications_with_zip.length}"
    log_message "  🔄 Need ZIP generation: #{publications_without_zip.length}"

    if publications_without_zip.empty?
      log_message "✅ All publications from year #{year} already have ZIP files!"
      exit 0
    end

    log_message ""
    log_message "🚀 Starting ZIP generation for #{publications_without_zip.length} publications from year #{year}..."
    log_message ""

    successful_count = 0
    failed_count = 0

    publications_without_zip.each_with_index do |publication, index|
      log_message "Progress: #{index + 1}/#{publications_without_zip.length}"
      log_message "Processing Publication ##{publication.id} (#{publication.element_type} #{publication.element_id}) - Published: #{publication.published_at&.strftime('%Y-%m-%d')}"

      result = generate_zip_for_publication(publication, force_regenerate: false)

      if result[:success]
        log_message "  ✓ ZIP file generated successfully"
        log_message "  File path: #{result[:file_path]}" if result[:file_path]
        log_message "  Download URL: #{result[:download_url]}" if result[:download_url]
        successful_count += 1
      else
        log_message "  ✗ Error generating ZIP file: #{result[:error]}"
        failed_count += 1
      end

      log_message ""
    end

    log_message "📊 Final Summary for year #{year}:"
    log_message "  ✓ Successfully generated: #{successful_count}"
    log_message "  ❌ Failed: #{failed_count}"
    log_message "  📈 Total processed: #{publications_without_zip.length}"
    log_message "  📅 Date range: #{start_date} to #{end_date}"
    log_message "  📁 Total publications with ZIP files: #{publications_with_zip.length + successful_count}"
  end

  desc "Regenerate ZIP files for publications by publication year (format: YYYY, e.g., 2025)"
  task :regenerate_zip_by_year, [:year] => :environment do |task, args|
    # Parse and validate year parameter
    year_validation = validate_year_format(args[:year])

    unless year_validation[:valid]
      log_message "❌ Error: #{year_validation[:error]}"
      log_message ""
      log_message "Usage examples:"
      log_message "  # Regenerate ZIP files for 2025:"
      log_message "  rails publication:regenerate_zip_by_year[2025]"
      log_message ""
      log_message "  # Regenerate ZIP files for 2024:"
      log_message "  rails publication:regenerate_zip_by_year[2024]"
      exit 1
    end

    start_date = year_validation[:start_date]
    end_date = year_validation[:end_date]
    year = year_validation[:year]

    log_message "🔍 Finding publications published in year #{year} (#{start_date} to #{end_date})..."

    # Find publications published in the specified year
    publications = Publication.where(
      state: Publication::STATE_COMPLETED,
      element_type: %w[Sample Reaction],
      published_at: start_date..end_date
    ).order(:published_at, :id)

    total_count = publications.count

    if total_count == 0
      log_message "ℹ️  No completed Sample or Reaction publications found for year #{year}"
      exit 0
    end

    log_message "📊 Found #{total_count} completed publications for year #{year}"

    # Check how many already have ZIP files
    publications_with_zip = publications.select { |p| p.zip_file_exists? }
    publications_without_zip = publications.reject { |p| p.zip_file_exists? }

    log_message "  📁 Currently have ZIP files: #{publications_with_zip.length}"
    log_message "  📦 Currently without ZIP files: #{publications_without_zip.length}"
    log_message ""
    log_message "🔄 Will regenerate ZIP files for ALL #{total_count} publications from year #{year}"
    log_message "⚠️  Note: This will overwrite existing ZIP files!"
    log_message ""

    successful_count = 0
    failed_count = 0
    processed_publications = []

    publications.each_with_index do |publication, index|
      log_message "Progress: #{index + 1}/#{total_count}"
      log_message "Processing Publication ##{publication.id} (#{publication.element_type} #{publication.element_id}) - Published: #{publication.published_at&.strftime('%Y-%m-%d')}"

      if publication.zip_file_exists?
        log_message "  🔄 Regenerating existing ZIP file..."
      else
        log_message "  📦 Creating new ZIP file..."
      end

      result = generate_zip_for_publication(publication, force_regenerate: true)
      processed_publications << {
        id: publication.id,
        published_at: publication.published_at,
        success: result[:success],
        error: result[:error]
      }

      if result[:success]
        log_message "  ✓ ZIP file regenerated successfully"
        log_message "  File path: #{result[:file_path]}" if result[:file_path]
        log_message "  Download URL: #{result[:download_url]}" if result[:download_url]
        successful_count += 1
      else
        log_message "  ✗ Error regenerating ZIP file: #{result[:error]}"
        failed_count += 1
      end

      log_message ""
    end

    log_message "📊 Final Summary for year #{year}:"
    log_message "  ✓ Successfully regenerated: #{successful_count}"
    log_message "  ❌ Failed: #{failed_count}"
    log_message "  📈 Total processed: #{total_count}"
    log_message "  📅 Date range: #{start_date} to #{end_date}"

    if failed_count > 0
      log_message ""
      log_message "❌ Failed publications:"
      processed_publications.select { |r| !r[:success] }.each do |result|
        log_message "  Publication ##{result[:id]} (#{result[:published_at]&.strftime('%Y-%m-%d')}): #{result[:error]}"
      end
    end

    # Show successful publications summary
    if successful_count > 0
      log_message ""
      log_message "✅ Successfully processed publications:"
      processed_publications.select { |r| r[:success] }.each do |result|
        log_message "  Publication ##{result[:id]} (#{result[:published_at]&.strftime('%Y-%m-%d')})"
      end
    end
  end
end
