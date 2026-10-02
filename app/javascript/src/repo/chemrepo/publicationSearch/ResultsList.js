import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Badge, OverlayTrigger, Popover, Tooltip,
} from 'react-bootstrap';
import { getFormattedISODate } from 'src/repo/chemrepo/date-utils';
import RepoSvgZoomModal from 'src/repo/chemrepo/common/RepoSvgZoomModal';

const xvialIndicator = (hit) => {
  const hasX = (hit.xvialCount || 0) > 0;
  const hasXCom = (hit.xvialCom || 0) > 0;
  if (!hasX && !hasXCom) return null;
  const tip = hasXCom
    ? 'A physical sample of this molecule is registered in the Compound Platform Molecule Archive and can be requested from there.'
    : 'A physical sample of this molecule is registered in the Compound Platform.';
  return (
    <OverlayTrigger placement="top" overlay={<Tooltip id="repo-search-xvial-tt">{tip}</Tooltip>}>
      <span
        className={`xvial-span ${hasX ? 'xvial' : ''} ${hasXCom ? 'xvial-com' : ''}`}
        style={{ alignItems: 'center', alignSelf: 'center', lineHeight: 1 }}
      >
        <i className="icon-xvial" />
      </span>
    </OverlayTrigger>
  );
};

const formatAuthor = (a) => a.name || [a.givenName, a.familyName].filter(Boolean).join(' ');

const ResultRow = ({ hit, onClick, detailOpen }) => {
  // In the narrow (detail-open) list the row shows a compact summary; the
  // expand toggle reveals the full metadata inline without leaving the list.
  const [expanded, setExpanded] = useState(false);
  const elementBadge = hit.elementType === 'Reaction' ? 'info' : 'success';
  const doiHref = hit.doi ? `https://dx.doi.org/${hit.doi}` : null;
  const authors = hit.authors || [];
  const visibleAuthors = authors.slice(0, 6).map(formatAuthor).filter(Boolean);
  const overflowCount = Math.max(0, authors.length - visibleAuthors.length);
  const authorsText = visibleAuthors.join('; ')
    + (overflowCount > 0 ? `; … +${overflowCount} more` : '');
  const publishedOn = getFormattedISODate(hit.publishedAt);
  const clickable = typeof onClick === 'function';
  const handleClick = clickable ? () => onClick(hit) : undefined;
  const handleKey = clickable
    ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(hit); }
    : undefined;

  // The expanded ("more") info shows the contributor's full name and, when
  // available, their affiliation on its own line below.
  const contributorLine = hit.contributor && (
    <>
      <div className="repo-result-meta">
        <strong>Contributor: </strong>
        {hit.contributor}
      </div>
      {hit.contributorAffiliation && (
        <div className="repo-result-meta repo-result-affiliation">
          {hit.contributorAffiliation}
        </div>
      )}
    </>
  );

  // Compact contributor chip for the always-visible badges row (between the
  // element icon and the Chemotion ID): the contributor's name_abbreviation in
  // a neutral pill (same style as the Chemotion ID, lighter weight so it reads
  // as secondary), with the full name and affiliation on hover/focus. Both come
  // from the list payload; either may be absent.
  const contributorTip = (
    <Tooltip id={`repo-search-contributor-tt-${hit.id}`}>
      <div>{hit.contributor}</div>
      {hit.contributorAffiliation && (
        <div className="repo-result-contributor-aff">{hit.contributorAffiliation}</div>
      )}
    </Tooltip>
  );
  const srContributor = hit.contributorAffiliation
    ? `${hit.contributor}, ${hit.contributorAffiliation}`
    : hit.contributor;
  const contributorBadge = hit.contributor && (
    <OverlayTrigger placement="top" overlay={contributorTip}>
      <span className="badge bg-light text-dark border repo-result-contributor-pill" tabIndex={0}>
        <span aria-hidden="true">{hit.contributorAbbreviation || hit.contributor}</span>
        <span className="visually-hidden">Contributor: {srContributor}</span>
      </span>
    </OverlayTrigger>
  );

  const publishedLine = publishedOn && (
    <div className="repo-result-meta">
      <strong>Published on: </strong>
      {publishedOn}
    </div>
  );

  const authorsLine = visibleAuthors.length > 0 && (
    <div
      className={`repo-result-meta${detailOpen ? ' repo-result-meta-clip' : ''}`}
      title={detailOpen ? authorsText : undefined}
    >
      <strong>Authors: </strong>
      {authorsText}
    </div>
  );

  const doiLine = hit.doi && (
    <div className="repo-result-meta">
      <strong>DOI: </strong>
      {detailOpen ? (
        <span>{hit.doi}</span>
      ) : (
        <a href={doiHref} target="_blank" rel="noreferrer noopener">
          {hit.doi}
        </a>
      )}
    </div>
  );

  const elementIcon = hit.elementType === 'Reaction' ? 'icon-reaction' : 'icon-sample';

  const badgesRow = (
    <div className="d-flex align-items-baseline gap-1 flex-wrap mb-1">
      <Badge bg={elementBadge} className="repo-result-element-badge" title={hit.elementType}>
        <i className={elementIcon} aria-hidden="true" />
        <span className="visually-hidden">{hit.elementType}</span>
      </Badge>
      {contributorBadge}
      {hit.chemotionId && (
        <span className="badge bg-light text-dark border">{hit.chemotionId}</span>
      )}
      {hit.embargo && (
        <Badge bg="primary" title="Embargo bundle">
          {hit.embargo}
        </Badge>
      )}
      {hit.schemeOnly && <Badge bg="secondary">Scheme only</Badge>}
      {hit.anaCnt > 0 && (
        <span className="repo-result-meta" title="Number of analyses">
          {hit.anaCnt} analyses
        </span>
      )}
      {xvialIndicator(hit)}
      {detailOpen && (
        <button
          type="button"
          className="repo-search-result-expand ms-auto"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded}
          aria-label={expanded ? 'Show less info' : 'Show more info'}
          title={expanded ? 'Show less' : 'Show more'}
        >
          <span className="repo-search-result-expand-text">
            {expanded ? 'less' : 'more'}
          </span>
          <i className={`fa fa-angle-${expanded ? 'up' : 'down'}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  // Hover preview: show the full-size structure/scheme in a floating popover
  // so the user can read a cramped thumbnail without opening the detail. The
  // pointer arrow is hidden via CSS (.repo-search-thumb-popover) — it lands on
  // the thumbnail edge and reads as a stray artifact.
  const thumbPopover = hit.svgPath ? (
    <Popover
      id={`repo-search-thumb-pop-${hit.id}`}
      className="repo-search-thumb-popover"
      style={{ maxWidth: 'none', maxHeight: 'none' }}
    >
      <div style={{ padding: 8 }}>
        <img
          src={hit.svgPath}
          alt=""
          style={{
            display: 'block', maxWidth: '55vw', maxHeight: '45vh', width: 'auto', height: 'auto',
          }}
        />
      </div>
    </Popover>
  ) : null;

  return (
    <li
      className={`repo-search-result-row${detailOpen ? ' is-detail-open' : ''}${clickable ? ' cursor-pointer' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleClick}
      onKeyPress={handleKey}
    >
      <div className="repo-search-result-row-top d-flex gap-3">
        <div className="repo-search-result-thumb flex-shrink-0">
          {hit.svgPath && (
            <>
              <OverlayTrigger
                trigger={['hover', 'focus']}
                placement="right"
                overlay={thumbPopover}
              >
                <img src={hit.svgPath} alt={hit.chemotionId || hit.elementType} />
              </OverlayTrigger>
              <RepoSvgZoomModal
                svgPath={hit.svgPath}
                title={hit.title || `${hit.elementType} ${hit.chemotionId || ''}`.trim()}
                buttonClassName="repo-search-result-thumb-zoom"
              />
            </>
          )}
        </div>
        {!detailOpen && (
          <div className="flex-grow-1 min-w-0">
            {badgesRow}
            {contributorLine}
            {publishedLine}
            {authorsLine}
            {doiLine}
          </div>
        )}
      </div>
      {detailOpen && (
        <div className="repo-search-result-row-bottom">
          {badgesRow}
          {expanded && (
            <>
              {contributorLine}
              {publishedLine}
              {authorsLine}
              {doiLine}
            </>
          )}
        </div>
      )}
    </li>
  );
};

ResultRow.propTypes = {
  hit: PropTypes.shape({
    id: PropTypes.number.isRequired,
    elementType: PropTypes.string,
    elementId: PropTypes.number,
    moleculeId: PropTypes.number,
    chemotionId: PropTypes.string,
    year: PropTypes.number,
    publishedAt: PropTypes.string,
    title: PropTypes.string,
    doi: PropTypes.string,
    svgPath: PropTypes.string,
    authors: PropTypes.array,
    embargo: PropTypes.string,
    contributor: PropTypes.string,
    contributorAbbreviation: PropTypes.string,
    contributorAffiliation: PropTypes.string,
    anaCnt: PropTypes.number,
    schemeOnly: PropTypes.bool,
    xvialCount: PropTypes.number,
    xvialCom: PropTypes.number,
  }).isRequired,
  onClick: PropTypes.func,
  detailOpen: PropTypes.bool,
};

ResultRow.defaultProps = {
  onClick: null,
  detailOpen: false,
};

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

const ResultsList = ({
  results,
  total,
  page,
  perPage,
  loading,
  onPageChange,
  onPerPageChange,
  onSortChange,
  sort,
  onResultClick,
  detailOpen,
  onTogglePanel,
  activeFilters,
}) => {
  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage));
  return (
    <div className="repo-search-results">
      <div className="repo-search-section-header">
        <div className="d-flex align-items-center gap-2">
          {onTogglePanel && (
            <button
              type="button"
              className="repo-search-toggle-btn"
              onClick={onTogglePanel}
              title="Search & filters"
              aria-label="Search & filters"
            >
              <i className="fa fa-search" aria-hidden="true" />
              {activeFilters && (
                <span className="repo-search-toggle-dot" aria-label="active filters" />
              )}
            </button>
          )}
          <h4 className="repo-search-section-title">
            {loading ? 'Loading…' : `${total || 0} result${total === 1 ? '' : 's'}`}
          </h4>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="small mb-0" htmlFor="repo-search-sort">
            Sort:
          </label>
          <select
            id="repo-search-sort"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="recent">Most recent</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>
      <ul className="list-unstyled mb-3">
        {results.map((hit) => (
          <ResultRow
            key={hit.id}
            hit={hit}
            onClick={onResultClick}
            detailOpen={detailOpen}
          />
        ))}
      </ul>
      <div className="repo-search-footer">
        <div className="d-flex align-items-center gap-2">
          <label className="small mb-0" htmlFor="repo-search-per-page">
            Show:
          </label>
          <select
            id="repo-search-per-page"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={perPage}
            disabled={loading}
            onChange={(e) => onPerPageChange(parseInt(e.target.value, 10))}
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="small">per page</span>
        </div>
        {totalPages > 1 && (
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              <i className="fa fa-chevron-left" aria-hidden="true" />
              {' '}
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              {' '}
              <i className="fa fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

ResultsList.propTypes = {
  results: PropTypes.array.isRequired,
  total: PropTypes.number,
  page: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  loading: PropTypes.bool,
  onPageChange: PropTypes.func.isRequired,
  onPerPageChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  sort: PropTypes.string.isRequired,
  onResultClick: PropTypes.func,
  detailOpen: PropTypes.bool,
  onTogglePanel: PropTypes.func,
  activeFilters: PropTypes.bool,
};

ResultsList.defaultProps = {
  total: 0,
  loading: false,
  onResultClick: null,
  detailOpen: false,
  onTogglePanel: null,
  activeFilters: false,
};

export default ResultsList;
