import React, { Component } from 'react';
import PublicActions from 'src/repo/actions/PublicActions';
import PublicStore from 'src/repo/stores/PublicStore';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';
import RepoElementDetails from 'src/repo/repoHome/RepoElementDetails';
import RepoMoleculeArchive from 'src/repo/repoHome/RepoMoleculeArchive';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';
import MoleculeArchiveFacetPanel from 'src/repo/chemrepo/moleculeArchive/MoleculeArchiveFacetPanel';

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

const EMPTY_FILTERS = Object.freeze({
  years: [], providers: [], groups: [], hasAnalyses: [], embargoes: [],
});

const isPubElementOf = (currentElement) => !!(((currentElement && currentElement.publication
  && currentElement.publication.published_at) || (
  currentElement && currentElement.published_samples
  && currentElement.published_samples.length > 0
  && currentElement.published_samples[0].published_at
)));

export default class RepoMoleculeArchivePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Server-driven (synced from PublicStore on each fetch response)
      molecules: [],
      page: 1,
      pages: 1,
      perPage: 10,
      totalElements: 0,
      currentElement: null,
      archiveFacets: null,

      // Local UI state
      query: '',
      structureQuery: '',
      structureMatch: 'sub',
      sort: 'recent',
      filters: { ...EMPTY_FILTERS },
      panelOpen: true,
      listWidth: 480,
    };

    this.onStoreChange = this.onStoreChange.bind(this);
    this.setQuery = this.setQuery.bind(this);
    this.setStructureQuery = this.setStructureQuery.bind(this);
    this.setStructureMatch = this.setStructureMatch.bind(this);
    this.setSort = this.setSort.bind(this);
    this.setPage = this.setPage.bind(this);
    this.setPerPage = this.setPerPage.bind(this);
    this.toggleFilter = this.toggleFilter.bind(this);
    this.clearFilters = this.clearFilters.bind(this);
    this.togglePanel = this.togglePanel.bind(this);
    this.startResize = this.startResize.bind(this);
    this.onResizeMove = this.onResizeMove.bind(this);
    this.stopResize = this.stopResize.bind(this);
    this.onResizeKey = this.onResizeKey.bind(this);
    this.listRef = React.createRef();
  }

  componentDidMount() {
    PublicStore.listen(this.onStoreChange);
    // Defer the initial fetch: on a hard reload / deep-link the route action is
    // still mid-dispatch when this mounts, and fetchList dispatches
    // RepoLoadingActions.start() — dispatching during a dispatch throws in Alt
    // ("Cannot dispatch in the middle of a dispatch") and blanks the page. A
    // macrotask lets the current dispatch finish first. (Menu navigation mounts
    // outside a dispatch, so it is unaffected.)
    this.initFetchTimer = setTimeout(() => this.fetchList({ page: 1 }), 0);
  }

  componentDidUpdate(_prevProps, prevState) {
    const wasPubElement = isPubElementOf(prevState.currentElement);
    const isPubElement = isPubElementOf(this.state.currentElement);
    if (isPubElement && !wasPubElement && this.state.panelOpen) {
      this.setState({ panelOpen: false });
    }
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onStoreChange);
    this.stopResize();
    clearTimeout(this.initFetchTimer);
  }

  // PublicStore is shared across views, so only update from payloads that
  // belong to this archive flow. Comparing listType keeps a stray reaction
  // fetch from clobbering archive state.
  onStoreChange(state) {
    if (!state) return;
    const next = {};
    if (state.listType && state.listType !== RepoNavListTypes.MOLECULE_ARCHIVE) {
      // Sync currentElement so the split-view reacts to detail open/close
      // even if the latest fetch was for another list.
      if ('currentElement' in state) next.currentElement = state.currentElement;
      if (Object.keys(next).length > 0) this.setState(next);
      return;
    }
    [
      'molecules', 'page', 'pages', 'perPage', 'totalElements',
      'archiveFacets', 'currentElement',
    ].forEach((key) => {
      if (key in state) next[key] = state[key];
    });
    if (Object.keys(next).length > 0) this.setState(next);
  }

  fetchList(overrides = {}) {
    const {
      page, perPage, query, structureQuery, structureMatch, sort, filters,
    } = this.state;
    RepoLoadingActions.start();
    PublicActions.getMolecules({
      page: overrides.page ?? page,
      perPage: overrides.perPage ?? perPage,
      listType: RepoNavListTypes.MOLECULE_ARCHIVE,
      q: overrides.query ?? query,
      structureQuery: overrides.structureQuery ?? structureQuery,
      structureMatch: overrides.structureMatch ?? structureMatch,
      sort: overrides.sort ?? sort,
      archiveYears: (overrides.filters ?? filters).years || [],
      archiveProviders: (overrides.filters ?? filters).providers || [],
      archiveGroups: (overrides.filters ?? filters).groups || [],
      archiveHasAnalyses: (overrides.filters ?? filters).hasAnalyses || [],
      archiveEmbargoes: (overrides.filters ?? filters).embargoes || [],
    });
  }

  setQuery(value) {
    this.setState({ query: value, page: 1 }, () => this.fetchList({ page: 1, query: value }));
  }

  setStructureQuery(value) {
    this.setState({ structureQuery: value, page: 1 }, () => this.fetchList({ page: 1, structureQuery: value }));
  }

  setStructureMatch(value) {
    this.setState((prev) => ({
      structureMatch: value,
      page: prev.structureQuery ? 1 : prev.page,
    }), () => {
      if (this.state.structureQuery) this.fetchList({ structureMatch: value });
    });
  }

  setSort(value) {
    this.setState({ sort: value, page: 1 }, () => this.fetchList({ page: 1, sort: value }));
  }

  setPage(value) {
    this.setState({ page: value }, () => this.fetchList({ page: value }));
  }

  setPerPage(value) {
    this.setState({ perPage: value, page: 1 }, () => {
      PublicActions.setSearchParams({ perPage: value });
      this.fetchList({ page: 1, perPage: value });
    });
  }

  toggleFilter(groupKey, value) {
    this.setState((prev) => {
      const current = prev.filters[groupKey] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const filters = { ...prev.filters, [groupKey]: next };
      return { filters, page: 1 };
    }, () => this.fetchList({ page: 1 }));
  }

  clearFilters() {
    this.setState({
      query: '',
      structureQuery: '',
      structureMatch: 'sub',
      sort: 'recent',
      filters: { ...EMPTY_FILTERS },
      page: 1,
    }, () => this.fetchList({
      page: 1,
      query: '',
      structureQuery: '',
      structureMatch: 'sub',
      sort: 'recent',
      filters: { ...EMPTY_FILTERS },
    }));
  }

  togglePanel() {
    this.setState((prev) => {
      const next = !prev.panelOpen;
      if (next) PublicActions.close();
      return { panelOpen: next };
    });
  }

  // Drag-to-resize for the split-view divider. state.listWidth
  // (px) drives the list column; the detail flex-grows to fill the rest. During
  // a drag the list style is mutated via a ref so the heavy detail pane isn't
  // re-rendered per mousemove; the value is committed to state on mouseup.
  onResizeMove(e) {
    const container = this.resizeContainer;
    const el = this.listRef.current;
    if (!container || !el) return;
    const rect = container.getBoundingClientRect();
    const MIN_LIST = 280;
    const MIN_DETAIL = 360;
    const max = Math.max(MIN_LIST, rect.width - MIN_DETAIL);
    const width = Math.min(max, Math.max(MIN_LIST, e.clientX - rect.left));
    this.pendingWidth = width;
    el.style.flex = `0 0 ${width}px`;
    el.style.width = `${width}px`;
  }

  onResizeKey(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const rect = e.currentTarget.parentNode.getBoundingClientRect();
    const MIN_LIST = 280;
    const max = Math.max(MIN_LIST, rect.width - 360);
    const step = e.key === 'ArrowLeft' ? -24 : 24;
    this.setState((s) => ({
      listWidth: Math.min(max, Math.max(MIN_LIST, s.listWidth + step)),
    }));
  }

  startResize(e) {
    e.preventDefault();
    this.resizeContainer = e.currentTarget.parentNode;
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.stopResize);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }

  stopResize() {
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.stopResize);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (this.pendingWidth != null) {
      this.setState({ listWidth: this.pendingWidth });
      this.pendingWidth = null;
    }
  }

  hasActiveFilters() {
    const { query, structureQuery, filters } = this.state;
    if (query.trim()) return true;
    if (structureQuery) return true;
    return Object.values(filters).some((arr) => arr.length > 0);
  }

  renderHeader() {
    const { totalElements, sort } = this.state;
    const hasActive = this.hasActiveFilters();
    return (
      <div className="repo-search-section-header">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="repo-search-toggle-btn"
            onClick={this.togglePanel}
            title="Search & filters"
            aria-label="Search & filters"
          >
            <i className="fa fa-search" aria-hidden="true" />
            {hasActive && (
              <span className="repo-search-toggle-dot" aria-label="active filters" />
            )}
          </button>
          <h4 className="repo-search-section-title">
            {`${totalElements || 0} result${totalElements === 1 ? '' : 's'}`}
          </h4>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="small mb-0" htmlFor="repo-archive-sort">
            Sort:
          </label>
          <select
            id="repo-archive-sort"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={sort}
            onChange={(e) => this.setSort(e.target.value)}
          >
            <option value="recent">Most recent</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>
    );
  }

  renderFooter() {
    const { perPage, page, pages } = this.state;
    return (
      <div className="repo-search-footer">
        <div className="d-flex align-items-center gap-2">
          <label className="small mb-0" htmlFor="repo-archive-per-page">
            Show:
          </label>
          <select
            id="repo-archive-per-page"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={perPage}
            onChange={(e) => this.setPerPage(parseInt(e.target.value, 10))}
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="small">per page</span>
        </div>
        {(pages || 1) > 1 && (
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={(page || 1) <= 1}
              onClick={() => this.setPage((page || 1) - 1)}
            >
              <i className="fa fa-chevron-left" aria-hidden="true" />
              {' '}
              Prev
            </button>
            <span>
              {`Page ${page || 1} of ${pages || 1}`}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={(page || 1) >= (pages || 1)}
              onClick={() => this.setPage((page || 1) + 1)}
            >
              Next
              {' '}
              <i className="fa fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  }

  renderPanel(hasActive) {
    const {
      query, structureQuery, structureMatch, filters, archiveFacets,
    } = this.state;
    const facets = archiveFacets || { years: [], providers: [], groups: [], hasAnalyses: [], embargoes: [] };
    return (
      <div className="repo-search-inline-panel">
        <div className="repo-search-section-header">
          <div>
            <h4 className="repo-search-section-title mb-0">Molecule Archive</h4>
            <div className="text-muted small">Physical samples</div>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            onClick={this.togglePanel}
            aria-label="Close panel"
          >
            <i className="fa fa-times" aria-hidden="true" />
          </button>
        </div>
        <MoleculeArchiveFacetPanel
          query={query}
          onQueryChange={this.setQuery}
          structureQuery={structureQuery}
          onStructureChange={this.setStructureQuery}
          structureMatch={structureMatch}
          onStructureMatchChange={this.setStructureMatch}
          facets={facets}
          filters={filters}
          onToggleFilter={this.toggleFilter}
          onClearAll={this.clearFilters}
          hasActive={hasActive}
        />
      </div>
    );
  }

  render() {
    const {
      molecules, currentElement, panelOpen, listWidth,
    } = this.state;
    const isPubElement = isPubElementOf(currentElement);
    const listClass = isPubElement ? 'public-list-adv' : 'public-list';
    const hasActive = this.hasActiveFilters();
    const visibleMolecules = molecules || [];

    return (
      <div className="repo-publication-search repo-publ-layout">
        {panelOpen && this.renderPanel(hasActive)}
        <div className="repo-publ-main repo-search-results-pane">
          <div className={isPubElement ? 'repo-publ-split-view' : ''}>
            <div
              className={isPubElement ? 'repo-publ-split-list' : ''}
              ref={this.listRef}
              style={isPubElement
                ? { flex: `0 0 ${listWidth}px`, width: `${listWidth}px` }
                : undefined}
            >
              <div className={`${listClass} repo-search-results`}>
                {this.renderHeader()}
                {visibleMolecules.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    No molecules match the current filters.
                  </div>
                ) : (
                  <ul className="list-unstyled mb-3">
                    {visibleMolecules.map((m) => (
                      <RepoMoleculeArchive
                        key={m.id}
                        molecule={m}
                        currentElement={currentElement}
                        isPubElement={isPubElement}
                      />
                    ))}
                  </ul>
                )}
                {this.renderFooter()}
              </div>
            </div>
            {isPubElement && (
              <>
                <div
                  className="repo-publ-split-resizer"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize list and detail"
                  tabIndex={0}
                  title="Drag to resize"
                  onMouseDown={this.startResize}
                  onKeyDown={this.onResizeKey}
                />
                <div className="repo-publ-split-detail">
                  <div className="public-element">
                    <RepoElementDetails />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}

