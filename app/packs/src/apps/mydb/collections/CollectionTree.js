import React from 'react';
import { Button, OverlayTrigger, Badge, Glyphicon, Tooltip } from 'react-bootstrap';
import update from 'immutability-helper';
import Aviator from 'aviator';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserInfos from 'src/apps/mydb/collections/UserInfos';

const colVisibleTooltip = <Tooltip id="col_visible_tooltip">Toggle own collections</Tooltip>;

export default class CollectionTree extends React.Component {
  constructor(props) {
    super(props);

    const collecState = CollectionStore.getState();

    this.state = {
      unsharedRoots: collecState.unsharedRoots,
      sharedRoots: collecState.sharedRoots,
      remoteRoots: collecState.remoteRoots,
      lockedRoots: collecState.lockedRoots,
      syncInRoots: collecState.syncInRoots,
      ownCollectionVisible: true,
      sharedWithCollectionVisible: false,
      sharedToCollectionVisible: false,
      syncCollectionVisible: false,
      visible: false,
      root: {},
      selected: false,
    };

    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onChange);
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange);
  }

  handleSectionToggle = (visible) => {
    this.setState((prevState) => ({
      [visible]: !prevState[visible],
    }));
  };

  onChange(state) {
    this.setState(state);
  }

  lockedSubtrees() {
    const roots = this.state.lockedRoots;

    return this.subtrees(roots, null, false);
  }

  removeOrphanRoots(roots) {
    let newRoots = []
    roots.forEach((root) => {
      if (root.children.length > 0) newRoots.push(root)
    })

    return newRoots;
  }

  unsharedSubtrees() {
    let roots = this.state.unsharedRoots;
    roots = roots.filter(function (item) { return !item.isNew })

    return this.subtrees(roots, null, false);
  }

  sharedSubtrees() {
    let { sharedRoots, sharedToCollectionVisible } = this.state
    sharedRoots = this.removeOrphanRoots(sharedRoots)

    let labelledRoots = sharedRoots.map(e => {
      return update(e, {
        label: {
          $set:
            <span>{this.labelRoot('shared_to', e)}</span>
        }
      })
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div
          className="title"
          style={{ backgroundColor: 'white' }}
          onClick={() => this.handleSectionToggle('sharedToCollectionVisible')}
        >
          <i className="fa fa-share-alt share-icon" />&nbsp;&nbsp;
          My shared collections
        </div>
      </div>
    )
    return this.subtrees(labelledRoots, subTreeLabels,
      false, sharedToCollectionVisible)
  }

  remoteSubtrees() {
    let { remoteRoots, sharedWithCollectionVisible } = this.state
    remoteRoots = this.removeOrphanRoots(remoteRoots)

    let labelledRoots = remoteRoots.map(e => {
      return update(e, {
        label: {
          $set:
            <span>
              {this.labelRoot('shared_by', e)}
              {' '}
              {this.labelRoot('shared_to', e)}
            </span>
        }
      })
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div
          id="shared-home-link"
          className="title"
          style={{ backgroundColor: 'white' }}
          onClick={() => this.handleSectionToggle('sharedWithCollectionVisible')}
        >
          <i className="fa fa-share-alt share-icon" />
          &nbsp;&nbsp;
          Shared with me &nbsp;
        </div>
      </div>
    )

    return this.subtrees(labelledRoots, subTreeLabels,
      false, sharedWithCollectionVisible)
  }

  remoteSyncInSubtrees() {
    let { syncInRoots, syncCollectionVisible } = this.state
    syncInRoots = this.removeOrphanRoots(syncInRoots)

    let labelledRoots = syncInRoots.map(e => {
      return update(e, {
        label: {
          $set:
            <span>
              {this.labelRoot('shared_by', e)}
              {' '}
              {this.labelRoot('shared_to', e)}
            </span>
        }
      })
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div
          id="synchron-home-link"
          className="title"
          style={{ backgroundColor: 'white' }}
          onClick={() => this.handleSectionToggle('syncCollectionVisible')}
        >
          <i className="fa fa-share-alt" />&nbsp;&nbsp;
          Synchronized with me &nbsp;
        </div>
      </div>
    )

    return this.subtrees(labelledRoots, subTreeLabels,
      false, syncCollectionVisible)
  }


  labelRoot(sharedToOrBy, rootCollection) {
    let shared = rootCollection[sharedToOrBy]
    if (!shared) return <span />

    return (
      <OverlayTrigger placement="bottom" overlay={UserInfos({ users: [shared] })}>
        <span>
          &nbsp; {sharedToOrBy == 'shared_to' ? 'with' : 'by'}
          &nbsp; {shared.initials}
        </span>
      </OverlayTrigger>
    )
  }

  convertToSlug(name) {
    return name.toLowerCase()
  }

  subtrees(roots, label, isRemote, visible = true) {
    const { currentCollection } = UIStore.getState();
    const subtrees = roots && roots.map((root, index) => {
      return <CollectionSubtree root={root} key={index} isRemote={isRemote} currentCollection={currentCollection} />
    });

    let subtreesVisible = visible ? "" : "none"
    return (
      <div>
        {label}
        <div style={{ display: subtreesVisible }}>
          {subtrees}
        </div>
      </div>
    )
  }

  collectionManagementButton() {
    return (
      <div className="take-ownership-btn">
        <Button id="collection-management-button" bsSize="xsmall" bsStyle="danger"
          title="Manage & organize collections: create or delete collections, adjust sharing options, adjust the visibility of tabs based on the collection level"
          onClick={() => this.handleCollectionManagementToggle()}>
          <i className="fa fa-cog"></i>
        </Button>
      </div>
    )
  }

  handleCollectionManagementToggle() {
    UIActions.toggleCollectionManagement();
    const { showCollectionManagement, currentCollection, isSync } = UIStore.getState();
    if (showCollectionManagement) {
      Aviator.navigate('/collection/management');
    } else {
      if (currentCollection == null || currentCollection.label == 'All') {
        Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`);
      } else {
        Aviator.navigate(isSync
          ? `/scollection/${currentCollection.id}/${this.urlForCurrentElement()}`
          : `/collection/${currentCollection.id}/${this.urlForCurrentElement()}`);
      }
    }
  }

  urlForCurrentElement() {
    const { currentElement } = ElementStore.getState();
    if (currentElement) {
      if (currentElement.isNew) {
        return `${currentElement.type}/new`;
      }
      else {
        return `${currentElement.type}/${currentElement.id}`;
      }
    }
    else {
      return '';
    }
  }

  // For Repository
  publicRoots(roots, preservePublic) {
    let newRoots =[]
    roots.forEach((root) => {
      if(preservePublic) {
        if (root.is_public) newRoots.push(root)
      } else {
        if (!root.is_public) newRoots.push(root)
      }
    })

    return newRoots
  }


  // For Repository
  publicSubtrees() {
    let {syncInRoots, syncChemotionVisible} = this.state
    syncInRoots = this.removeOrphanRoots(syncInRoots)
    syncInRoots = this.publicRoots(syncInRoots, true)

    let orderedRoots = []
    if (syncInRoots && syncInRoots[0] && syncInRoots[0].children) {
      syncInRoots[0].children.map((e,idx) => {
        if (e.label.match(/hemotion/) ) {
          orderedRoots[0] = e;
          orderedRoots[0].label = 'Chemotion';
        } else if (typeof e.label === 'string' && e.label === 'Scheme-only reactions') {
          orderedRoots[1] = e;
        } else if (e.label.match(/Published Elements/)) {
          orderedRoots[2] = e
          orderedRoots[2].label = 'My Published Elements'
        } else if (e.label === 'Pending Publications') {orderedRoots[3] = e  }
        else if (typeof e.label === 'string' && e.label.startsWith('Reviewing')) {orderedRoots[4] = e  }
        else if (typeof e.label === 'string' && e.label.startsWith('Element To Review')) {orderedRoots[5] = e  }
        else if (typeof e.label === 'string' && e.label.startsWith('Reviewed')) { orderedRoots[6] = e }
        else if (typeof e.label === 'string' && e.label === 'Embargo Accepted') { orderedRoots[7] = e }
        else if (e.label === 'Embargoed Publications') {orderedRoots[8] = e  }
        else {orderedRoots[idx+10] = e  }
      })
    }

    let subTreeLabels = (
      <div className="tree-view">
        <div className={"title title-public " } style={{backgroundColor:'white'}}
        >
        </div>
      </div>
    )

    return this.subtrees(orderedRoots, subTreeLabels,
                         true, syncChemotionVisible)
  }

  render() {
    const { ownCollectionVisible } = this.state;

    const ownCollectionDisplay = ownCollectionVisible ? '' : 'none';

    return (
      <div>
        <div className="tree-view">
        <div className="tree-wrapper">
            {this.publicSubtrees()}
          </div>

          <OverlayTrigger placement="top" delayShow={1000} overlay={colVisibleTooltip}>
            <div
              className="title"
              style={{ backgroundColor: 'white' }}
              onClick={() => this.handleSectionToggle('ownCollectionVisible')}
            >
              <i className="fa fa-list" /> &nbsp;&nbsp; My Collections
            </div>
          </OverlayTrigger>
        </div>
        <div className="tree-wrapper" style={{ display: ownCollectionDisplay }}>
          {this.lockedSubtrees()}
          {/* {this.unsharedSubtrees()} */}
        </div>
        {/* <div className="tree-wrapper">
          {this.sharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSyncInSubtrees()}
        </div> */}
      </div>
    );
  }
}
