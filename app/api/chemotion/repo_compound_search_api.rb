# frozen_string_literal: true

# Molecule Archive search endpoint: free-text + structure search, server-side
# facet aggregation and per-facet filters. Kept apart from
# PublicRepoAPI#molecules (the Sample browser and external callers) so those
# requests don't pay for archive-only logic.
#
# Filter/scope/facet logic lives in RepoArchiveFacetHelpers (live) and
# RepoArchiveFacetHelpersMv (overlay). When RepoSearchConfig.use_mv is on,
# the overlay reads from `v_molecule_archive`; otherwise the live SQL path
# runs.
#
# Mounted under /api/v1/repo_compound_search; whitelisted in
# RepoAPI::PUBLIC_URLS so anonymous callers reach it without authenticate!.

module Chemotion
  class RepoCompoundSearchAPI < Grape::API
    include Grape::Kaminari
    helpers CompoundHelpers
    helpers PublicHelpers
    helpers ParamsHelpers
    helpers RepoArchiveFacetHelpersMv

    namespace :repo_compound_search do
      resource :molecules do
        desc 'Faceted search over the public molecule archive (xvial-backed samples)'
        params do
          optional :page, type: Integer, desc: 'page'
          optional :pages, type: Integer, desc: 'pages'
          optional :per_page, type: Integer, desc: 'per page'
          optional :adv_flag, type: Boolean, desc: 'advanced search?'
          optional :adv_type, type: String, desc: 'advanced search type', values: %w[Authors Contributors Ontologies Embargo Label]
          optional :adv_val, type: Array[String], desc: 'advanced search value', regexp: /^(\d+|([[:alpha:]]+:\d+))$/
          optional :label_val, type: Integer, desc: 'label_val'
          optional :q, type: String, desc: 'free text search (IUPAC/InChI/InChIKey/SMILES/sum formula)'
          optional :structure_query, type: String, desc: 'molfile for structure search'
          optional :structure_match, type: String, values: %w[sub sim], default: 'sub'
          optional :tanimoto, type: Float, desc: 'similarity threshold (0..1) for sim match'
          optional :sort, type: String, values: %w[recent oldest], default: 'recent', desc: 'sort by publication date'
          optional :archive_years, type: Array[String], desc: 'archive year filter'
          optional :archive_providers, type: Array[String], desc: 'archive provider filter'
          optional :archive_groups, type: Array[String], desc: 'archive group filter'
          optional :archive_has_analyses, type: Array[String], values: %w[yes no], desc: 'archive has-analyses filter'
          optional :archive_embargoes, type: Array[String], desc: 'archive embargo bundle filter'
        end
        paginate per_page: 10, offset: 0, max_per_page: 100
        get '/' do
          t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
          input = build_archive_input(params, Collection.public_collection_id, current_user&.id)

          mol_scope = archive_mol_scope(input)
          total_count = archive_total_count(input)
          archive_facets_data = archive_facets(input, total_count: total_count)

          log_archive_search(
            input: input,
            total_count: total_count,
            duration_ms: ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0) * 1000).round(1),
          )

          reset_pagination_page(mol_scope)
          list = paginate(mol_scope)

          entities = Entities::MoleculePublicationListEntity.represent(list, serializable: true)
          sids = entities.map { |e| e[:sid] }.compact.map(&:to_i)
          meta_by_sid = archive_per_result_meta_by_sid(sids)

          com_config = Rails.configuration.compound_opendata
          show_xvial_com = com_config.present? && com_config.allowed_uids.include?(current_user&.id)
          x_com_set = if show_xvial_com && sids.any?
                        Sample.joins(get_xvial_sql(input.req_xvial)).where(id: sids).distinct.pluck(:id).to_set
                      else
                        Set.new
                      end
          x_cnt_set = sids.uniq.to_set

          entities.each do |obj|
            sid_i = obj[:sid].to_i
            meta = meta_by_sid[sid_i]
            obj[:ana_cnt] = meta ? meta['ana_cnt'].to_i : 0
            obj[:embargo] = meta ? (meta['embargo'] || '') : ''
            obj[:publication] = meta ? (meta['publication'].presence || {}) : {}
            obj[:xvial_count] = 1 if x_cnt_set.include?(sid_i)
            obj[:xvial_com] = 1 if show_xvial_com && x_com_set.include?(sid_i)
            obj[:xvial_archive] = get_xdata(obj[:inchikey], sid_i, input.req_xvial)
          end

          { molecules: entities, facets: archive_facets_data }
        end
      end
    end
  end
end
