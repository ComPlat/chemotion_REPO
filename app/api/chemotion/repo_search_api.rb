# frozen_string_literal: true

# Facet-driven search API behind the publication page.
#
# Separate from /api/v1/public/molecules and /reactions: those endpoints carry
# element-specific shape (lateral joins, embedded publication info) a faceted
# list doesn't need, and external callers rely on them staying unchanged.
module Chemotion
  class RepoSearchAPI < Grape::API
    include Grape::Kaminari
    # MV helper transitively includes the live helper; each method runtime-
    # dispatches on `RepoSearchConfig.use_mv`.
    helpers RepoSearchFacetHelpersMv
    helpers ParamsHelpers

    namespace :repo_search do
      helpers do
        # Pull the filter set from the request params. Keys are arrays so the
        # SQL helpers can treat them uniformly.
        def collect_filters
          %i[years authors contributors institutions element_types ontologies reaction_types embargoes]
            .index_with { |k| Array(params[k]).flatten }
            .merge(scheme_only: scheme_only_param, q: params[:q].to_s.strip.presence)
        end

        def scheme_only_param
          val = params[:scheme_only]
          return nil if val.nil? || val.to_s.empty?

          ActiveModel::Type::Boolean.new.cast(val)
        end

        # Returns `nil` when no structure query is provided; otherwise an
        # array (possibly empty) of Sample IDs that match the structure.
        def structure_sample_ids
          molfile = params[:structure_query].to_s.strip
          return nil if molfile.empty?

          match = (params[:structure_match].presence || 'sub').downcase
          rel = case match
                when 'sim'
                  threshold = (params[:tanimoto].presence || 0.7).to_f
                  Sample.search_by_fingerprint_sim(molfile, threshold)
                else
                  Sample.search_by_fingerprint_sub(molfile)
                end
          rel.pluck(:id)
          # Empty result for a structure query means zero hits regardless of
          # other filters. Caller treats nil and empty-array differently.
        rescue StandardError => e
          Rails.logger.warn("RepoSearchAPI structure_query failed: #{e.message}")
          # Fail closed: surface a structured error to the client instead of
          # silently widening the result set.
          error!({ error: 'invalid_structure_query', message: e.message }, 400)
        end

        # Emit one structured line to log/publication_search.log per request.
        # `scope` decides the path: MV-backed search runs against
        # VPublicationSearch, everything else is the live (REALTIME) join.
        # Logging never breaks a request — failures degrade to a warn.
        def log_repo_search(event:, scope:, **info)
          payload = {
            source: 'publication',
            event: event,
            mode: scope.klass == VPublicationSearch ? 'MV' : 'REALTIME',
            use_mv_flag: RepoSearchConfig.use_mv,
            user_id: current_user&.id,
          }.merge(info)
          RepoSearchConfig.logger.info(RepoSearchConfig.format_payload(payload))
        rescue StandardError => e
          Rails.logger.warn("RepoSearchAPI logging failed: #{e.message}")
        end

        # Non-empty filters, collapsed to a compact shape: arrays become their
        # length so a busy author filter doesn't dump 40 ids into the log.
        def loggable_filters(filters)
          filters.compact_blank
                 .transform_values { |v| v.is_a?(Array) ? v.size : v }
        end

        def monotonic_ms(since)
          ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - since) * 1000).round(1)
        end
      end

      # ------------------------------------------------------------------
      # GET /api/v1/repo_search/facets
      # Returns aggregated counts for each facet given the current filter
      # set. Populates the left-side panel.
      # ------------------------------------------------------------------
      desc 'Aggregated facet counts for the publication search panel'
      params do
        optional :years, type: [Integer]
        optional :authors, type: [Integer]
        optional :contributors, type: [Integer]
        optional :institutions, type: [String]
        optional :element_types, type: [String]
        optional :ontologies, type: [String]
        optional :reaction_types, type: [String]
        optional :embargoes, type: [String]
        optional :scheme_only, type: Boolean
        optional :q, type: String
        optional :structure_query, type: String
        optional :structure_match, type: String, values: %w[sub sim]
        optional :tanimoto, type: Float
      end
      get :facets do
        t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        filters = collect_filters
        struct_ids = structure_sample_ids
        # Each facet is computed against a scope that excludes its own filter
        # so users can OR-extend a selection (e.g. add 2024 next to 2025
        # without 2024 disappearing the moment 2025 is picked).
        scope_for = lambda do |except_keys|
          apply_filters(
            base_publication_scope,
            filters.except(*Array(except_keys)),
            structure_sample_ids: struct_ids,
          )
        end
        scheme_clause = scheme_only_clause
        # Element & Scheme-only share one facet group, so each option is
        # computed against a scope that excludes BOTH selections — otherwise
        # ticking Scheme-only would hide the Sample option. Reaction types
        # narrow to Reaction-only, so they're excluded too to keep Sample's
        # count meaningful.
        element_group_keys = %i[element_types scheme_only reaction_types]

        log_repo_search(
          event: 'facets',
          scope: base_publication_scope,
          filters: loggable_filters(filters),
          structure: !struct_ids.nil?,
          structure_hits: struct_ids&.size,
          duration_ms: monotonic_ms(t0),
        )

        {
          years: facet_years(scope_for.call(:years)),
          element_types: facet_element_types(scope_for.call(element_group_keys)),
          reaction_types: facet_reaction_types(scope_for.call(:reaction_types)),
          authors: facet_authors(scope_for.call(:authors)),
          contributors: facet_contributors(scope_for.call(:contributors)),
          institutions: facet_institutions(scope_for.call(:institutions)),
          ontologies: facet_ontologies(scope_for.call(:ontologies)),
          embargoes: facet_embargoes(scope_for.call(:embargoes)),
          scheme_only: { count: scope_for.call(element_group_keys).where(scheme_clause).count },
        }
      end

      # ------------------------------------------------------------------
      # GET /api/v1/repo_search/facet_values
      # Autocomplete for one facet. Backs the AsyncSelect dropdowns.
      # ------------------------------------------------------------------
      desc 'Autocomplete suggestions for a single facet'
      params do
        requires :facet, type: String,
                         values: %w[year author contributor institution ontology reaction_type embargo]
        optional :q, type: String, default: ''
        optional :limit, type: Integer, default: RepoSearchFacetHelpers::DEFAULT_FACET_VALUE_LIMIT
      end
      get :facet_values do
        limit = [params[:limit].to_i, RepoSearchFacetHelpers::MAX_FACET_VALUE_LIMIT].min
        case params[:facet]
        when 'year'
          { result: autocomplete_years }
        when 'author'
          { result: autocomplete_authors(params[:q], limit: limit) }
        when 'contributor'
          { result: autocomplete_contributors(params[:q], limit: limit) }
        when 'institution'
          { result: autocomplete_institutions(params[:q], limit: limit) }
        when 'ontology'
          { result: autocomplete_ontologies(params[:q], limit: limit) }
        when 'reaction_type'
          { result: autocomplete_reaction_types(params[:q], limit: limit) }
        when 'embargo'
          { result: autocomplete_embargoes(params[:q], limit: limit) }
        end
      end

      # ------------------------------------------------------------------
      # GET /api/v1/repo_search/results
      # Paginated search results.
      # ------------------------------------------------------------------
      desc 'Faceted publication search results'
      params do
        optional :years, type: [Integer]
        optional :authors, type: [Integer]
        optional :contributors, type: [Integer]
        optional :institutions, type: [String]
        optional :element_types, type: [String]
        optional :ontologies, type: [String]
        optional :reaction_types, type: [String]
        optional :embargoes, type: [String]
        optional :scheme_only, type: Boolean
        optional :q, type: String
        optional :structure_query, type: String
        optional :structure_match, type: String, values: %w[sub sim]
        optional :tanimoto, type: Float
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 20
        optional :sort, type: String, values: %w[recent oldest], default: 'recent'
      end
      get :results do
        t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        filters = collect_filters
        struct_ids = structure_sample_ids
        scope = apply_filters(base_publication_scope, filters, structure_sample_ids: struct_ids)

        scope = case params[:sort]
                when 'oldest' then scope.order(published_at: :asc)
                else scope.order(published_at: :desc)
                end

        per_page = params[:per_page].to_i.clamp(1, 100)
        page = params[:page].to_i
        total = scope.count

        # MV path returns VPublicationSearch rows; the entity layer expects
        # full Publication AR objects with `:doi` and `:element` preloaded.
        # Pluck publication ids from the MV-ordered scope and reload — one
        # round-trip, order preserved.
        publications = if scope.klass == VPublicationSearch
                         ids = scope.limit(per_page).offset((page - 1) * per_page).pluck(:publication_id)
                         by_id = Publication.where(id: ids).includes(:doi, :element).index_by(&:id)
                         ids.filter_map { |id| by_id[id] }
                       else
                         scope.includes(:doi, :element)
                              .limit(per_page).offset((page - 1) * per_page).to_a
                       end

        log_repo_search(
          event: 'results',
          scope: scope,
          total: total,
          returned: publications.size,
          page: page,
          per_page: per_page,
          sort: params[:sort],
          filters: loggable_filters(filters),
          structure: !struct_ids.nil?,
          structure_hits: struct_ids&.size,
          duration_ms: monotonic_ms(t0),
        )

        entity_opts = {
          serializable: true,
          embargo_by_pub_id: embargo_labels_by_publication_id(publications),
          contributor_by_pub_id: contributors_by_publication_id(publications),
          contributor_abbreviation_by_pub_id: contributor_abbreviations_by_publication_id(publications),
          contributor_affiliation_by_pub_id: contributor_affiliations_by_publication_id(publications),
          ana_cnt_by_pub_id: ana_cnt_by_publication_id(publications),
          xvial_by_pub_id: xvial_by_publication_id(publications, current_user),
        }

        {
          total: total,
          page: page,
          per_page: per_page,
          results: Entities::RepoSearchPublicationHitEntity.represent(publications, entity_opts),
        }
      end
    end
  end
end
