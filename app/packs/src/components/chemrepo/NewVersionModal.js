import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip, FormControl } from 'react-bootstrap';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';

const NewVersionModal = (props) => {
  const { isPublisher, id, type, title } = props;
  const [modalShow, setModalShow] = useState(false);
  const commentInputRef = useRef(null);

  const handleSubmit = () => {
    RepositoryFetcher.createNewSampleVersion({ id }).then(() => setModalShow(false));
  };

  const defaultAttrs = {
    style: {
      height: '400px', overflow: 'auto', whiteSpace: 'pre'
    }
  };

  if (isPublisher) {
    return (
      <>
        <OverlayTrigger placement="top" overlay={<Tooltip id="tt_metadata">Create a new version</Tooltip>}>
          <Button bsSize="xsmall" bsStyle="success" onClick={() => setModalShow(true)}>
            <i className="fa fa-paper-plane" />
          </Button>
        </OverlayTrigger>
        <Modal
          show={modalShow}
          onHide={() => setModalShow(false)}
          dialogClassName="pub-info-dialog"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Create a new version
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            <ButtonToolbar>
              <Button
                bsStyle="warning"
                onClick={() => setModalShow(false)}
              > Close
              </Button>
              <Button
                bsStyle="success"
                onClick={handleSubmit}
              > Create new version
              </Button>
            </ButtonToolbar>
          </Modal.Body>
        </Modal>
      </>
    );
  }

  return null;
};

NewVersionModal.propTypes = {
  sampleId: PropTypes.number.isRequired,
  isPublisher: PropTypes.bool,
  type: PropTypes.string,
  title: PropTypes.string
};

NewVersionModal.defaultProps = {
  isPublisher: false
};

export default NewVersionModal;
