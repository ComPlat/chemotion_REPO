import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Badge, Form } from 'react-bootstrap';

const optionId = (groupKey, value) => `repo-search-${groupKey}-${value}`;

const FacetGroup = ({
  title,
  groupKey,
  options,
  selected,
  onToggle,
  initialVisible,
  fetchSuggestions,
  searchPlaceholder,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  // Collapsed by default so the panel gives a broad overview; a group that
  // already carries an active selection starts expanded so it stays visible.
  const [collapsed, setCollapsed] = useState(selected.length === 0);

  // When the user types in the per-facet search box, swap the displayed
  // options for live autocomplete results from the backend. The backend
  // returns rows shaped like { value, label }; counts are not available
  // for searched results so we render them without the count badge.
  useEffect(() => {
    if (!fetchSuggestions) return undefined;
    const term = searchInput.trim();
    if (term.length < 2) {
      setSearchResults(null);
      return undefined;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      fetchSuggestions(term)
        .then((rows) => {
          if (cancelled) return;
          setSearchResults(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchInput, fetchSuggestions]);

  const selectedSet = new Set(selected);
  const isSearching = searchResults !== null;
  // Always make sure already-selected values stay visible even when they
  // fall off the top-N list or out of the search results.
  const optionsByValue = new Map(options.map((o) => [o.value, o]));
  const baseList = isSearching ? searchResults : options;
  const merged = [...baseList];
  if (isSearching) {
    selected.forEach((val) => {
      if (merged.some((o) => o.value === val)) return;
      merged.unshift(optionsByValue.get(val) || { value: val, label: String(val) });
    });
  }
  const visible = (isSearching || showAll) ? merged : merged.slice(0, initialVisible);

  // For the chip label we look at the same sources used for the
  // checkbox list — current options first, then search results.
  const labelFor = (val) => {
    const fromOptions = optionsByValue.get(val);
    if (fromOptions && fromOptions.label != null) return fromOptions.label;
    const fromSearch = (searchResults || []).find((o) => o.value === val);
    if (fromSearch && fromSearch.label != null) return fromSearch.label;
    return String(val);
  };

  return (
    <div className="repo-search-facet-group">
      <div className="repo-search-facet-title-row">
        <button
          type="button"
          className="repo-search-facet-title-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          <i
            className={`fa fa-caret-${collapsed ? 'right' : 'down'} repo-search-facet-caret`}
            aria-hidden="true"
          />
          <span className="repo-search-facet-title">{title}</span>
        </button>
        {selected.map((val) => {
          const label = labelFor(val);
          return (
            <span key={val} className="repo-search-facet-chip">
              <span className="repo-search-facet-chip-label">{label}</span>
              <button
                type="button"
                className="repo-search-facet-chip-remove"
                onClick={() => onToggle(groupKey, val)}
                aria-label={`Remove ${label}`}
              >
                <i className="fa fa-times" aria-hidden="true" />
              </button>
            </span>
          );
        })}
      </div>
      {!collapsed && (
        <>
          {fetchSuggestions && (
            <Form.Control
              type="text"
              size="sm"
              className="mb-2"
              placeholder={searchPlaceholder || `Search ${title.toLowerCase()}…`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          )}
          {visible.length === 0 && (
            <div className="text-muted small">
              {isSearching ? 'No matches' : 'No values'}
            </div>
          )}
          {visible.map((opt) => {
            const id = optionId(groupKey, opt.value);
            const checked = selectedSet.has(opt.value);
            return (
              <Form.Check
                key={id}
                type="checkbox"
                id={id}
                checked={checked}
                onChange={() => onToggle(groupKey, opt.value)}
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
          {!isSearching && options.length > initialVisible && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show less' : `Show all (${options.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

FacetGroup.propTypes = {
  title: PropTypes.string.isRequired,
  groupKey: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      label: PropTypes.string,
      count: PropTypes.number,
    })
  ).isRequired,
  selected: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ).isRequired,
  onToggle: PropTypes.func.isRequired,
  initialVisible: PropTypes.number,
  fetchSuggestions: PropTypes.func,
  searchPlaceholder: PropTypes.string,
};

FacetGroup.defaultProps = {
  initialVisible: 8,
  fetchSuggestions: null,
  searchPlaceholder: '',
};

export default FacetGroup;
