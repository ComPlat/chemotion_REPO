import React from 'react';
import PropTypes from 'prop-types';
import Aviator from 'aviator';
import { Glyphicon, OverlayTrigger, Tooltip } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import UserInfos from 'src/apps/mydb/collections/UserInfos';
import GatePushBtn from 'src/components/common/GatePushBtn';
import { collectionShow, scollectionShow } from 'src/utilities/routesUtils';
import { CollectionDesc } from 'src/repoHome/RepoCommon';

const labeling = (label) => {
  if (typeof (label) === 'string' && (label.startsWith('Reviewing') || label.startsWith('Element To Review') || label.startsWith('Reviewed'))) {
    const ls = label.split(',');
    if (ls.length >= 3) {
      const sicon = ls[1].substr(1) === '0' ? '' : <i className="icon-sample"> {ls[1].substr(1)} &nbsp; </i>;
      const ricon = ls[2].substr(1) === '0' ? '' : <i className="icon-reaction"> {ls[2].substr(1)} &nbsp;  </i>;
      return label.startsWith('Reviewing') ?
        (
          <div style={{ display: 'inline', color: 'red' }}>
            {ls[0]} &nbsp; {sicon} {ricon}
          </div>
        ) :
        (
          <div style={{ display: 'inline' }}>
            {ls[0]} &nbsp; {sicon} {ricon}
          </div>
        );
    }
  }
  return label;
}

export default class CollectionSubtree extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isRemote: props.isRemote,
      currentCollection: props.currentCollection,
      label: props.root.label,
      inventoryPrefix: props.root.inventory_prefix,
      selected: false,
      root: props.root,
      visible: false
    }

    this.onChange = this.onChange.bind(this)
    this.toggleExpansion = this.toggleExpansion.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }


  componentDidMount() {
    UIStore.listen(this.onChange);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      root: nextProps.root,
      label: nextProps.root.label,
      inventoryPrefix: nextProps.root.inventory_prefix
    });
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange);
  }

  onChange(state) {
    if (state.currentCollection) {
      const visible = this.isVisible(this.state.root, state)
      const { root } = this.state;

      const selectedCol = (
        state.currentCollection.id == root.id &&
        state.currentCollection.is_synchronized == root.is_synchronized
      ) || (
          state.currentCollection.id == root.id &&
          state.currentCollection.isRemote == root.isRemote
        )

      if (selectedCol) {
        this.setState({
          selected: true,
          currentCollection: state.currentCollection,
          visible
        });
      } else {
        this.setState({
          selected: false,
          currentCollection: state.currentCollection,
          visible
        });
      }
    }
  }

  isVisible(node, uiState) {
    if (node.descendant_ids && uiState.currentCollection?.id) {
      let currentCollectionId = parseInt(uiState.currentCollection.id)
      if (node.descendant_ids.indexOf(currentCollectionId) > -1) return true
    }

    let { visibleRootsIds } = CollectionStore.getState();
    return (visibleRootsIds.indexOf(node.id) > -1)
  }

  selectedCssClass(currentCollection) {
    const { root } = this.state;
    if (this.state.selected || (currentCollection && currentCollection.id == root.id && currentCollection.is_synchronized == root.is_synchronized)) {
      return 'selected';
    }
    return '';
  }

  children() {
    return this.state.root.children || [];
  }

  hasChildren() {
    return this.children().length > 0;
  }

  subtrees() {
    const children = this.children();

    if (this.hasChildren()) {
      return children.map((child, index) => {
        return (
          <li key={index}>
            <CollectionSubtree root={child} isRemote={this.state.isRemote} />
          </li>
        );
      });
    }
    return null;
  }

  expandButton() {
    let icon = this.state.visible ? 'minus' : 'plus';

    if (this.hasChildren()) {
      return (
        <Glyphicon
          glyph={icon}
          style={{ float: 'right', marginLeft: '5px' }}
          onClick={this.toggleExpansion}
        />
      );
    }
    return (<div />);
  }

  takeOwnershipButton() {
    const { root } = this.state;
    const { isRemote } = this.state;
    const isTakeOwnershipAllowed = this.state.root.permission_level === 5;
    const isSync = !!((root.sharer && root.user && root.user.type !== 'Group'));
    if ((isRemote || isSync) && isTakeOwnershipAllowed) {
      return (
        <div className="take-ownership-btn">
          <i className="fa fa-exchange" onClick={e => this.handleTakeOwnership(e)} />
        </div>
      )
    }
    return (<div />);
  }

  handleTakeOwnership() {
    const isSync = !!this.state.root.sharer;
    CollectionActions.takeOwnership({ id: this.state.root.id, isSync });
  }

  handleClick(e) {
    const { root } = this.state
    let {visible} = this.state
    const uiState = UIStore.getState()

    visible = visible || this.isVisible(root, uiState);
    this.setState({ visible });
    let collectionID = 'all';
    if (root.label === 'All' && root.is_locked) {
      Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`, { silent: true });
      collectionShow({ params: { collectionID } });
      return;
    }
    const url = (this.props.root.sharer)
      ? `/scollection/${root.id}/${this.urlForCurrentElement()}`
      : `/collection/${root.id}/${this.urlForCurrentElement()}`;
    Aviator.navigate(url, { silent: true });
    collectionID = this.state.root.id;
    const collShow = this.props.root.sharer ? scollectionShow : collectionShow;
    collShow({ params: { collectionID } });
  }

  urlForCurrentElement() {
    const { currentElement } = ElementStore.getState();
    if (currentElement) {
      if (currentElement.isNew) {
        return `${currentElement.type}/new`;
      }
      return `${currentElement.type}/${currentElement.id}`;
    }
    return '';
  }

  toggleExpansion(e) {
    e.stopPropagation()
    let { visible, root } = this.state
    visible = !visible
    this.setState({ visible: visible })

    let { visibleRootsIds } = CollectionStore.getState()
    if (visible) {
      visibleRootsIds.push(root.id)
    } else {
      let descendantIds = root.descendant_ids
        ? root.descendant_ids
        : root.children.map(function (s) { return s.id })
      descendantIds.push(root.id)
      visibleRootsIds = visibleRootsIds.filter(x => descendantIds.indexOf(x) == -1)
    }

    // Remove duplicate
    let newIds = Array.from(new Set(visibleRootsIds))
    CollectionActions.updateCollectrionTree(newIds)
  }

  synchronizedIcon() {
    let sharedUsers = this.state.root.sync_collections_users
    return (
      sharedUsers && sharedUsers.length > 0
        ? <OverlayTrigger placement="bottom" overlay={UserInfos({ users: sharedUsers })}>
          <i className="fa fa-share-alt" style={{ float: "right" }}></i>
        </OverlayTrigger>
        : null
    )
  }


  render() {
    const { root, visible, currentCollection } = this.state
    let { label } = this.state

    label = labeling(label);

    let style;
    if (!visible) {
      style = {
        display: 'none',
        marginBottom: 0
      };
    }
    const gated = root && root.is_locked && label == 'chemotion-repository.net' ?
      <GatePushBtn collection_id={root.id} /> : null;
    return (
      <div className="tree-view" key={root.id}>
        {this.takeOwnershipButton()}

        <div id={`tree-id-${root.label}`} className={"title " + this.selectedCssClass(currentCollection)}
          onClick={this.handleClick}>
          {this.expandButton()}
          {this.synchronizedIcon()}
          {gated}
          {label}
          <CollectionDesc label={root.label} />
        </div>
        <ul style={style}>
          {this.subtrees()}
        </ul>
      </div>
    )
  }
}

CollectionSubtree.propTypes = {
  isRemote: PropTypes.bool,
  root: PropTypes.object
};
