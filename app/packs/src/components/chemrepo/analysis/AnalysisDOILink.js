/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { ClipboardCopyBtn, DownloadMetadataBtn } from 'src/repoHome/RepoCommon';
import RdfBtn from 'src/components/chemrepo/RdfBtn';

/**
 * Component to render the Analysis DOI link section
 * @param {Object} props - Component properties
 * @returns {React.ReactElement} DOI link section
 */
const AnalysisDOILink = ({ analysis, isPublic }) => {
  return isPublic === false ? (
    <div className="sub-title" inline="true">
      <b>Analysis DOI: </b>
      {analysis.dataset_doi}&nbsp;
      <ClipboardCopyBtn text={`https://dx.doi.org/${analysis.dataset_doi}`} />
    </div>
  ) : (
    <div className="sub-title" inline="true">
      <b>Analysis DOI:</b>
      <Button
        bsStyle="link"
        bsSize="small"
        onClick={() => {
          window.location = `https://dx.doi.org/${analysis.dataset_doi}`;
        }}
      >
        {analysis.dataset_doi}
      </Button>
      <ClipboardCopyBtn text={`https://dx.doi.org/${analysis.dataset_doi}`} />
      <DownloadMetadataBtn type="container" id={analysis.id} />
      <RdfBtn type="container" id={analysis.id} info={{ pid: analysis.pub_id, doi: analysis.dataset_doi }} />
    </div>
  );
};

AnalysisDOILink.propTypes = {
  analysis: PropTypes.object.isRequired,
  isPublic: PropTypes.bool.isRequired,
};

export default AnalysisDOILink;
