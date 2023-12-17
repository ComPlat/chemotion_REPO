import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip } from 'react-bootstrap';
import { get } from 'lodash';

import UserStore from '../stores/UserStore';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';

const NewVersionModal = (props) => {
  const {
    type, element, parent, className, bsSize, isPublisher, isLatestVersion, schemeOnly
  } = props;
  const [modalShow, setModalShow] = useState(false);

  const currentUserId = UserStore.getState().currentUser.id;

  const isElementPublisher = element.publication && (
    element.publication.published_by === currentUserId
  );
  const canUpdateParent = parent && parent.can_update;

  let isElementLatestVersion;
  if (type == 'Analysis') {
    isElementLatestVersion = !get(element, 'extended_metadata.new_version_id')
  } else {
    isElementLatestVersion = !get(element, 'element.tag.taggable_data.new_version')
  }

  const isPending = element.publication && element.publication.state !== 'completed';

  const openModal = (event) => {
    event.stopPropagation();
    if (isLatestVersion || isElementLatestVersion) {
      setModalShow(true);
    }
  };

  const closeModal = () => {
    setModalShow(false);
  };

  const redirectAfterSubmit = (newElement) => {
    const collection = newElement.tag.taggable_data.collection_labels
      .find(c => c.user_id === currentUserId);

    if (window.location.pathname.startsWith('/mydb/')) {
      // eslint-disable-next-line no-undef
      Aviator.navigate(`/scollection/${collection.id}/${newElement.type}/${newElement.id}`);
    } else {
      window.location = `/mydb/scollection/${collection.id}/${newElement.type}/${newElement.id}`;
    }
  };

  const handleSubmit = (event) => {
    event.stopPropagation();
    switch (type) {
      case 'Reaction':
        if (schemeOnly) {
          RepositoryFetcher.createNewReactionSchemeVersion({ reactionId: element.id })
            .then((reaction) => {
              setModalShow(false);
              redirectAfterSubmit(reaction);
            });
        } else {
          RepositoryFetcher.createNewReactionVersion({ reactionId: element.id })
            .then((reaction) => {
              setModalShow(false);
              redirectAfterSubmit(reaction);
            });
        }
        break;
      case 'Sample':
        RepositoryFetcher.createNewSampleVersion({ sampleId: element.id, reactionId: parent.id })
          .then((sample) => {
            setModalShow(false);
            redirectAfterSubmit(sample);
          });
        break;
      case 'Analysis':
        RepositoryFetcher.createNewAnalysisVersion({
          analysisId: element.id,
          linkId: element.link_id,
          parentType: parent.type,
          parentId: parent.id
        }).then((sampleOrReaction) => {
          setModalShow(false);
          redirectAfterSubmit(sampleOrReaction);
        });
        break;
      default:
        break;
    }
  };

  const tooltip = (isLatestVersion || isElementLatestVersion)
    ? <Tooltip>Create a new version of this {type.toLowerCase()}</Tooltip>
    : <Tooltip>A new version of this {type.toLowerCase()} has already been created</Tooltip>;

  // fake the disabled style since otherwise the overlay would not show
  const btnClassName = className + ((isLatestVersion || isElementLatestVersion) ? '' : ' new-version-btn-disabled');

  if ((isPublisher || isElementPublisher || canUpdateParent) && !isPending) {
    return (
      <>
        <OverlayTrigger placement="top" overlay={tooltip}>
          <Button bsSize={bsSize} bsStyle="success" onClick={openModal} className={btnClassName}>
            <i className="fa fa-tag" />
          </Button>
        </OverlayTrigger>
        <Modal
          show={modalShow}
          onHide={closeModal}
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
                onClick={closeModal}
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
  type: PropTypes.string.isRequired,
  element: PropTypes.oneOf(['sample', 'reaction']).isRequired,
  parent: PropTypes.oneOf(['reaction']),
  className: PropTypes.string,
  bsSize: PropTypes.string,
  isPublisher: PropTypes.bool,
  isLatestVersion: PropTypes.bool,
  schemeOnly: PropTypes.bool
};


NewVersionModal.defaultProps = {
  parent: {},
  className: '',
  bsSize: 'xsmall',
  isPublisher: false,
  isLatestVersion: false,
  schemeOnly: false
};

export default NewVersionModal;
