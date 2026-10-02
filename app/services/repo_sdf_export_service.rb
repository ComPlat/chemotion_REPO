# frozen_string_literal: true

# Streams published Repository samples as a single SDF file.
#
# Each entry is a MOL block followed by SD property tags terminated by `$$$$`,
# matching the format expected by ChemSpider for bulk ingestion.
#
# Usage:
#   RepoSdfExportService.new(from: 1.month.ago).to_sdf
#   RepoSdfExportService.new.stream(File.open('out.sdf', 'w'))
class RepoSdfExportService
  REQUIRED_FIELDS = %w[CHEMOTION_ID CHEMOTION_URL DOI PUBLISHED_AT].freeze
  SAMPLE_OPTIONAL_FIELDS = %w[
    INCHI INCHIKEY CANONICAL_SMILES SUM_FORMULA MOLECULAR_WEIGHT IUPAC_NAME
  ].freeze

  PUBLIC_HOST = (ENV['PUBLIC_URL'].presence || 'https://www.chemotion-repository.net').sub(%r{/+\z}, '')

  attr_reader :from, :to, :fields

  def initialize(from: nil, to: nil, fields: nil)
    @from = parse_time(from)
    @to = parse_time(to)
    requested = Array(fields).flat_map { |f| f.to_s.split(',') }.map { |f| f.strip.upcase }.reject(&:empty?)
    @fields = (REQUIRED_FIELDS + (requested.presence || SAMPLE_OPTIONAL_FIELDS)).uniq
  end

  def to_sdf
    io = StringIO.new
    stream(io)
    io.string
  end

  def stream(io)
    each_record { |entry| io << entry }
    io
  end

  def each_record(&block)
    return enum_for(:each_record) unless block

    write_samples(&block)
  end

  private

  def write_samples
    sample_publications.find_each do |publication|
      sample = publication.element
      next if sample&.molfile.blank?

      yield render_sample(sample, publication)
    end
  end

  def sample_publications
    scope = Publication.where(element_type: 'Sample', state: Publication::STATE_COMPLETED, deleted_at: nil)
    scope = scope.where(publications: { published_at: from.. }) if from
    scope = scope.where(publications: { published_at: ..to }) if to
    scope.includes(:doi)
  end

  def render_sample(sample, publication)
    properties = required_properties(publication)
    properties.merge!(sample_optional_properties(sample))
    sdf_entry(molfile_for(sample), properties)
  end

  def required_properties(publication)
    {
      'CHEMOTION_ID' => "CRS-#{publication.id}",
      'CHEMOTION_URL' => "#{PUBLIC_HOST}/pid/#{publication.id}",
      'DOI' => publication.doi&.full_doi.to_s,
      'PUBLISHED_AT' => publication.published_at&.utc&.iso8601.to_s,
    }
  end

  def sample_optional_properties(sample)
    molecule = sample.molecule
    {
      'INCHI' => molecule&.inchistring.to_s,
      'INCHIKEY' => molecule&.inchikey.to_s,
      'CANONICAL_SMILES' => molecule&.cano_smiles.to_s,
      'SUM_FORMULA' => molecule&.sum_formular.to_s,
      'MOLECULAR_WEIGHT' => molecule&.molecular_weight.to_s,
      'IUPAC_NAME' => molecule&.iupac_name.to_s,
    }
  end

  def molfile_for(sample)
    if sample.respond_to?(:molfile_pubchem)
      sample.molfile_pubchem.presence || sample.molfile.to_s
    else
      sample.molfile.to_s
    end
  end

  def sdf_entry(molfile, properties)
    body = +molfile.to_s
    body << "\n" unless body.end_with?("\n")
    fields.each do |key|
      next unless properties.key?(key)

      value = properties[key].to_s
      next if value.empty?

      body << "> <#{key}>\n#{value}\n\n"
    end
    body << "$$$$\n"
    body
  end

  def parse_time(value)
    return nil if value.nil? || value.to_s.strip.empty?
    return value if value.is_a?(Time) || value.is_a?(DateTime) || value.is_a?(Date)

    Time.zone.parse(value.to_s)
  end
end
