# frozen_string_literal: true

# Export single elements (Sample or Reaction) to zip format
# This class handles exporting individual publication elements with all their associated data
# Note: Collections should use ExportCollections directly
module Export
  class ExportElement < ExportCollections
    # Generate a zip file for a single element
    # @param export_id [String] unique identifier for the export
    # @param element_type [String] type of element ('Sample' or 'Reaction')
    # @param element_id [Integer] id of the element to export
    # @param format [String] export format (default: 'zip')
    # @param export_metadata [Hash] metadata about the export (optional)
    # @return [String] path to the generated zip file
    def self.generate(export_id, element_type, element_id, format = 'zip', export_metadata = nil)
      exporter = new(export_id, element_type, element_id, format)
      exporter.export_metadata = export_metadata if export_metadata
      exporter.prepare
      exporter.to_file
    end

    def initialize(export_id, element_type, element_id, format = 'zip')
      @export_id = export_id
      @element_type = element_type
      @element_id = element_id
      @format = format
      @gt = false
      @nested = false
      @collection_ids = []
      @export_metadata = nil

      @file_path = Rails.public_path.join(format, "#{export_id}.#{format}")
      @schema_file_path = Rails.public_path.join('json', 'schema.json')

      @data = {}
      @uuids = {}
      @attachments = []
      @datasets = []
      @images = []
    end

    # Prepare element data for export
    def prepare
      return unless @element_type && @element_id

      # Fetch klasses needed for Labimotion elements
      Labimotion::Export.fetch_element_klasses(&method(:fetch_many))
      Labimotion::Export.fetch_segment_klasses(&method(:fetch_many))
      Labimotion::Export.fetch_dataset_klasses(&method(:fetch_many))

      # Prepare data based on element type
      case @element_type
      when 'Sample'
        prepare_sample
      when 'Reaction'
        prepare_reaction
      else
        raise ArgumentError, "Unsupported element_type: #{@element_type}. Must be 'Sample' or 'Reaction'. Collections should use ExportCollections."
      end

      # Fetch segment properties
      fetch_segments
    end

    private

    # Prepare a single sample for export
    def prepare_sample
      sample = Sample.find(@element_id)
      collection = Collection.public_collection
      fetch_one(collection, {'user_id' => 'User'})

      # Fetch the sample with all its foreign key relationships
      fetch_one(sample, {
                  'molecule_name_id' => 'MoleculeName',
                  'molecule_id' => 'Molecule',
                  'fingerprint_id' => 'Fingerprint',
                  'created_by' => 'User',
                  'user_id' => 'User',
                })
      fetch_one(collection.collections_samples.find_by(sample_id: sample.id), {
                   'collection_id' => 'Collection',
                   'sample_id' => 'Sample',
                 })

      # Fetch related molecular data
      fetch_one(sample.fingerprint) if sample.fingerprint
      fetch_one(sample.molecule) if sample.molecule
      fetch_one(sample.molecule_name, {
                  'molecule_id' => 'Molecule',
                  'user_id' => 'User',
                }) if sample.molecule_name

      # Fetch residues
      fetch_many(sample.residues, {
                   'sample_id' => 'Sample',
                 })

      # Fetch chemical data if present
      if sample.chemical
        fetch_one(sample.chemical, {
                    'sample_id' => 'Sample',
                  })
      end

      # Fetch segments and collect attachments
      upload_att = Labimotion::Export.fetch_segments(sample, @uuids, nil, &method(:fetch_one))
      @attachments += upload_att if upload_att&.length&.positive?

      # Fetch containers (analyses and datasets)
      fetch_containers(sample)

      # Fetch literature references
      fetch_literals(sample)

      # Fetch publication citation from DOI
      fetch_publication_citation(sample)

      # Collect SVG image files
      fetch_image('samples', sample.sample_svg_file) if sample.sample_svg_file
      fetch_image('molecules', sample.molecule&.molecule_svg_file) if sample.molecule&.molecule_svg_file
    end

    # Prepare a single reaction for export
    def prepare_reaction
      reaction = Reaction.find(@element_id)

      collection = Collection.public_collection
      fetch_one(collection, {'user_id' => 'User'})

      # Fetch the reaction
      fetch_one(reaction, {
                  'created_by' => 'User',
                })

      fetch_one(collection.collections_reactions.find_by(reaction_id: reaction.id), {
                   'collection_id' => 'Collection',
                   'reaction_id' => 'Reaction',
                 })
      # Fetch all reaction-sample relationships
      [
        reaction.reactions_starting_material_samples,
        reaction.reactions_solvent_samples,
        reaction.reactions_purification_solvent_samples,
        reaction.reactions_reactant_samples,
        reaction.reactions_product_samples,
      ].each do |sample_associations|
        fetch_many(sample_associations, {
                     'reaction_id' => 'Reaction',
                     'sample_id' => 'Sample',
                   })
      end

      # Fetch all associated samples with their complete data
      fetch_many(collection.collections_samples.where(sample_id: reaction.samples.pluck(:id)), {
                   'collection_id' => 'Collection',
                   'sample_id' => 'Sample',
                 })

      reaction.samples.each do |sample|
        fetch_one(sample, {
                    'molecule_name_id' => 'MoleculeName',
                    'molecule_id' => 'Molecule',
                    'fingerprint_id' => 'Fingerprint',
                    'created_by' => 'User',
                    'user_id' => 'User',
                  })

        # Fetch sample molecular data
        fetch_one(sample.fingerprint) if sample.fingerprint
        fetch_one(sample.molecule) if sample.molecule
        fetch_one(sample.molecule_name, {
                    'molecule_id' => 'Molecule',
                    'user_id' => 'User',
                  }) if sample.molecule_name

        # Fetch sample residues
        fetch_many(sample.residues, {
                     'sample_id' => 'Sample',
                   })

        # Fetch sample containers (analyses, datasets, and attachments)
        fetch_containers(sample)

        # Collect sample images
        fetch_image('samples', sample.sample_svg_file) if sample.sample_svg_file
        fetch_image('molecules', sample.molecule&.molecule_svg_file) if sample.molecule&.molecule_svg_file
      end

      # Fetch segments and collect attachments
      upload_att = Labimotion::Export.fetch_segments(reaction, @uuids, nil, &method(:fetch_one))
      @attachments += upload_att if upload_att&.length&.positive?

      # Fetch containers (analyses and datasets)
      fetch_containers(reaction)

      # Fetch literature references
      fetch_literals(reaction)

      # Fetch publication citation from DOI
      fetch_publication_citation(reaction)

      # Collect reaction SVG
      fetch_image('reactions', reaction.reaction_svg_file) if reaction.reaction_svg_file
    end
  end
end
