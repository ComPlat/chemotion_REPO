/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

const VersionComment = props => {
  const { element, onChange } = props;
  return (
    <Form.Group>
      <Form.Label>
        <span style={{ color: 'red' }}>* </span>
        <span style={{ color: '#2e6da4' }}>New Version Details</span>
      </Form.Label>
      <Form.Control
        as="textarea"
        placeholder="Please describe the changes of this new version"
        value={element.versionComment || ''}
        onChange={e => onChange(e.target.value)}
        rows={3}
      />
    </Form.Group>
  );
};


VersionComment.propTypes = {
  element: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default VersionComment;
