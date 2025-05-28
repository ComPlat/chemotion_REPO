namespace :affiliations do
  desc "Update affiliations with ROR IDs and standardized names"
  task update_ror_data: :environment do
    require 'ror/ror_api_client'

    # Get count of affiliations without ROR IDs
    total = Affiliation.where(ror_id: nil).count
    puts "Found #{total} affiliations without ROR IDs"

    processed = 0
    updated = 0

    Affiliation.where(ror_id: nil).find_each(batch_size: 50) do |affiliation|
      processed += 1

      # Skip if no organization data
      if affiliation.organization.blank?
        puts "Skipping #{affiliation.id} - no organization name" if processed % 50 == 0
        next
      end

      # Save original organization name
      affiliation.update_column(:original_organization, affiliation.organization) if affiliation.original_organization.blank?

      # Try to find ROR ID
      if affiliation.lookup_ror_data
        updated += 1
        puts "Updated affiliation #{affiliation.id}: '#{affiliation.original_organization}' → '#{affiliation.organization}' (ROR ID: #{affiliation.ror_id})"
      end

      # Print progress
      if processed % 50 == 0
        puts "Progress: #{processed}/total} (#{(processed.to_f/total*100).round(1)}%) - Updated: #{updated}"
      end

      # Pause briefly to avoid overwhelming the API
      sleep(0.5)
    end

    puts "Completed: Processed #{processed} affiliations, updated #{updated}"
  end

  desc "Look up a specific organization in ROR"
  task :lookup, [:name] => :environment do |t, args|
    require 'ror/ror_api_client'

    name = args[:name]
    if name.blank?
      puts "Please provide an organization name"
      puts "Example: rake affiliations:lookup[\"University of Cambridge\"]"
      exit 1
    end

    puts "Looking up: #{name}"
    result = RorApiClient.search_organization(name)

    if result
      puts "Found match:"
      puts "  Name: #{result[:name]}"
      puts "  ROR ID: #{result[:ror_id]}"
      puts "  ROR URL: https://ror.org/#{result[:ror_id]}"
      puts "  Country: #{result[:country]}"
      puts "  Match score: #{(result[:score] * 100).round(1)}%"
    else
      puts "No match found for '#{name}'"
    end
  end

  desc "Standardize organization names and find ROR IDs"
  task standardize_organizations: :environment do
    require 'ror/ror_api_client'

    # Define organization name mappings for standardization
    name_mappings = {
      # German universities with common variations
      /karlsruher?\s+institu?t\s+f(ü|u|ue)r\s+technologie(\s*\(?kit\)?)?(\s*-\s*campus\s+\w+)?/i =>
        { standard: "Karlsruhe Institute of Technology", search: "Karlsruhe Institute of Technology" },

      /technische\s+universit(ä|a|ae)t\s+m(ü|u|ue)nchen/i =>
        { standard: "Technical University of Munich", search: "Technical University of Munich" },

      /ludwig[s-]?maximilians[s-]?universit(ä|a|ae)t\s+m(ü|u|ue)nchen/i =>
        { standard: "Ludwig Maximilian University of Munich", search: "LMU Munich" },

      /universit(ä|a|ae)t\s+heidelberg/i =>
        { standard: "Heidelberg University", search: "Heidelberg University" },

      # Add more mappings as needed
    }

    # Find all affiliations that might need standardization
    query_conditions = name_mappings.keys.map do |pattern|
      "organization ~* '#{pattern.source}'"
    end.join(" OR ")

    affiliations = Affiliation.where(query_conditions)
    total = affiliations.count

    puts "Found #{total} affiliations that may need standardization"

    processed = 0
    standardized = 0
    ror_updated = 0

    affiliations.find_each do |affiliation|
      processed += 1
      original_name = affiliation.organization
      standardized_name = nil
      search_term = nil

      # Find matching pattern and get standardized name
      name_mappings.each do |pattern, mapping|
        if original_name.match?(pattern)
          standardized_name = mapping[:standard]
          search_term = mapping[:search] || standardized_name
          break
        end
      end

      next unless standardized_name

      # Skip if already standardized to this name
      if original_name == standardized_name
        puts "Skipping #{affiliation.id} - already standardized" if processed % 10 == 0
        next
      end

      # Save original name if not already saved
      if affiliation.original_organization.blank?
        affiliation.update_column(:original_organization, original_name)
      end

      # Update the organization name
      affiliation.update_column(:organization, standardized_name)
      standardized += 1

      # Search for ROR ID if not already present
      if affiliation.ror_id.blank?
        result = RorApiClient.search_organization(search_term)

        if result && result[:ror_id].present?
          affiliation.update_columns(
            ror_id: result[:ror_id],
            country: result[:country] || affiliation.country
          )
          ror_updated += 1

          puts "Updated #{affiliation.id}: '#{original_name}' → '#{standardized_name}' (ROR ID: #{affiliation.ror_id})"
        else
          puts "Standardized #{affiliation.id}: '#{original_name}' → '#{standardized_name}' (No ROR match)"
        end
      else
        puts "Standardized #{affiliation.id}: '#{original_name}' → '#{standardized_name}' (ROR already set: #{affiliation.ror_id})"
      end

      # Print progress
      if processed % 10 == 0
        puts "Progress: #{processed}/#{total} (#{(processed.to_f/total*100).round(1)}%) - Standardized: #{standardized}, ROR updated: #{ror_updated}"
      end

      # Pause briefly to avoid overwhelming the API
      sleep(0.5) if affiliation.ror_id.blank?  # Only sleep when making API calls
    end

    puts "Completed: Processed #{processed} affiliations, standardized #{standardized}, ROR IDs added: #{ror_updated}"
  end

  desc "Add common variations for specific organizations"
  task add_organization_variations: :environment do
    # Define important organizations and their variations
    # Use a simple array of arrays instead of trying to use arrays as hash keys
    variations = [
      # Format: [ROR ID, Primary Name, [Variations]]
      ["04t3en479", "Karlsruhe Institute of Technology", "Germany", [
        "Karlsruher Institut für Technologie",
        "Karlsruhe Institute of Technology",
        "Karlsruher Institut für Technologie (KIT)",
        "Universität Karlsruhe (TH)",
        "KIT, Institut für Organische Chemie",
        "Karlsruher Institute of Technology (KIT)",
        "Karlsruhe Institut für Technology",
        "Karlsruhe Institute", "IBCS-FMS", "IOC", "KIT IBCS FMS", "KIT-IOC",
        "kit", "Kit", "KIT", 'kit.edu',
        "Karlsruher Institut für Technologie - Campus Nord",
        "Karlsruher Institut für Technologie - Campus Süd"
      ]],
      ["04vnq7t77", "University of Stuttgart", "Germany", [
        "Universität Stuttgart"
      ]],
      ["04xfq0f34", "RWTH Aachen University", "Germany", [
        "RWTH-Aachen", "RWTH",
        "RWTH Aachen University - University Hospital Aachen",
        "Rheinisch Westfälische Technische Hochschule Aachen"
      ]],
      ["058kzsd48", "Paderborn University", "Germany", [
        "University of Paderborn",
        "Universität Paderborn",
      ]],
      ["03s7gtk40", "Leipzig University", "Germany", [
        "Universität Leipzig",
        "University Leipzig",
        "University of Leipzig",
        "uni leipzig",
      ]],
      ["01eezs655", "University of Regensburg", "Germany", [
        "Regensburg University",
        "Univeristät Regensburg",
        "Uni Regensburg",
      ]],
      ["04ers2y35", "University of Bremen", "Germany", [
        "Universität Bremen",
      ]],
      ["038t36y30", "Heidelberg University", "Germany", [
        "Universität Heidelberg",
        "Uni Heidelberg",
        "Universiät Heidelberg",
        "Ruprecht-Karls-Universität Heidelberg",
        "Hochschule für Jüdische Studien HeidelbergRuprecht-Karls-Universität Heidelberg",
        "Ruprecht-Karls-Universität Heidelberg (Heidelberg, Baden-Württemberg)"
      ]],
      ["0245cg223", "University of Freiburg", "Germany", [
        "Albert-Ludwigs-Universität Freiburg"
      ]],
      ["014nnvj65", "TH Köln - University of Applied Sciences", "Germany", [
        "TH Köln",
        "Technische Hochschule Köln",
      ]],
      ["00rcxh774", "University of Cologne", "Germany", [
        "Uni zu Köln",
        "Universität Köln",
        "Universität zu Köln",
        "Universität zu Köln ",
        "Universität zu Kölln",
        "Universität zu köln",
      ]],
      ["04aj4c181", "Technische Informationsbibliothek (TIB)", "Germany", [
        "TIB Leibniz Information Centre for Science and Technology University Library",
      ]],
      ["029hg0311", "Leibniz Institute for Catalysis", "Germany", [
        "Leibniz-Institut für Katalyse e.V.",
      ]],
      ["01mzk5576", "Leibniz Institute of Plant Biochemistry", "Germany", [
        "Leibniz-Institut für Pflanzenbiochemie (IPB)",
        "Leibniz-Institut für Pflanzenbiochemie",
        "IPB", "IPB Halle",
      ]],
      ["055s37c97", "Leibniz-Institut für Naturstoff-Forschung und Infektionsbiologie e. V. - Hans-Knöll-Institut (HKI)", "Germany", [
        "Leibniz-HKI",
      ]],
      ["04nfjn472", "Czech Academy of Sciences, Institute of Organic Chemistry and Biochemistry", "Czech Republic", [
        "IOCB",
        "IOCB Prague",
      ]],
      ["02kkvpp62", "Technical University of Munich", "Germany", [
        "TUM",
        "TU Munich",
        "Technical University of Munich",
        "TU München"
      ]],
      ["010nsgg66", "Technische Universität Braunschweig", "Germany", [
        "Technische Universität Carolo-Wilhelmina Braunschweig",
      ]],
      ["0524sp257", "University of Bristol", "United Kingdom", [
        "University of Bristol",
      ]],
      ["03dnytd23", "Shenyang Pharmaceutical University", "China", [
        "Shenyang pharmaceutical university",
      ]],
      ["032fhk095", "Karaj Payam Noor University", "Iran", [
        "Department of Biology, Payam Noor University (PNU), post code19395-4697, Tehran, Iran.",
      ]],
      ["05591te55", "Ludwig-Maximilians-Universität München", "Germany", [
        "LMU Munich",
      ]],
      ["05qpz1x62", "Friedrich Schiller University Jena", "Germany", [
        "FSU Jena",
        "Friedrich-Schiller Universität Jena",
      ]],
      ["033eqas34", "Justus-Liebig-Universität Gießen", "Germany", [
        "Justus Liebig Universität Gießen",
        "Justus liebig university Giessen ",
      ]],
      ["01q8f6705", "BASF (Germany)", "Germany", [
        "BASF",
        "BASF SE",
      ]],
      ["04cvxnb49", "Goethe University Frankfurt", "Germany", [
        "Goethe University",
        "Goethe-Universität",
      ]],
      ["04v76ef78", "Kiel University", "Germany", [
        "CAU Kiel",
      ]],
      ["05q5pk319", "Hochschule für Technik und Wirtschaft Dresden – University of Applied Sciences", "Germany", [
        "University of Applied Sciences Dresden (HTW Dresden)",
      ]],
      ["000gm1k91", "John Wiley & Sons (Germany)", "Germany", [
        "Wiley",
      ]],
      ["01qrts582", "Rheinland-Pfälzische Technische Universität Kaiserslautern-Landau", "Germany", [
        "RPTU-Kaiserslautern",
        "RPTU Kaiserslautern",
        "RPTU Kaiserslautern-Landau",
      ]]
    ]

    variations.each do |ror_id, primary_name, country, variation_names|
      puts "Processing variations for #{primary_name} (#{ror_id})"

      # Find all affiliations with any of these variations that don't have this ROR ID
      variation_names.each do |variation|
        affiliations = Affiliation.where(organization: variation, ror_id: nil)
        if affiliations.any?
          puts "  Found #{affiliations.count} affiliations matching '#{variation}'"

          affiliations.each do |affiliation|
            # Save original name if not already saved
            if affiliation.original_organization.blank?
              affiliation.update_column(:original_organization, affiliation.organization)
            end

            # Update organization info
            affiliation.update_columns(
              organization: primary_name,
              country: country,
              ror_id: ror_id
            )

            puts "    Updated affiliation #{affiliation.id}: '#{affiliation.original_organization}' → '#{primary_name}' (ROR ID: #{ror_id})"
          end
        end
      end
    end

    puts "Completed organization variation standardization"
  end

  desc "Add common variations for specific department"
  task add_department_variations: :environment do
    # Define important organizations and their variations
    # Use a simple array of arrays instead of trying to use arrays as hash keys
    variations = [
      ["Institute of Organic Chemistry (IOC)", "Karlsruhe Institute of Technology", [
        "IOC AK Bräse", "IOC, AK Bräse",
        "Institut für organische Chemie (IOC)",
        "IOC, Bräse", "IOC ", "IOC Wagenknecht",
        "Institut für Organische Chemie",
        "Institute for Organic Chemistry",
        "IOC", "IOC ll", "IOC2", "IOC II",
        "Institute of Organic Chemistry",
        "Department of Chemistry and Biosciences",
        "Instiute of Organic Chemistry",
        "Organic Chemistry",
        "IOC, Bräse",
        "IOC Wagenknecht",
        "institute of organic chemistry",
        "organic chemistry",
      ]],
      ["Institute of Biological and Chemical Systems (IBCS)", "Karlsruhe Institute of Technology", [
        "ibcs",
        "IBCS",
        "IBCS-FMS", "ICBS-FMS",
        "Institute of Biological and Chemical Systems",
        " Institute of Biological and Chemical Systems - Functional Molecular Systems",
        "Complat",
        "Institute of Biological and Chemical Systems (IBCS-FMS)",
        "Institute of Biological and Chemical Systems - Functional Molecular Systems",
        "Institute of Biological and Chemical Systems – Functional Molecular Systems",
        "Institute of Biological and Chemical Systems - IBCS-FMS",
        "	 Institute of Biological and Chemical Systems - Functional Molecular Systems (IBCS-FMS)",
        "Institute of Biological and Chemical Systems - Functional Molecular Systems (IBCS-FMS)",
        "KIT IBCS FMS",
      ]],
      ["Institute of Functional Interfaces (IFG)", "Karlsruhe Institute of Technology", [
        "Institut für Funktionelle Grenzflächen (IFG)",
        "Institute of Functional Interfaces",
        "IFG-COOI",
        "IFG",
      ]],
      ["Institute of Nanotechnology (INT)", "Karlsruhe Institute of Technology", [
        "Institute of Nanotechnology (INT) and Karlsruhe Nano Micro Facility (KNMF)",
        "Institute of Nanotechnology",
        "INT",
      ]],
      ["Institute for Biological Interfaces (IBG)", "Karlsruhe Institute of Technology", [
        "IBG",
        "IBG1",
        "IBG3-SML",
        "IBG3",
        "IBG-4",
        "IBG3/SML",
        "Soft Matter Synthesis Laboratory (SML / IBG-3)",
        "SML",
      ]],
      ["Institute for Inorganic Chemistry (AOC)", "Karlsruhe Institute of Technology", [
        "AOC",
      ]],
      ["Institute for Chemical Technology and Polymer Chemistry (ITCP)", "Karlsruhe Institute of Technology", [
        "ITCP",
        "Macromolecular Architectures, Institut für Technische Chemie und Polymerchemie",
      ]],
      ["Institute for Micro Process Engineering (IMVT)", "Karlsruhe Institute of Technology", [
        " Institute for Micro Process Engineering",
        "IMVT",
      ]],
      ["Institute for Applied Materials (IAM)", "Karlsruhe Institute of Technology", [
        "IAM-ET",
        "IAM-ESS",
        "Institute for Applied Materials – Electrochemical Technologies (IAM-ET)",
      ]],
      ["Institute of Physical Chemistry (IPC)", "Karlsruhe Institute of Technology", [
        "IPC",
      ]],
      ["Institute of Catalysis Research und Technology (IKFT)", "Karlsruhe Institute of Technology", [
        "IKFT",
      ]],
      ["Institute of Toxicology and Genetics (ITG)", "Karlsruhe Institute of Technology", [
        "Institute of Toxicology and Genetics",
        "Institut of Toxicology and Genetics"
      ]],
      ["Institute of Chemical Process Engineering (CVT)", "Karlsruhe Institute of Technology", [
        "CVT",
      ]],
      ["Institute of Microstructure Technology (IMT)", "Karlsruhe Institute of Technology", [
        "IMT",
      ]],
      ["Institute of Applied Informatics and Formal Description Methods (AIFB)", "Karlsruhe Institute of Technology", [
        "AIFB",
      ]],
      ["Scientific Computing Center (SCC)", "Karlsruhe Institute of Technology", [
        "Scientific Computing Center - Data Exploitation Methods",
      ]]
    ]



    variations.each do |new_department, organization, variation_names|
      puts "Processing variations for #{new_department} (#{organization})"

      # Find all affiliations with any of these variations that don't have this ROR ID
      variation_names.each do |variation|
        affiliations = Affiliation.where(organization: organization, department: variation)
        if affiliations.any?
          puts "  Found #{affiliations.count} affiliations matching '#{variation}'"

          affiliations.each do |affiliation|

            # Update organization info
            affiliation.update_columns(
              department: new_department
            )

            puts "    Updated affiliation #{affiliation.id}: ' old: #{variation}' → 'new: #{new_department}' (org: #{organization})"
          end
        end
      end
    end

    puts "Completed organization variation standardization"
  end

  desc "Standardize country names (e.g., 'Deutschland' to 'Germany')"
  task standardize_country_names: :environment do
    country_mappings = {
      'Deutschland' => 'Germany',
      'Alemania' => 'Germany',
      'Allemagne' => 'Germany',
      'Geramany' => 'Germany',
      'DE' => 'Germany',
      '德国' => 'Germany',
      'france' => 'France',
      'France ' => 'France',
      '青岛' => 'China',
      '中国' => 'China',
      ' United States' => 'United States',
      'US' => 'United States',
      'USA' => 'United States',
      'india' => 'India',
      'China ' => 'China',
      'usa' => 'United States',
      'The UK' => 'United Kingdom',
      'UK' => 'United Kingdom',
      'Austria ' => 'Austria',
      'Sweden  ' => 'Sweden',
      'espagne' => 'Spain',
      'Россия' => 'Russian Federation',
      'russia' => 'Russian Federation',
      'Russia' => 'Russian Federation',
      'Україна' => 'Ukraine',
      'Украина' => 'Ukraine',
      'The Netherlands' => 'Netherlands',
      'United Kindgom' => 'United Kingdom',
      # Add more mappings as needed
    }

    puts "Starting country name standardization..."

    country_mappings.each do |old_name, new_name|
      # Find affiliations with the old country name
      affiliations = Affiliation.where(country: old_name)
      count = affiliations.count

      if count > 0
        puts "Found #{count} affiliations with country '#{old_name}'"

        # Update all matching affiliations
        updated = affiliations.update_all(country: new_name)

        puts "Updated #{updated} affiliations from '#{old_name}' to '#{new_name}'"
      else
        puts "No affiliations found with country '#{old_name}'"
      end
    end

    puts "Country name standardization completed"
  end

  desc "Delete unused affiliations (not referenced in user_affiliations or publications)"
  task delete_unused_affiliations: :environment do
    puts "Looking for unused affiliations..."

    # Step 1: Find all affiliation IDs currently in use

    # From user_affiliations table
    user_affiliation_ids = UserAffiliation.distinct.pluck(:affiliation_id)
    puts "Found #{user_affiliation_ids.size} affiliations referenced in user_affiliations"

    # From publications table - this requires checking JSON data
    publication_affiliation_ids = []

    # Use batching to handle large datasets efficiently
    if defined?(Publication)
      puts "Scanning publications for affiliation references..."
      publications_count = 0

      Publication.find_each(batch_size: 100) do |publication|
        publications_count += 1

        begin
          # Extract affiliation IDs from taggable_data if it exists
          if publication.respond_to?(:taggable_data) && publication.taggable_data.is_a?(Hash)
            # Check in creators.affiliationIds
            if publication.taggable_data["creators"].is_a?(Array)
              publication.taggable_data["creators"].each do |creator|
                if creator.is_a?(Hash) && creator["affiliationIds"].is_a?(Array)
                  publication_affiliation_ids.concat(creator["affiliationIds"].map(&:to_i))
                end
              end
            end

            # Check in affiliation_ids (top-level array)
            if publication.taggable_data["affiliation_ids"].is_a?(Array)
              publication_affiliation_ids.concat(publication.taggable_data["affiliation_ids"].map(&:to_i))
            end

            # Check in keys of affiliations hash
            if publication.taggable_data["affiliations"].is_a?(Hash)
              # Extract keys which are affiliation IDs
              affiliation_keys = publication.taggable_data["affiliations"].keys.map(&:to_i)
              publication_affiliation_ids.concat(affiliation_keys)
            end
          end
        rescue => e
          puts "Error processing publication #{publication.id}: #{e.message}"
        end

        # Show progress periodically
        puts "Processed #{publications_count} publications..." if publications_count % 1000 == 0
      end

      # Remove duplicates
      publication_affiliation_ids.uniq!
      puts "Found #{publication_affiliation_ids.size} affiliations referenced in publications"
    else
      puts "Publication model not found, skipping publication check"
    end

    # Combine all active affiliation IDs
    active_affiliation_ids = (user_affiliation_ids + publication_affiliation_ids).uniq
    puts "Total active affiliations: #{active_affiliation_ids.size}"

    # Step 2: Find affiliations that are not in the active list
    total_affiliations = Affiliation.count
    unused_affiliations = Affiliation.where.not(id: active_affiliation_ids)
    unused_count = unused_affiliations.count

    puts "Found #{unused_count} unused affiliations out of #{total_affiliations} total (#{(unused_count.to_f / total_affiliations * 100).round(1)}%)"
    puts unused_affiliations.pluck(:id).join(", ")
    puts unused_affiliations.pluck(:id, :organization).map { |id, org| "#{id}: #{org}" }

    if unused_count > 0
      # Safety check - don't delete too many at once without confirmation
      if unused_count > total_affiliations * 0.1 && unused_count > 10  # More than 10% and more than 10 records
        puts "\nWARNING: You're about to delete #{unused_count} affiliations, which is #{(unused_count.to_f / total_affiliations * 100).round(1)}% of all affiliations."
        puts "This is a significant portion of your data. Are you sure you want to proceed?"
        puts "Type 'yes' to continue or anything else to cancel:"

        confirm = STDIN.gets.strip.downcase
        if confirm != "yes"
          puts "Cancelled. No affiliations were deleted."
          exit
        end
      end

      # Option to export data before deletion
      puts "\nWould you like to export the list of affiliations to be deleted before proceeding? (y/n)"
      if STDIN.gets.strip.downcase == "y"
        csv_file = Rails.root.join("tmp", "unused_affiliations_#{Time.now.strftime('%Y%m%d_%H%M%S')}.csv")
        require 'csv'

        CSV.open(csv_file, "wb") do |csv|
          csv << ["ID", "Organization", "Department", "Country", "Original Organization", "ROR ID", "Created At", "Updated At"]

          unused_affiliations.find_each do |aff|
            csv << [
              aff.id,
              aff.organization,
              aff.department,
              aff.country,
              aff.original_organization,
              aff.ror_id,
              aff.created_at,
              aff.updated_at
            ]
          end
        end

        puts "Exported list to #{csv_file}"
      end

      # Final confirmation
      puts "\nReady to delete #{unused_count} unused affiliations."
      puts "Type 'DELETE' (all caps) to confirm deletion:"

      confirm = STDIN.gets.strip
      if confirm == "DELETE"
        # Perform deletion
        start_time = Time.now
        deleted_count = 0
        unused_affiliations.find_each(batch_size: 100) do |affiliation|
          affiliation.destroy
          deleted_count += 1

          # Show progress for large batches
          if deleted_count % 100 == 0
            puts "Soft-deleted #{deleted_count} affiliations so far..."
          end
        end
        duration = Time.now - start_time

        puts "Successfully deleted #{deleted_count} unused affiliations in #{duration.round(2)} seconds."
      else
        puts "Deletion cancelled. No affiliations were deleted."
      end
    else
      puts "No unused affiliations found. No action needed."
    end
  end

  desc "Delete specific hardcoded affiliations and their associated user_affiliations"
  task delete_bad_affiliations: :environment do
    # Hardcoded list of affiliation IDs to delete
    affiliation_orgs = [
      '',
      'A',
      'John',
      'HTC',
      'Test',
      'ornstein&cia',
      'THP',
      'no org',
      'c12ai',
      'personal', 'Personal',
      'Shanghai',
      'no',
      '-',
      'Self Employed',
      'University of Campinas',
      'snwt',
      'CZJS8LNAJO Zamuar Bosmir www.bloggreenapril.blogspot.com',
      'CEA',
      'noorg', 'student ',
      'bmy',
      'private',
      'cbc', 'sail.black', 'student',
      'Cheap goods',
      '1513', 'inc', 'DD',
      'K', 'ooooo', 'no_',
      # Add more IDs as needed
    ]

    affiliation_ids = [
      1848,1849,1850,1829,1830,1831
    ]

    puts "Processing #{affiliation_orgs.size} hardcoded affiliation IDs"

    # Check if these affiliations exist
    deleting_affiliations = Affiliation.where(organization: affiliation_orgs)
    deleting_affiliations = deleting_affiliations.or(Affiliation.where(id: affiliation_ids))

    # Also find affiliations with forward slash in organization name
    slash_affiliations = Affiliation.where("organization LIKE '%/%'")
    puts "Found #{slash_affiliations.count} affiliations containing a forward slash in the organization name"

    # Also find affiliations with 'www' in organization name
    www_affiliations = Affiliation.where("organization LIKE '%www%'")
    puts "Found #{www_affiliations.count} affiliations containing 'www' in the organization name"

    # Combine with the existing query
    deleting_affiliations = deleting_affiliations.or(slash_affiliations).or(www_affiliations)

    # Find associated user_affiliations
    associated_user_affiliations = UserAffiliation.where(affiliation_id: deleting_affiliations.pluck(:id))

    puts "\nSummary of what will be deleted:"
    puts "- #{deleting_affiliations.count} affiliations"
    puts "- #{associated_user_affiliations.count} user_affiliations"

    puts "\nAffiliations to be deleted:"
    deleting_affiliations.each do |aff|
      puts "  #{aff.id}: #{aff.organization} (#{aff.department})"

      # List users who will lose this affiliation
      user_count = associated_user_affiliations.where(affiliation_id: aff.id).count
      puts "    Used by #{user_count} users"
    end

    # Final confirmation
    puts "\nReady to delete these entries."
    puts "Type 'DELETE' (all caps) to confirm deletion:"


    # Determine whether to use soft delete or hard delete
    puts "\nDo you want to soft delete (can be restored) or permanently delete (cannot be undone)?"
    puts "Type 'soft' or 'permanent':"

    # delete_type = STDIN.gets.strip.downcase

    ActiveRecord::Base.transaction do
      begin
        start_time = Time.now

        # First delete user_affiliations
        # if delete_type == "permanent"
          deleted_ua_count = associated_user_affiliations.delete_all
          puts "Permanently deleted #{deleted_ua_count} user_affiliations"

          # Then delete affiliations
          deleted_aff_count = deleting_affiliations.delete_all
          puts "Permanently deleted #{deleted_aff_count} affiliations"
        # else
        #   # Soft delete
        #   deleted_ua_count = 0
        #   associated_user_affiliations.find_each do |ua|
        #     ua.destroy
        #     deleted_ua_count += 1
        #   end
        #   puts "Soft-deleted #{deleted_ua_count} user_affiliations"

        #   # Then soft delete affiliations
        #   deleted_aff_count = 0
        #   deleting_affiliations.find_each do |aff|
        #     aff.destroy
        #     deleted_aff_count += 1
        #   end
        #   puts "Soft-deleted #{deleted_aff_count} affiliations"
        # end

        duration = Time.now - start_time
        puts "Operation completed in #{duration.round(2)} seconds"

      rescue => e
        puts "Error occurred during deletion: #{e.message}"
        puts e.backtrace.join("\n")
        raise ActiveRecord::Rollback
      end
    end

  end


end