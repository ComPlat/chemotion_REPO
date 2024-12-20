/* eslint-disable react/forbid-prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  OverlayTrigger,
  ButtonToolbar,
} from 'react-bootstrap';
import { get, isNil } from 'lodash';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';

import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';

import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';

import createVerTooltip from 'src/components/chemrepo/VersionTooltip';

const isMyDB = () => window.location.pathname.startsWith('/mydb/');

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
  // app/packs/src/components/Material.js
  //   create new sample for a new reaction version
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
    type, element, parent, parentId, className, bsSize, isPublisher, isLatestVersion, schemeOnly, repoVersioning
  } = props;
  if (!repoVersioning) return null;

  const [newVersion, setNewVersion] = useState({ show: false, collection: null, modalShow: false, parent: null, disableSubmit: false });
  const [tagDisabled, setTagDisabled] = useState(() => {
    const isElementLatestVersion = element.tag && isNil(get(element.tag, 'taggable_data.new_version'));
    switch (type) {
      case 'Reaction':
        return !(isLatestVersion || isElementLatestVersion) || element.changed;
      case 'ReactionSamples':
        return element.changed;
      case 'Sample':
        return !(isLatestVersion || isElementLatestVersion) || element.changed || (parent && parent.changed);
      default:
        return false;
    }
  });

  // Work with tagDisabled if needed
  // useEffect(() => {
  //   if (newVersion.collection) {
  //     setTagDisabled(true);
  //   }
  // }, [newVersion.collection]);

  const currentUser = UserStore.getState().currentUser || {};
  const currentElement = ElementStore.getState().currentElement;

  // the props isPublisher and isLatestVersion are used in the publication interface,
  // while isElementPublisher and isElementLatestVersion are used in the ELN detail view
  const isElementPublisher = element.publication && get(element, 'publication.published_by') === currentUser.id;
  const isElementLatestVersion = element.tag && isNil(get(element.tag, 'taggable_data.new_version'));

  // if a publication is present in the element, we check if the review process is completed,
  // otherwise we assume the publication is complete (the button is on the publication interface)
  const isComplete = isNil(element.publication) || get(element.publication, 'state') === 'completed';

  // init variables for the render function
  let displayVersioning = false;
  let disable = false;
  let title = <span>Create a new version of this {type.toLowerCase()}</span>;
  let tooltip = createVerTooltip({type, state: 'new'});

  switch (type) {
    case 'Reaction':
      displayVersioning = (isPublisher || isElementPublisher) && isComplete;
      disable = !(isLatestVersion || isElementLatestVersion) || element.changed; // || tagDisabled;
      if (disable) {
        tooltip = element.changed
          ? createVerTooltip({type, state: 'unsaved'}) : createVerTooltip({type, state: 'exists'});
      }
      break;
    case 'ReactionSamples':
      displayVersioning = true;
      disable = element.changed; // || tagDisabled;
      title = <span>Create a new versions of all samples of this reaction.</span>
      if (disable) {
        tooltip = createVerTooltip({type: 'reaction', state: 'unsaved'});
      }
      break;
    case 'Sample':
      displayVersioning = (isPublisher || isElementPublisher) && isComplete;
      disable = !(isLatestVersion || isElementLatestVersion) || element.changed || (parent && parent.changed); // || tagDisabled;
      if (disable) {
        if (element.changed) {
          tooltip = createVerTooltip({type, state: 'unsaved'});
        } else if (parent && parent.changed) {
          tooltip = createVerTooltip({type: parent.type, state: 'unsaved'});
        } else {
          tooltip = createVerTooltip({type, state: 'exists'});
        }
      }
      break;
    case 'Analysis':
      displayVersioning = element.link_id && parent && parent.can_update;
      break;
    default:
      break;
  }

  const openModal = (event) => {
    event.stopPropagation();
    if (!disable) {
      setNewVersion(prevState => ({
        ...prevState,
        modalShow: true,
      }));
    }
  };

  const closeModal = () => {
    const { collection, parent } = newVersion;
    if (collection) {
      if (isMyDB()) {
        switch (type) {
          case 'Reaction':
            DetailActions.close(element);
            if (element.type == 'sample') {
              ElementActions.fetchSampleById(element.id);
            } else if (element.type == 'reaction') {
              ElementActions.fetchReactionById(element.id);
            }
            break;
          case 'Analysis':
            DetailActions.close(currentElement);
            if (currentElement.type == 'sample') {
              ElementActions.fetchSampleById(currentElement.id);
            } else if (currentElement.type == 'reaction') {
              ElementActions.fetchReactionById(currentElement.id);
            }
            break;
          case 'Sample':
            DetailActions.close(element);
            if (parent) {
              DetailActions.close(parent);
              ElementActions.fetchReactionById(parent.id);
            } else {
              ElementActions.fetchSampleById(element.id);
            }
            break;
          default:
            UIActions.selectSyncCollection(collection);
            break;
        }
        setNewVersion({ show: false, collection: null, modalShow: false, parent: null, disableSubmit: false });
      } else {
        PublicActions.close(element, true);
      }
    } else {
      setNewVersion({ show: false, collection: null, modalShow: false, parent: null, disableSubmit: false });
    }
  };

  const handleGo = (event) => {
    event.stopPropagation();
    const { collection } = newVersion;
    if (isMyDB()) { // MyDB condition will not be triggered because the button is disabled for MyDB
      DetailActions.close(element);
      UIActions.selectSyncCollection(collection);
      setNewVersion({ show: false, collection: null, modalShow: false, parent: null, disableSubmit: false });
    } else {
      window.location = `/mydb/scollection/${collection.id}/`; // go to the New Versions collection
    }
  };

  const handleSubmit = (event) => {
    event.stopPropagation();
    setNewVersion(prevState => ({
      ...prevState,
      disableSubmit: true,
    }));
    let promise;
    switch (type) {
      case 'Reaction':
        promise = RepositoryFetcher.createNewVersionJobMock({
          id: element.id,
          type: 'reactions',
          parent_id: null,
          schemeOnly: schemeOnly,
          is_async: !isMyDB(),
        });
        break;
      case 'Sample':
        promise = RepositoryFetcher.createNewVersionJobMock({
          id: element.id,
          type: 'samples',
          parent_id: parent?.id || parentId,
          is_async: !isMyDB(),
        });
        break;
      case 'Analysis':
        promise = RepositoryFetcher.createNewVersionJobMock({
          id: element.id,
          type: 'containers',
          parent_id: parent?.id || parentId,
          parent_type: parent?.type,
          link_id: element.link_id,
          is_async: !isMyDB(),
        });
        break;
    }
    promise.then((json) => {
      setNewVersion(prevState => ({
        ...prevState,
        show: true,
        collection: { ...json?.newVerCol, is_sync_to_me: true },
        parent,
      }));
    });
  };

  // fake the disabled style since otherwise the overlay would not show
  const btnClassName = className + (disable ? ' new-version-btn-disabled' : '');

  if (displayVersioning) {
    return (
      <>
        <OverlayTrigger placement="top" overlay={tooltip}>
          <Button bsSize={bsSize} bsStyle="success" onClick={openModal} className={btnClassName}>
            <i className="fa fa-tag" />
          </Button>
        </OverlayTrigger>
        <Modal
          show={newVersion.modalShow}
          onHide={closeModal}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            {
              newVersion.show &&
              (
                <p>
                  The creation of a new version is already in process. You can continue working by closing this modal window or navigating to the <strong>MyDB > New Versions</strong> collection.
                </p>
               )
            }
            <ButtonToolbar>
              <Button
                bsStyle="warning"
                onClick={closeModal}
              > Close
              </Button>
              {
                !newVersion.show &&
                <Button
                  bsStyle="success"
                  onClick={handleSubmit}
                  disabled={newVersion.disableSubmit}
                > Create
                {
                  newVersion.disableSubmit &&
                  <i className="fa fa-circle-o-notch fa-spin fa-fw" />
                }
                </Button>
              }
              {
                newVersion.show && !isMyDB() &&
                <Button
                  bsStyle="primary"
                  onClick={handleGo}
                > Go to My DB > New Versions
                </Button>
              }
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
  element: PropTypes.object.isRequired,
  parent: PropTypes.object,
  parentId: PropTypes.number,
  className: PropTypes.string,
  bsSize: PropTypes.string,
  isPublisher: PropTypes.bool,
  isLatestVersion: PropTypes.bool,
  repoVersioning: PropTypes.bool,
  schemeOnly: PropTypes.bool,
};

NewVersionModal.defaultProps = {
  parent: null,
  parentId: null,
  className: '',
  bsSize: 'xsmall',
  isPublisher: false,
  isLatestVersion: false,
  repoVersioning: false,
  schemeOnly: false,
};

export default NewVersionModal;
