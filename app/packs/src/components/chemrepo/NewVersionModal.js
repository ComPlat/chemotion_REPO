import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip } from 'react-bootstrap';
import { get, isNil, isEmpty } from 'lodash';

import UserStore from '../stores/UserStore';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';

const NewVersionModal = (props) => {
  const {
    type, element, parent, className, bsSize, isPublisher, isLatestVersion, schemeOnly
  } = props;
  const [modalShow, setModalShow] = useState(false);

  const currentUserId = UserStore.getState().currentUser.id;

  // the props isPublisher and isLatestVersion are used in the publication interface,
  // while isElementPublisher and isElementLatestVersion are used in the ELN detail view
  const isElementPublisher = element.publication && get(element, 'publication.published_by') === currentUserId
  const isElementLatestVersion = element.tag && isNil(get(element.tag, 'taggable_data.new_version'))

  // if a publication is present in the element, we check if the review process is completed,
  // otherwise we assume the publication is complete, since the button is on the publication interface
  const isComplete = isNil(element.publication) || get(element.publication, 'state') === 'completed'

  // init variables for the render function
  let display = false,
      disable = false,
      title = <span>Create a new version of this {type.toLowerCase()}</span>,
      tooltip = <Tooltip>Create a new version of this {type.toLowerCase()}.</Tooltip>;

  switch (type) {
    case 'Reaction':
      display = (isPublisher || isElementPublisher) && isComplete;
      disable = !(isLatestVersion || isElementLatestVersion);
      if (disable) {
        tooltip = <Tooltip>A new version of this reaction has already been created.</Tooltip>;
      }
      break;
    case 'ReactionSamples':
      display = true;
      title = <span>Create a new versions of all samples of this reaction.</span>
      tooltip = <Tooltip>Create a new versions of all samples of this reaction.</Tooltip>;
      break;
    case 'Sample':
      const belongsToReaction = !isNil(get(element, 'tag.taggable_data.reaction_id')) || !isEmpty(element.reaction_ids);

      display = (isPublisher || isElementPublisher) && isComplete;
      disable = !(isLatestVersion || isElementLatestVersion) || belongsToReaction;
      if (disable) {
        tooltip = belongsToReaction
          ? <Tooltip>This sample belongs to a reaction. Please create a new version of the reaction.</Tooltip>
          : <Tooltip>A new version of this sample has already been created.</Tooltip>;
      }
      break;
    case 'Analysis':
      display = element.link_id && parent && parent.can_update;
      break;
    default:
      break;
  }

  const openModal = (event) => {
    event.stopPropagation();
    if (!disable) {
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

  // fake the disabled style since otherwise the overlay would not show
  const btnClassName = className + (disable ? ' new-version-btn-disabled' : '');

  if (display) {
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
              {title}
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
