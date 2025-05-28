import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';
import RdfDataViewer from 'src/components/chemrepo/RdfDataViewer';

const mapping = {
  sample: ['Sample', 'CRS-'],
  reaction: ['Reaction', 'CRR-'],
  container: ['Analysis', 'CRD-'],
};

/**
 * RdfBtn component that opens a modal with RDF data viewer
 */
const RdfBtn = ({
  type,
  id,
  info = { pid: '', doi: '' },
  buttonText = 'RDF Data',
  buttonStyle = 'primary',
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <Button
        bsSize="xs"
        bsStyle={buttonStyle}
        onClick={handleOpenModal}
        title="View and download RDF data in different formats"
      >
        {buttonText}
      </Button>

      <Modal show={showModal} onHide={handleCloseModal} bsSize="large">
        <Modal.Header closeButton>
          <Modal.Title>
            RDF Data for {mapping[type][0]} {mapping[type][1]}
            {info.pid}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <RdfDataViewer type={type} id={id} />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleCloseModal}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

RdfBtn.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  info: PropTypes.shape({
    pid: PropTypes.string,
    doi: PropTypes.string,
  }),
  buttonText: PropTypes.string,
  buttonStyle: PropTypes.string,
};

RdfBtn.defaultProps = {
  info: {
    pid: '',
    doi: '',
  },
  buttonText: 'RDF Data',
  buttonStyle: 'primary',
};

export default RdfBtn;
