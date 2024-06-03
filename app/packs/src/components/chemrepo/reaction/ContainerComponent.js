/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Col } from 'react-bootstrap';
import ContainerDatasets from 'src/components/container/ContainerDatasets';

function ContainerComponent({ container }) {
  return (
    <div className="small-p">
      <h4>Datasets</h4>
      <Col md={12}>
        <ContainerDatasets
          container={container}
          readOnly
          disabled
          onChange={() => {}}
        />
      </Col>
    </div>
  );
}

ContainerComponent.propTypes = {
  container: PropTypes.object.isRequired,
};

export default ContainerComponent;
