require 'net/http'
require 'uri'
require 'json'

class RorApiClient
  BASE_URL = "https://api.ror.org/v2/organizations"

  def self.search_organization(name, country)
    return nil if name.blank?

    # Clean up the name
    query = name.strip

    # Build query parameters
    params = {
      query: query
    }

    # Add country filter if provided
    params[:filter] = "country.country_name:#{country}" if country.present?

    # Perform the request
    uri = URI(BASE_URL)
    uri.query = URI.encode_www_form(params)

    begin
      puts "Searching ROR API with URL: #{uri}"
      response = Net::HTTP.get_response(uri)

      if response.code == "200"
        data = JSON.parse(response.body)
        puts "ROR API response received with #{data["number_of_results"]} results"

        # Check if we have any results
        if data["number_of_results"].to_i > 0
          best_match = data["items"].first
          puts "Names in response: #{best_match["names"].inspect}"

          # Get the display name (name with the "ror_display" type)
          display_name = find_ror_display_name(best_match["names"])
          
          # Calculate simple match score to evaluate quality
          score = calculate_match_score(query, best_match, country)
          puts "Best match: #{display_name}, Score: #{score}"

          # Only return the match if it's good enough
          if score >= 0.5
            return {
              ror_id: best_match["id"]&.gsub("https://ror.org/", ""),
              name: display_name,
              country: best_match.dig('locations')&.first&.dig('geonames_details', 'country_name'),
              score: score
            }
          end
        end
      else
        puts "ROR API error: #{response.code} - #{response.body}"
        Rails.logger.error "ROR API error: #{response.code} - #{response.body}"
      end

      return nil
    rescue => e
      Rails.logger.error "ROR API error: #{e.message}"
      puts "ROR API error: #{e.message}"
      puts e.backtrace.join("\n")
      return nil
    end
  end

  def self.get_by_ror_id(ror_id)
    return nil if ror_id.blank?

    # Ensure the ID is properly formatted
    ror_id = ror_id.gsub("https://ror.org/", "")

    # Build the URI
    uri = URI("#{BASE_URL}/#{ror_id}")

    begin
      response = Net::HTTP.get_response(uri)

      if response.code == "200"
        data = JSON.parse(response.body)
        
        # Get display name from names array
        display_name = find_ror_display_name(data["names"])

        return {
          ror_id: data["id"]&.gsub("https://ror.org/", ""),
          name: display_name,
          country: data.dig("country", "country_name"),
          types: data["types"],
          email_domains: data["email_domains"],
          links: data["links"],
          aliases: data["names"]&.select { |n| n["types"]&.include?("alias") }&.map { |n| n["value"] } || []
        }
      else
        Rails.logger.error "ROR API error: #{response.code} - #{response.body}"
      end

      return nil
    rescue => e
      Rails.logger.error "ROR API error: #{e.message}"
      puts "ROR API error: #{e.message}"
      puts e.backtrace.join("\n")
      return nil
    end
  end

  private

  # Helper method to find the name with "ror_display" type
  def self.find_ror_display_name(names)
    if names.present?
      # First try to find a name with "ror_display" type
      display_name = names.find { |n| n["types"]&.include?("ror_display") }
      return display_name["value"] if display_name

      # If no ror_display, try to find a name with "label" type
      label_name = names.find { |n| n["types"]&.include?("label") }
      return label_name["value"] if label_name

      # If neither is found, return the first name's value
      return names.first["value"] if names.first["value"].present?
    end
    
    # Fallback if no valid name is found
    "Unknown Organization"
  end

  def self.calculate_match_score(query, result, country = nil)
    score = 0.0
    
    begin
      # Check all names for matches
      if result["names"].present?
        # Get all name values
        all_name_values = result["names"].map { |n| n["value"].downcase }
        
        # Calculate similarity for each name
        name_scores = all_name_values.map { |name_value| string_similarity(query.downcase, name_value) }
        
        # Use the best matching name for the primary score
        best_score = name_scores.max || 0
        score += best_score * 0.7
        
        # Bonus for having multiple good matches
        good_matches = name_scores.count { |s| s > 0.5 }
        score += (good_matches * 0.05) if good_matches > 1
      end

      # Check acronyms (if available)
      if result["acronyms"].present?
        acronym_scores = result["acronyms"].map { |a| string_similarity(query.downcase, a.downcase) }
        score += acronym_scores.max * 0.1 if acronym_scores.any?
      end

      # Country match
      if country.present? && result.dig("country", "country_name").present?
        if country.downcase == result["country"]["country_name"].downcase
          score += 0.1
        end
      end

      score
    rescue => e
      Rails.logger.error "Error calculating match score: #{e.message}"
      puts "Error calculating match score: #{e.message}"
      puts e.backtrace.join("\n")
      return 0.0
    end
  end

  def self.string_similarity(str1, str2)
    # Simple Levenshtein distance-based similarity
    distance = levenshtein_distance(str1, str2)
    max_length = [str1.length, str2.length].max

    return 0 if max_length.zero?
    1.0 - (distance.to_f / max_length)
  end

  def self.levenshtein_distance(str1, str2)
    # Implementation of Levenshtein distance algorithm
    # This is a simple version - for production, consider using a gem
    m = str1.length
    n = str2.length

    return m if n.zero?
    return n if m.zero?

    d = Array.new(m + 1) { Array.new(n + 1) }

    (0..m).each { |i| d[i][0] = i }
    (0..n).each { |j| d[0][j] = j }

    (1..n).each do |j|
      (1..m).each do |i|
        cost = str1[i-1] == str2[j-1] ? 0 : 1
        d[i][j] = [d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + cost].min
      end
    end

    d[m][n]
  end
end