import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip, FormControl } from 'react-bootstrap';
import { get } from 'lodash'

import UserStore from '../stores/UserStore';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';

const NewVersionModal = (props) => {
  const { type, element, parent, className, bsSize, isPublisher, isLatestVersion } = props;
  const [modalShow, setModalShow] = useState(false);
  const commentInputRef = useRef(null);

  const isElementPublisher = element.publication && (element.publication.published_by == UserStore.getState().currentUser.id)
  const isElementLatestVersion = !get(element, 'tag.taggable_data.new_version')

  const openModal = () => {
    if (isLatestVersion || isElementLatestVersion) {
      setModalShow(true)
    }
  }

  const handleSubmit = () => {
    switch (type) {
      case 'Reaction':
        RepositoryFetcher.createNewReactionVersion({ id: element.id }).then((reaction) => {
          setModalShow(false);
          window.location = `/mydb/collection/all/reaction/${reaction.id}`
        });
        break;
      case 'Sample':
        RepositoryFetcher.createNewSampleVersion({ id: element.id, reactionId: parent.id }).then((sample) => {
          setModalShow(false);
          window.location = `/mydb/collection/all/sample/${sample.id}`
        });
        break;
    }
  };

  const defaultAttrs = {
    style: {
      height: '400px', overflow: 'auto', whiteSpace: 'pre'
    }
  };

  const tooltip = (isLatestVersion || isElementLatestVersion)
                  ? <Tooltip id="tt_metadata">Create a new version of this {type.toLowerCase()}</Tooltip>
                  : <Tooltip id="tt_metadata">A new version of this {type.toLowerCase()} has already been created</Tooltip>

  // fake the disabled style since otherwise the overlay would not show
  const btnClassName = className + ((isLatestVersion || isElementLatestVersion) ? '' : ' new-version-btn-disabled')

  if (isPublisher || isElementPublisher) {
    return (
      <>
        <OverlayTrigger placement="top" overlay={tooltip}>
          <Button bsSize={bsSize} bsStyle="success" onClick={openModal} className={btnClassName}>
            <i className="fa fa-tag" />
          </Button>
        </OverlayTrigger>
        <Modal
          show={modalShow}
          onHide={() => setModalShow(false)}
          dialogClassName="pub-info-dialog"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Create a new version of this {type.toLowerCase()}
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
              > Create
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
  type: PropTypes.string,
  element: PropTypes.object,
  parent: PropTypes.object,
  className: PropTypes.string,
  bsSize: PropTypes.string,
  isPublisher: PropTypes.bool,
  isLatestVersion: PropTypes.bool
};


NewVersionModal.defaultProps = {
  parent: {},
  className: '',
  bsSize: 'xsmall'
};

export default NewVersionModal;
