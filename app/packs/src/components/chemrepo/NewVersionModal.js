import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip } from 'react-bootstrap';
import { get, isNil, isEmpty } from 'lodash';

import ElementActions from '../actions/ElementActions';
import DetailActions from '../actions/DetailActions';
import UIActions from '../actions/UIActions';

import ElementStore from '../stores/ElementStore';
import UserStore from '../stores/UserStore';

import RepositoryFetcher from '../fetchers/RepositoryFetcher';

const NewVersionModal = (props) => {
  // this component is used in several other components to create new version of
  // already published elements/containers. it is easy to loose track, so they are listed here:
  //
  // app/packs/src/components/SampleDetails.js
  //   create new sample version
  //
  // app/packs/src/components/ReactionDetails.js
  //   create new reaction version
  //
  // app/packs/src/components/ReactionDetailsScheme.js
  //   create new samples for a new reaction version
  //
  // app/packs/src/components/SampleDetailsContainersAux.js
  //   create new analysis version for a new sample version
  //
  // app/packs/src/components/ReactionDetailsContainers.js
  //   create new analysis version for a new reaction version
  //
  // app/packs/src/libHome/RepoSample.js
  //   create new sample version from publication view
  //
  // app/packs/src/libHome/RepoReactionDetails.js
  //   create new reaction version from publication view
  //
  // Since the different "parent" components use different API endpoints, this component
  // needs to use different props and attributes of element to determine if it should be
  // displayed, disabled, or which tooltip is displayed.

  const {
    type, element, parent, className, bsSize, isPublisher, isLatestVersion, schemeOnly
  } = props;
  const [modalShow, setModalShow] = useState(false);

  const currentUser = UserStore.getState().currentUser || {};
  const currentElement = ElementStore.getState().currentElement;

  // the props isPublisher and isLatestVersion are used in the publication interface,
  // while isElementPublisher and isElementLatestVersion are used in the ELN detail view
  const isElementPublisher = element.publication && get(element, 'publication.published_by') === currentUser.id;
  const isElementLatestVersion = element.tag && isNil(get(element.tag, 'taggable_data.new_version'));

  // if a publication is present in the element, we check if the review process is completed,
  // otherwise we assume the publication is complete (the button is on the publication interface)
  const isComplete = isNil(element.publication) || get(element.publication, 'state') === 'completed';

  // chek if the element (a sample) belongs to a reaction or not
  const belongsToReaction = !isNil(get(element, 'tag.taggable_data.reaction_id')) || !isEmpty(element.reaction_ids);

  // init variables for the render function
  let display = false;
  let disable = false;
  let title = <span>Create a new version of this {type.toLowerCase()}</span>;
  let tooltip = <Tooltip>Create a new version of this {type.toLowerCase()}.</Tooltip>;

  switch (type) {
    case 'Reaction':
      display = (isPublisher || isElementPublisher) && isComplete;
      disable = !(isLatestVersion || isElementLatestVersion) || element.changed;
      if (disable) {
        tooltip = element.changed
          ? <Tooltip>A new version cannot be created from an unsaved reaction.</Tooltip>
          : <Tooltip>A new version of this reaction has already been created.</Tooltip>;
      }
      break;
    case 'ReactionSamples':
      display = true;
      disable = element.changed;
      title = <span>Create a new versions of all samples of this reaction.</span>
      if (disable) {
        tooltip = <Tooltip>A new versions cannot be created from an unsaved reaction.</Tooltip>;
      }
      break;
    case 'Sample':
      display = (isPublisher || isElementPublisher) && isComplete;
      disable = !(isLatestVersion || isElementLatestVersion) || belongsToReaction || element.changed;
      if (disable) {
        if (belongsToReaction) {
          tooltip = <Tooltip>This sample belongs to a reaction. Please create a new version of the reaction.</Tooltip>;
        } else if (element.changed) {
          tooltip = <Tooltip>A new version cannot be created from an unsaved sample.</Tooltip>;
        } else {
          tooltip = <Tooltip>A new version of this sample has already been created.</Tooltip>;
        }
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

  const getNewVersionCollection = (newElement) => {
    const collection = newElement.tag.taggable_data.collection_labels
      .find(c => c.user_id === currentUser.id);

    // this is a bit hacky but I don't know how to find the collection in the state
    collection.is_sync_to_me = true;

    return collection;
  }

  const handleSubmit = (event) => {
    event.stopPropagation();

    let promise;
    switch (type) {
      case 'Reaction':
        if (schemeOnly) {
          promise = RepositoryFetcher.createNewReactionSchemeVersion({ reactionId: element.id })
        } else {
          promise = RepositoryFetcher.createNewReactionVersion({ reactionId: element.id })
        }
        promise.then((reaction) => {
            setModalShow(false);

            const collection = getNewVersionCollection(reaction);

            if (window.location.pathname.startsWith('/mydb/')) {
              UIActions.selectSyncCollection(collection);
              DetailActions.close(element);
              ElementActions.fetchReactionById(reaction.id);
            } else {
              window.location = `/mydb/scollection/${collection.id}/reaction/${reaction.id}`;
            }
          });
        break;
      case 'ReactionSamples':
        RepositoryFetcher.createNewReactionSamplesVersion({ reactionId: element.id })
          .then((reaction) => {
            setModalShow(false);

            DetailActions.close(element);
            ElementActions.fetchReactionById(reaction.id);
          });
        break;
      case 'Sample':
        RepositoryFetcher.createNewSampleVersion({ sampleId: element.id })
          .then((sample) => {
            setModalShow(false);

            const collection = getNewVersionCollection(sample);

            if (window.location.pathname.startsWith('/mydb/')) {
              UIActions.selectSyncCollection(collection);
              DetailActions.close(element);
              ElementActions.fetchSampleById(sample.id);
            } else {
              window.location = `/mydb/scollection/${collection.id}/sample/${sample.id}`;
            }
          });
        break;
      case 'Analysis':
        RepositoryFetcher.createNewAnalysisVersion({
          analysisId: element.id,
          linkId: element.link_id,
          parentType: parent.type,
          parentId: parent.id
        }).then((analysis) => {
          setModalShow(false);

          DetailActions.close(currentElement);

          if (currentElement.type == 'sample') {
            ElementActions.fetchSampleById(currentElement.id);
          } else if (currentElement.type == 'reaction') {
            ElementActions.fetchReactionById(currentElement.id);
          }
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
