import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import PropTypes from 'prop-types';
import RepoSearchFetcher from 'src/repo/fetchers/RepoSearchFetcher';
import FacetPanel from 'src/repo/chemrepo/publicationSearch/FacetPanel';
import ResultsList from 'src/repo/chemrepo/publicationSearch/ResultsList';
import SearchBar from 'src/repo/chemrepo/publicationSearch/SearchBar';
import { consumePublicationSearchSeed } from 'src/repo/chemrepo/publicationSearch/searchSeed';

const EMPTY_FILTERS = {
  years: [],
  authors: [],
  contributors: [],
  institutions: [],
  elementTypes: [],
  ontologies: [],
  reactionTypes: [],
  embargoes: [],
};

const DEFAULT_PER_PAGE = 20;

const toggleValue = (list, value) => {
  if (list.includes(value)) return list.filter((v) => v !== value);
  return [...list, value];
};

const hasAnyFilter = (filters, schemeOnly, query, structureQuery) => (
  Object.values(filters).some((arr) => Array.isArray(arr) && arr.length > 0)
  || !!schemeOnly
  || !!query
  || !!structureQuery
);

const PublicationSearchPage = ({ onResultClick, onPanelOpen, detailOpen }) => {
  // One-shot seed handed across from the welcome page. useState's lazy
  // initializer runs exactly once, so consume() only fires on mount.
  const [seed] = useState(() => consumePublicationSearchSeed());
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    ...((seed && seed.filters) || {}),
  }));
  const [schemeOnly, setSchemeOnly] = useState(null);
  const [query, setQuery] = useState((seed && seed.q) || '');
  const [structureQuery, setStructureQuery] = useState((seed && seed.structureQuery) || '');
  const [structureMatch, setStructureMatch] = useState((seed && seed.structureMatch) || 'sub');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [facets, setFacets] = useState({});
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(!detailOpen);

  const fetchPayload = useMemo(
    () => ({
      ...filters, q: query, structureQuery, structureMatch, schemeOnly,
    }),
    [filters, query, structureQuery, structureMatch, schemeOnly]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Loading stays on until BOTH results and facets resolve so the
    // facet panel doesn't briefly appear empty after the list arrives.
    const resultsP = RepoSearchFetcher.fetchResults(fetchPayload, page, perPage, sort)
      .then((resultData) => {
        if (cancelled) return;
        setResults(resultData.results || []);
        setTotal(resultData.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Publication search results failed', err);
      });

    const facetsP = RepoSearchFetcher.fetchFacets(fetchPayload)
      .then((facetData) => {
        if (cancelled) return;
        setFacets(facetData);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Publication search facets failed', err);
      });

    Promise.allSettled([resultsP, facetsP]).then(() => {
      if (!cancelled) setLoading(false);
    });

    // Safety net: never lock the screen for more than 30s, even if a
    // request hangs (server stall, dropped connection, etc).
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 30000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [fetchPayload, page, perPage, sort]);

  // Once a detail is open the list is squeezed into a narrow column, so the
  // search panel must never share the screen with it. Collapse the panel
  // whenever a detail opens through any path (deep link, browser navigation,
  // not just an in-page result click). This only fires on detailOpen
  // transitions, so it never fights togglePanel, which opens the panel while
  // simultaneously closing the detail.
  useEffect(() => {
    if (detailOpen) setPanelOpen(false);
  }, [detailOpen]);

  const onPerPageChange = useCallback((next) => {
    setPerPage(next);
    setPage(1);
  }, []);

  const onToggleFilter = useCallback((groupKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [groupKey]: toggleValue(prev[groupKey] || [], value),
    }));
    setPage(1);
  }, []);

  const onSchemeOnlyChange = useCallback((next) => {
    setSchemeOnly(next);
    setPage(1);
  }, []);

  const onQueryChange = useCallback((next) => {
    setQuery(next);
    setPage(1);
  }, []);

  const onStructureChange = useCallback((next) => {
    setStructureQuery(next);
    setPage(1);
  }, []);

  const onStructureMatchChange = useCallback((next) => {
    setStructureMatch(next);
    if (structureQuery) setPage(1);
  }, [structureQuery]);

  const onClearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSchemeOnly(null);
    setQuery('');
    setStructureQuery('');
    setPage(1);
  }, []);

  const activeFilters = hasAnyFilter(filters, schemeOnly, query, structureQuery);

  // Opening the search panel collapses the right-side element detail so
  // the list has the full width while the user adjusts filters.
  const togglePanel = useCallback(() => {
    setPanelOpen((v) => {
      const next = !v;
      if (next && onPanelOpen) onPanelOpen();
      return next;
    });
  }, [onPanelOpen]);

  // Picking a result hides the filter panel so the detail pane has room.
  const handleResultClick = useCallback((hit) => {
    setPanelOpen(false);
    if (onResultClick) onResultClick(hit);
  }, [onResultClick]);

  return (
    <div className="repo-publication-search repo-publ-layout">
      {loading && (
        <div className="repo-search-loading-overlay" role="status" aria-live="polite">
          <i className="fa fa-refresh fa-spin fa-2x" aria-hidden="true" />
          <span className="visually-hidden">Loading…</span>
        </div>
      )}
      {panelOpen && (
        <div className="repo-search-inline-panel">
          <div className="repo-search-section-header">
            <h4 className="repo-search-section-title">Search &amp; filters</h4>
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={() => setPanelOpen(false)}
              aria-label="Close panel"
            >
              <i className="fa fa-times" aria-hidden="true" />
            </button>
          </div>
          <SearchBar
            query={query}
            onQueryChange={onQueryChange}
            structureQuery={structureQuery}
            onStructureChange={onStructureChange}
            structureMatch={structureMatch}
            onStructureMatchChange={onStructureMatchChange}
          />
          <FacetPanel
            facets={facets}
            filters={filters}
            schemeOnly={schemeOnly}
            onToggleFilter={onToggleFilter}
            onSchemeOnlyChange={onSchemeOnlyChange}
            onClearAll={onClearAll}
          />
        </div>
      )}
      <div className="repo-publ-main repo-search-results-pane">
        <ResultsList
          results={results}
          total={total}
          page={page}
          perPage={perPage}
          loading={loading}
          onPageChange={setPage}
          onPerPageChange={onPerPageChange}
          onSortChange={setSort}
          sort={sort}
          onResultClick={handleResultClick}
          detailOpen={detailOpen}
          onTogglePanel={togglePanel}
          activeFilters={activeFilters}
        />
      </div>
    </div>
  );
};

PublicationSearchPage.propTypes = {
  onResultClick: PropTypes.func,
  onPanelOpen: PropTypes.func,
  detailOpen: PropTypes.bool,
};

PublicationSearchPage.defaultProps = {
  onResultClick: null,
  onPanelOpen: null,
  detailOpen: false,
};

export default PublicationSearchPage;
