/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { ClipboardCopyBtn } from 'src/repoHome/RepoCommon';

/**
 * Component to render the Analysis ID link section
 * @param {Object} props - Component properties
 * @returns {React.ReactElement} Analysis ID link section
 */
const AnalysisIDLink = ({ analysis, isPublic, insText }) => {
  const instrumentTextStyle = {
    marginLeft: '30px',
    display: 'inline-block',
    fontWeight: 'bold',
  };

  return isPublic === false ? (
    <div className="sub-title" inline="true">
      <b>Analysis ID:</b>
      <Button
        bsStyle="link"
        bsSize="small"
        onClick={() => {
          window.location = `/pid/${analysis.pub_id}`;
        }}
      >
        CRD-{analysis.pub_id}
      </Button>
      <ClipboardCopyBtn
        text={`https://www.chemotion-repository.net/pid/${analysis.pub_id}`}
      />
      <span style={instrumentTextStyle}>{insText}</span>
    </div>
  ) : (
    <div className="sub-title" inline="true">
      <b>Analysis ID:</b>
      <Button
        bsStyle="link"
        bsSize="small"
        onClick={() => {
          window.location = `/pid/${analysis.pub_id}`;
        }}
      >
        CRD-{analysis.pub_id}
      </Button>
      <ClipboardCopyBtn
        text={`https://www.chemotion-repository.net/pid/${analysis.pub_id}`}
      />
    </div>
  );
};

AnalysisIDLink.propTypes = {
  analysis: PropTypes.object.isRequired,
  isPublic: PropTypes.bool.isRequired,
  insText: PropTypes.string,
};

AnalysisIDLink.defaultProps = {
  insText: '',
};

export default AnalysisIDLink;
