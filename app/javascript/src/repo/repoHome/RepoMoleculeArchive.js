/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Badge, OverlayTrigger, Popover, Tooltip } from 'react-bootstrap';
import PublicActions from 'src/repo/actions/PublicActions';
import Formula from 'src/components/common/Formula';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';
import RepoSvgZoomModal from 'src/repo/chemrepo/common/RepoSvgZoomModal';

const pubchemTag = (molecule) => {
  if (
    molecule
    && molecule.tag
    && molecule.tag.taggable_data
    && molecule.tag.taggable_data.pubchem_cid
  ) {
    return { pubchem_tag: { pubchem_cid: molecule.tag.taggable_data.pubchem_cid } };
  }
  return false;
};

const RepoMoleculeArchive = (props) => {
  const {
    molecule, currentElement, isPubElement, advFlag, advType, advValue,
  } = props;
  // In the narrow (detail-open) list the row shows a compact summary; the
  // expand toggle reveals the full metadata inline without leaving the list.
  const [expanded, setExpanded] = useState(false);
  if (!molecule.xvial_count) return null;

  const isFocus = currentElement
    && currentElement.molecule
    && currentElement.molecule.id === molecule.id;
  const svgPath = molecule.sample_svg_file
    ? `/images/samples/${molecule.sample_svg_file}`
    : `/images/molecules/${molecule.molecule_svg_file}`;
  const pubchemInfo = pubchemTag(molecule);
  const provider = molecule.xvial_archive?.[0]?.provided_by;
  const group = molecule.xvial_archive?.[0]?.group || 'Stefan Bräse Group';
  const publishedOn = molecule.publication?.published_at || '';
  const crsId = molecule.publication?.id ? `CRS-${molecule.publication.id}` : '';
  const anaCnt = molecule.ana_cnt || 0;

  // Contributor chip in the badges row (between the archive icon and the
  // Chemotion ID), same as the publication search list: the contributor's
  // name_abbreviation in a neutral pill, full name + affiliation on hover.
  const pub = molecule.publication || {};
  const contributorTip = (
    <Tooltip id={`repo-archive-contributor-tt-${molecule.id}`}>
      <div>{pub.contributor}</div>
      {pub.contributor_affiliation && (
        <div className="repo-result-contributor-aff">{pub.contributor_affiliation}</div>
      )}
    </Tooltip>
  );
  const contributorBadge = pub.contributor_abbreviation && (
    <OverlayTrigger placement="top" overlay={contributorTip}>
      <span className="badge bg-light text-dark border repo-result-contributor-pill" tabIndex={0}>
        <span aria-hidden="true">{pub.contributor_abbreviation}</span>
        <span className="visually-hidden">
          Contributor: {pub.contributor}
          {pub.contributor_affiliation ? `, ${pub.contributor_affiliation}` : ''}
        </span>
      </span>
    </OverlayTrigger>
  );

  const handleClick = () => PublicActions.displayMolecule(
    molecule.id,
    molecule.publication?.id || null,
    '',
    advFlag,
    advType,
    advValue,
    RepoNavListTypes.MOLECULE_ARCHIVE,
  );
  const handleKey = (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); };

  const badgesRow = (
    <div className="d-flex align-items-baseline gap-1 flex-wrap mb-1">
      <Badge bg="success" title="Physical sample available in the Compound Platform archive">
        <i className="icon-sample" aria-hidden="true" />
        <span className="visually-hidden">Physical sample</span>
      </Badge>
      {contributorBadge}
      {crsId && <span className="badge bg-light text-dark border">{crsId}</span>}
      {molecule.embargo && (
        <Badge bg="primary" title="Embargo bundle">{molecule.embargo}</Badge>
      )}
      {anaCnt > 0 && (
        <span className="repo-result-meta" title="Number of analyses">
          {anaCnt} analyses
        </span>
      )}
      {pubchemInfo && (
        <span className="repo-pub-list-icons">
          <PubchemLabels element={pubchemInfo} />
        </span>
      )}
      {isPubElement && (
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

  const formulaLine = (
    <div className="repo-result-meta">
      <strong>Formula: </strong>
      <Formula formula={molecule.sum_formular} />
    </div>
  );

  const providerLine = provider && (
    <div className="repo-result-meta">
      <strong>Provided by: </strong>
      {provider}
    </div>
  );

  const groupLine = (
    <div className="repo-result-meta">
      <strong>Group: </strong>
      {group}
    </div>
  );

  const publishedLine = publishedOn && (
    <div className="repo-result-meta">
      <strong>Published on: </strong>
      {publishedOn}
    </div>
  );

  // Hover preview: show the full-size structure in a floating popover so the
  // user can read a cramped thumbnail without opening the detail. The arrow is
  // hidden via CSS (.repo-search-thumb-popover).
  const thumbPopover = (
    <Popover
      id={`repo-archive-thumb-pop-${molecule.id}`}
      className="repo-search-thumb-popover"
      style={{ maxWidth: 'none', maxHeight: 'none' }}
    >
      <div style={{ padding: 8 }}>
        <img
          src={svgPath}
          alt=""
          style={{
            display: 'block', maxWidth: '55vw', maxHeight: '45vh', width: 'auto', height: 'auto',
          }}
        />
      </div>
    </Popover>
  );

  return (
    <li
      className={`repo-search-result-row cursor-pointer${isPubElement ? ' is-detail-open' : ''}${isFocus ? ' active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyPress={handleKey}
    >
      <div className="repo-search-result-row-top d-flex gap-3">
        <div className="repo-search-result-thumb flex-shrink-0">
          <OverlayTrigger
            trigger={['hover', 'focus']}
            placement="right"
            overlay={thumbPopover}
          >
            <img src={svgPath} alt={crsId || molecule.sum_formular || 'Sample'} />
          </OverlayTrigger>
          <RepoSvgZoomModal
            svgPath={svgPath}
            title={crsId || molecule.sum_formular}
            buttonClassName="repo-search-result-thumb-zoom"
          />
        </div>
        {!isPubElement && (
          <div className="flex-grow-1 min-w-0">
            {badgesRow}
            {formulaLine}
            {providerLine}
            {groupLine}
            {publishedLine}
          </div>
        )}
      </div>
      {isPubElement && (
        <div className="repo-search-result-row-bottom">
          {badgesRow}
          {expanded && (
            <>
              {formulaLine}
              {providerLine}
              {groupLine}
              {publishedLine}
            </>
          )}
        </div>
      )}
    </li>
  );
};

RepoMoleculeArchive.propTypes = {
  molecule: PropTypes.object.isRequired,
  currentElement: PropTypes.object,
  isPubElement: PropTypes.bool,
  advFlag: PropTypes.bool,
  advType: PropTypes.string,
  advValue: PropTypes.any,
};

RepoMoleculeArchive.defaultProps = {
  isPubElement: false,
  currentElement: null,
  advFlag: false,
  advType: '',
  advValue: null,
};

export default RepoMoleculeArchive;
