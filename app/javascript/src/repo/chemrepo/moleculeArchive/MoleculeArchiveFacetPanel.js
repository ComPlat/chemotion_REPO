import React from 'react';
import PropTypes from 'prop-types';
import SearchBar from 'src/repo/chemrepo/publicationSearch/SearchBar';
import FacetGroup from 'src/repo/chemrepo/publicationSearch/FacetGroup';
import RepoSearchFetcher from 'src/repo/fetchers/RepoSearchFetcher';

const fetchEmbargoSuggestions = (q) =>
  RepoSearchFetcher.fetchFacetValues('embargo', q, 20).then((res) => (res && res.result) || []);

const MoleculeArchiveFacetPanel = ({
  query, onQueryChange,
  structureQuery, onStructureChange,
  structureMatch, onStructureMatchChange,
  facets, filters, onToggleFilter, onClearAll, hasActive,
}) => (
  <>
    <div className="repo-search-section repo-search-bar-section">
      <div className="repo-search-section-header">
        <h4 className="repo-search-section-title">Search</h4>
      </div>
      <SearchBar
        query={query}
        onQueryChange={onQueryChange}
        structureQuery={structureQuery}
        onStructureChange={onStructureChange}
        structureMatch={structureMatch}
        onStructureMatchChange={onStructureMatchChange}
      />
    </div>
    <div className="repo-search-section repo-search-facet-section">
      <div className="repo-search-section-header d-flex justify-content-between align-items-center">
        <h4 className="repo-search-section-title">Filters</h4>
        {hasActive && (
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            onClick={onClearAll}
          >
            Clear all
          </button>
        )}
      </div>
      <FacetGroup
        title="Year published"
        groupKey="years"
        options={facets.years || []}
        selected={filters.years || []}
        onToggle={onToggleFilter}
      />
      <FacetGroup
        title="Provider"
        groupKey="providers"
        options={facets.providers || []}
        selected={filters.providers || []}
        onToggle={onToggleFilter}
      />
      <FacetGroup
        title="Group"
        groupKey="groups"
        options={facets.groups || []}
        selected={filters.groups || []}
        onToggle={onToggleFilter}
      />
      <FacetGroup
        title="Has analyses"
        groupKey="hasAnalyses"
        options={facets.hasAnalyses || []}
        selected={filters.hasAnalyses || []}
        onToggle={onToggleFilter}
      />
      <FacetGroup
        title="Embargoes"
        groupKey="embargoes"
        options={facets.embargoes || []}
        selected={filters.embargoes || []}
        onToggle={onToggleFilter}
        fetchSuggestions={fetchEmbargoSuggestions}
        searchPlaceholder="Search embargo by name…"
      />
    </div>
  </>
);

MoleculeArchiveFacetPanel.propTypes = {
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  structureQuery: PropTypes.string,
  onStructureChange: PropTypes.func.isRequired,
  structureMatch: PropTypes.string,
  onStructureMatchChange: PropTypes.func.isRequired,
  facets: PropTypes.object.isRequired,
  filters: PropTypes.shape({
    years: PropTypes.array,
    providers: PropTypes.array,
    groups: PropTypes.array,
    hasAnalyses: PropTypes.array,
    embargoes: PropTypes.array,
  }).isRequired,
  onToggleFilter: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  hasActive: PropTypes.bool.isRequired,
};

MoleculeArchiveFacetPanel.defaultProps = {
  structureQuery: '',
  structureMatch: 'sub',
};

export default MoleculeArchiveFacetPanel;
