/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';

function VersionComment(props) {
  const { element, onChange } = props;
  return (
    <FormGroup>
      <ControlLabel>
        <span style={{ color: 'red' }}>* </span>
        <span style={{ color: '#2e6da4' }}>New Version Details</span>
      </ControlLabel>
      <FormControl
        componentClass="textarea"
        placeholder="Please describe the changes of this new version"
        value={element.versionComment || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </FormGroup>
  );
}

VersionComment.propTypes = {
  element: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default VersionComment;
