/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { ClipboardCopyBtn, DownloadMetadataBtn } from 'src/repo/repoHome/RepoCommon';
import RdfBtn from 'src/repo/chemrepo/RdfBtn';

/**
 * Component to render the Analysis DOI link section
 * @param {Object} props - Component properties
 * @returns {React.ReactElement} DOI link section
 */
const AnalysisDOILink = ({ analysis, isPublic }) => {
  return isPublic === false ? (
    <div className="sub-title d-flex align-items-center">
      <b>Analysis DOI:</b>&nbsp;
      {analysis.dataset_doi}&nbsp;
      <ClipboardCopyBtn text={`https://dx.doi.org/${analysis.dataset_doi}`} />
    </div>
  ) : (
    <div className="sub-title d-flex align-items-center">
      <b>Analysis DOI:</b>
      <Button
        variant="link"
        size="sm"
        onClick={() => {
          window.location = `https://dx.doi.org/${analysis.dataset_doi}`;
        }}
      >
        {analysis.dataset_doi}
      </Button>&nbsp;
      <ClipboardCopyBtn text={`https://dx.doi.org/${analysis.dataset_doi}`} />&nbsp;
      <DownloadMetadataBtn type="container" id={analysis.id} />&nbsp;
      <RdfBtn type="container" id={analysis.id} info={{ pid: analysis.pub_id, doi: analysis.dataset_doi }} />
    </div>
  );
};

AnalysisDOILink.propTypes = {
  analysis: PropTypes.object.isRequired,
  isPublic: PropTypes.bool.isRequired,
};

export default AnalysisDOILink;
