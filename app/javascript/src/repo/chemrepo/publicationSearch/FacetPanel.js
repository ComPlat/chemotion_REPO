import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Badge, Form } from 'react-bootstrap';
import FacetGroup from 'src/repo/chemrepo/publicationSearch/FacetGroup';
import RepoSearchFetcher from 'src/repo/fetchers/RepoSearchFetcher';

const fetchAuthorSuggestions = (q) =>
  RepoSearchFetcher.fetchFacetValues('author', q, 20).then((res) => (res && res.result) || []);

const fetchContributorSuggestions = (q) =>
  RepoSearchFetcher.fetchFacetValues('contributor', q, 20).then((res) => (res && res.result) || []);

const fetchInstitutionSuggestions = (q) =>
  RepoSearchFetcher.fetchFacetValues('institution', q, 20).then((res) => (res && res.result) || []);

const fetchOntologySuggestions = (q) =>
  RepoSearchFetcher.fetchFacetValues('ontology', q, 20).then((res) => (res && res.result) || []);

const fetchReactionTypeSuggestions = (q) =>
  RepoSearchFetcher.fetchFacetValues('reaction_type', q, 20).then((res) => (res && res.result) || []);

const fetchEmbargoSuggestions = (q) =>
  RepoSearchFetcher.fetchFacetValues('embargo', q, 20).then((res) => (res && res.result) || []);

const FacetPanel = ({
  facets, filters, schemeOnly, onToggleFilter, onSchemeOnlyChange, onClearAll,
}) => {
  const schemeCount = facets.schemeOnly && facets.schemeOnly.count;
  // Collapsed by default for a broad overview; starts expanded when an
  // element filter (or scheme-only) is already active so it stays visible.
  const [elementCollapsed, setElementCollapsed] = useState(
    (filters.elementTypes || []).length === 0 && !schemeOnly
  );
  // Year list is small (<30 values) so we filter the already-loaded options
  // client-side instead of round-tripping to the server.
  const fetchYearSuggestions = (q) => {
    const term = String(q).toLowerCase();
    return Promise.resolve(
      (facets.years || []).filter((opt) => String(opt.value).toLowerCase().includes(term))
    );
  };
  return (
    <div className="repo-search-facet-panel">
      <div className="repo-search-section-header">
        <h5 className="repo-search-section-title">Filters</h5>
        <button
          type="button"
          className="btn btn-link btn-sm p-0"
          onClick={onClearAll}
        >
          Clear all
        </button>
      </div>
      <div className="repo-search-facet-group">
        <div className="repo-search-facet-title-row">
          <button
            type="button"
            className="repo-search-facet-title-toggle"
            onClick={() => setElementCollapsed((c) => !c)}
            aria-expanded={!elementCollapsed}
          >
            <i
              className={`fa fa-caret-${elementCollapsed ? 'right' : 'down'} repo-search-facet-caret`}
              aria-hidden="true"
            />
            <span className="repo-search-facet-title">Element</span>
          </button>
          {(filters.elementTypes || []).map((val) => {
            const opt = (facets.elementTypes || []).find((o) => o.value === val);
            const label = (opt && opt.label) || String(val);
            return (
              <span key={val} className="repo-search-facet-chip">
                <span className="repo-search-facet-chip-label">{label}</span>
                <button
                  type="button"
                  className="repo-search-facet-chip-remove"
                  onClick={() => onToggleFilter('elementTypes', val)}
                  aria-label={`Remove ${label}`}
                >
                  <i className="fa fa-times" aria-hidden="true" />
                </button>
              </span>
            );
          })}
          {schemeOnly && (
            <span className="repo-search-facet-chip">
              <span className="repo-search-facet-chip-label">Scheme-only</span>
              <button
                type="button"
                className="repo-search-facet-chip-remove"
                onClick={() => onSchemeOnlyChange(null)}
                aria-label="Remove scheme-only filter"
              >
                <i className="fa fa-times" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
        {!elementCollapsed && (
          <>
            {(facets.elementTypes || []).map((opt) => {
              const id = `repo-search-elementTypes-${opt.value}`;
              const checked = (filters.elementTypes || []).includes(opt.value);
              return (
                <Form.Check
                  key={id}
                  type="checkbox"
                  id={id}
                  checked={checked}
                  onChange={() => onToggleFilter('elementTypes', opt.value)}
                  label={(
                    <span>
                      {opt.label || String(opt.value)}
                      {typeof opt.count === 'number' && (
                        <>
                          {' '}
                          <Badge bg="secondary" pill>
                            {opt.count}
                          </Badge>
                        </>
                      )}
                    </span>
                  )}
                />
              );
            })}
            <Form.Check
              type="checkbox"
              id="repo-search-scheme-only"
              checked={!!schemeOnly}
              onChange={(e) => onSchemeOnlyChange(e.target.checked ? true : null)}
              label={(
                <span>
                  Scheme-only reactions
                  {typeof schemeCount === 'number' && (
                    <>
                      {' '}
                      <Badge bg="secondary" pill>
                        {schemeCount}
                      </Badge>
                    </>
                  )}
                </span>
              )}
            />
          </>
        )}
      </div>
      <FacetGroup
        title="Year"
        groupKey="years"
        options={facets.years || []}
        selected={filters.years || []}
        onToggle={onToggleFilter}
        fetchSuggestions={fetchYearSuggestions}
        searchPlaceholder="Search year (e.g. 2024)…"
      />
      <FacetGroup
        title="Authors"
        groupKey="authors"
        options={facets.authors || []}
        selected={filters.authors || []}
        onToggle={onToggleFilter}
        fetchSuggestions={fetchAuthorSuggestions}
        searchPlaceholder="Search authors by name…"
      />
      <FacetGroup
        title="Contributors"
        groupKey="contributors"
        options={facets.contributors || []}
        selected={filters.contributors || []}
        onToggle={onToggleFilter}
        fetchSuggestions={fetchContributorSuggestions}
        searchPlaceholder="Search contributors by name…"
      />
      <FacetGroup
        title="Reaction types"
        groupKey="reactionTypes"
        options={facets.reactionTypes || []}
        selected={filters.reactionTypes || []}
        onToggle={onToggleFilter}
        fetchSuggestions={fetchReactionTypeSuggestions}
        searchPlaceholder="Search reaction type by name…"
      />
      <FacetGroup
        title="Analysis ontology terms"
        groupKey="ontologies"
        options={facets.ontologies || []}
        selected={filters.ontologies || []}
        onToggle={onToggleFilter}
        fetchSuggestions={fetchOntologySuggestions}
        searchPlaceholder="Search analysis term by name…"
      />
      <FacetGroup
        title="Institutions"
        groupKey="institutions"
        options={facets.institutions || []}
        selected={filters.institutions || []}
        onToggle={onToggleFilter}
        fetchSuggestions={fetchInstitutionSuggestions}
        searchPlaceholder="Search institution by name…"
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
  );
};

FacetPanel.propTypes = {
  facets: PropTypes.shape({
    elementTypes: PropTypes.array,
    years: PropTypes.array,
    authors: PropTypes.array,
    contributors: PropTypes.array,
    institutions: PropTypes.array,
    ontologies: PropTypes.array,
    reactionTypes: PropTypes.array,
    embargoes: PropTypes.array,
    schemeOnly: PropTypes.shape({ count: PropTypes.number }),
  }).isRequired,
  filters: PropTypes.shape({
    elementTypes: PropTypes.array,
    years: PropTypes.array,
    authors: PropTypes.array,
    contributors: PropTypes.array,
    institutions: PropTypes.array,
    ontologies: PropTypes.array,
    reactionTypes: PropTypes.array,
    embargoes: PropTypes.array,
  }).isRequired,
  schemeOnly: PropTypes.bool,
  onToggleFilter: PropTypes.func.isRequired,
  onSchemeOnlyChange: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
};

FacetPanel.defaultProps = {
  schemeOnly: null,
};

export default FacetPanel;
