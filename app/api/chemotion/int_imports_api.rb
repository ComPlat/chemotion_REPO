# frozen_string_literal: true

module Chemotion
  class IntImportsAPI < Grape::API
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers SampleHelpers

    helpers do
      def find_or_create_import_collection(label, user)
        collection = Collection.find_by(user_id: user.id, label: label, is_locked: true)

        unless collection
          collection = Collection.new(user_id: user.id, label: label)
          collection.save
        end

        collection
      end

      def load_partner_whitelist
        whitelist_path = Rails.root.join('config', 'partner_import_whitelist.yml')
        return [] unless File.exist?(whitelist_path)

        config = YAML.load_file(whitelist_path)
        config['allowed_partners'] || []
      end

      def partner_whitelisted?(partner)
        whitelist = load_partner_whitelist
        whitelist.include?(partner)
      end

      def validate_partner_auth
        partner = request.headers['Partner']
        error!('403 Forbidden: Partner header is required', 403) if partner.blank?
        error!('403 Forbidden: Partner not whitelisted', 403) unless partner_whitelisted?(partner)
        partner
      end
    end

    resource :int do
      namespace :import do
        desc 'Import a single sample from a partner system'
        namespace :sample do
          params do
            requires :molfile, type: String, desc: 'Molfile content'
            optional :sample_name, type: String, desc: 'Sample name'
            optional :external_label, type: String, desc: 'Sample external label'
            optional :metadata, type: Hash, desc: 'Additional sample metadata' do
              optional :target_amount_value, type: Float, desc: 'Sample target amount value'
              optional :target_amount_unit, type: String, desc: 'Sample target amount unit'
              optional :real_amount_value, type: Float, desc: 'Sample real amount value'
              optional :real_amount_unit, type: String, desc: 'Sample real amount unit'
              optional :molarity_value, type: Float, desc: 'Sample molarity value'
              optional :molarity_unit, type: String, desc: 'Sample molarity unit'
              optional :description, type: String, desc: 'Sample description'
              optional :purity, type: Float, desc: 'Sample purity'
              optional :location, type: String, desc: 'Sample location'
              optional :density, type: Float, desc: 'Sample density'
              optional :dry_solvent, default: false, type: Boolean, desc: 'Sample dry solvent'
              optional :solvent, type: Array[Hash], desc: 'Sample solvent'
              optional :is_top_secret, type: Boolean, default: false, desc: 'Sample is marked as top secret'
              optional :decoupled, type: Boolean, default: false, desc: 'Sample is decoupled from structure'
            end
          end

          post do
            # Authorization check
            error!('401 Unauthorized', 401) unless current_user

            # Validate partner
            partner = validate_partner_auth

            # 1. Find or create collection named 'Imported Data (Partner)'
            collection_label = "Imported Data (#{partner})"
            collection = find_or_create_import_collection(collection_label, current_user)
            error!('400 Collection creation failed', 400) unless collection

            # 2. Find or create molecule based on molfile
            molfile = params[:molfile]
            error!('400 Molfile is required', 400) if molfile.blank?

            metadata = params[:metadata] || {}
            molecule = if metadata[:decoupled]
                         Molecule.find_or_create_dummy
                       else
                         Molecule.find_or_create_by_molfile(molfile)
                       end

            unless molecule
              # Get more details about why molecule creation failed
              babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile) rescue nil
              error_msg = if babel_info
                            "Molecule creation failed. InChI: #{babel_info[:inchikey]}, Error: #{babel_info[:ob_log]}"
                          else
                            'Molecule creation failed. Unable to parse molfile'
                          end
              error!("400 #{error_msg}", 400)
            end

            # 3. Create a new sample
            sample_attributes = {
              name: params[:sample_name] || "Sample #{Time.now.to_i}",
              external_label: params[:external_label],
              target_amount_value: metadata[:target_amount_value] || 0.0,
              target_amount_unit: metadata[:target_amount_unit] || 'g',
              real_amount_value: metadata[:real_amount_value],
              real_amount_unit: metadata[:real_amount_unit] || 'g',
              molarity_value: metadata[:molarity_value],
              molarity_unit: metadata[:molarity_unit] || 'M',
              description: metadata[:description],
              purity: metadata[:purity] || 1.0,
              location: metadata[:location],
              dry_solvent: metadata[:dry_solvent],
              solvent: metadata[:solvent],
              molecule_id: molecule.id,
              created_by: current_user.id,
              decoupled: metadata[:decoupled] || false,
              density: metadata[:density],
            }

            sample = Sample.new(sample_attributes)

            # Add sample to collection (must be done before save due to validation)
            sample.collections << collection

            # Set melting and boiling point ranges
            boiling_point_lowerbound = -Float::INFINITY
            boiling_point_upperbound = Float::INFINITY
            melting_point_lowerbound = -Float::INFINITY
            melting_point_upperbound = Float::INFINITY
            sample.boiling_point = Range.new(boiling_point_lowerbound, boiling_point_upperbound)
            sample.melting_point = Range.new(melting_point_lowerbound, melting_point_upperbound)

            # Save sample
            error!('400 Sample creation failed', 400) unless sample.save

            # Return the created sample
            {
              id: sample.id,
              short_label: sample.short_label,
              name: sample.name,
              external_label: sample.external_label
            }
          end
        end

        desc 'Import multiple samples from a partner system'
        namespace :samples do
          params do
            requires :samples, type: Array, desc: 'Array of samples to import' do
              requires :molfile, type: String, desc: 'Molfile content'
              optional :sample_name, type: String, desc: 'Sample name'
              optional :external_label, type: String, desc: 'Sample external label'
              optional :metadata, type: Hash, desc: 'Additional sample metadata' do
                optional :target_amount_value, type: Float, desc: 'Sample target amount value'
                optional :target_amount_unit, type: String, desc: 'Sample target amount unit'
                optional :real_amount_value, type: Float, desc: 'Sample real amount value'
                optional :real_amount_unit, type: String, desc: 'Sample real amount unit'
                optional :molarity_value, type: Float, desc: 'Sample molarity value'
                optional :molarity_unit, type: String, desc: 'Sample molarity unit'
                optional :description, type: String, desc: 'Sample description'
                optional :purity, type: Float, desc: 'Sample purity'
                optional :location, type: String, desc: 'Sample location'
                optional :density, type: Float, desc: 'Sample density'
                optional :dry_solvent, default: false, type: Boolean, desc: 'Sample dry solvent'
                optional :solvent, type: Array[Hash], desc: 'Sample solvent'
                optional :is_top_secret, type: Boolean, default: false, desc: 'Sample is marked as top secret'
                optional :decoupled, type: Boolean, default: false, desc: 'Sample is decoupled from structure'
              end
            end
          end

          post do
            # Authorization check
            error!('401 Unauthorized', 401) unless current_user

            # Validate partner
            partner = validate_partner_auth

            # 1. Find or create collection named 'Imported Data (Partner)'
            collection_label = "Imported Data (#{partner})"
            collection = find_or_create_import_collection(collection_label, current_user)
            error!('400 Collection creation failed', 400) unless collection

            # Process each sample
            results = []
            errors = []

            params[:samples].each_with_index do |sample_params, index|
              begin
                # 2. Find or create molecule based on molfile
                molfile = sample_params[:molfile]
                if molfile.blank?
                  errors << { index: index, error: 'Molfile is required' }
                  next
                end

                metadata = sample_params[:metadata] || {}
                molecule = if metadata[:decoupled]
                             Molecule.find_or_create_dummy
                           else
                             Molecule.find_or_create_by_molfile(molfile)
                           end

                unless molecule
                  # Get more details about why molecule creation failed
                  babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile) rescue nil
                  error_details = {
                    index: index,
                    error: 'Molecule creation failed',
                    sample_name: sample_params[:sample_name],
                    external_label: sample_params[:external_label],
                  }
                  errors << error_details
                  next
                end

                # 3. Create a new sample
                sample_attributes = {
                  name: sample_params[:sample_name] || "Sample #{Time.now.to_i}_#{index}",
                  external_label: sample_params[:external_label],
                  target_amount_value: metadata[:target_amount_value] || 0.0,
                  target_amount_unit: metadata[:target_amount_unit] || 'g',
                  real_amount_value: metadata[:real_amount_value],
                  real_amount_unit: metadata[:real_amount_unit] || 'g',
                  molarity_value: metadata[:molarity_value],
                  molarity_unit: metadata[:molarity_unit] || 'M',
                  description: metadata[:description],
                  purity: metadata[:purity] || 1.0,
                  location: metadata[:location],
                  dry_solvent: metadata[:dry_solvent],
                  solvent: metadata[:solvent],
                  molecule_id: molecule.id,
                  created_by: current_user.id,
                  decoupled: metadata[:decoupled] || false,
                  density: metadata[:density],
                }

                sample = Sample.new(sample_attributes)

                # Add sample to collection (must be done before save due to validation)
                sample.collections << collection

                # Set melting and boiling point ranges
                boiling_point_lowerbound = -Float::INFINITY
                boiling_point_upperbound = Float::INFINITY
                melting_point_lowerbound = -Float::INFINITY
                melting_point_upperbound = Float::INFINITY
                sample.boiling_point = Range.new(boiling_point_lowerbound, boiling_point_upperbound)
                sample.melting_point = Range.new(melting_point_lowerbound, melting_point_upperbound)

                # Save sample
                if sample.save
                  results << {
                    index: index,
                    id: sample.id,
                    short_label: sample.short_label,
                    sample_name: sample.name,
                    external_label: sample.external_label
                  }
                else
                  errors << { index: index, error: 'Sample creation failed', details: sample.errors.full_messages }
                end
              rescue StandardError => e
                errors << { index: index, error: e.message }
              end
            end

            # Return results
            {
              success_count: results.count,
              error_count: errors.count,
              total_count: params[:samples].count,
              samples: results,
              errors: errors
            }
          end
        end
      end
    end
  end
end
