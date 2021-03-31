import React from 'react';
import { Button, ButtonToolbar } from 'react-bootstrap';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';

export default class ModalExportCollection extends React.Component {
  constructor(props) {
    super(props);

    let collecState = CollectionStore.getState()

    let checkboxes = {}
    // this.gatherCheckboxes(collecState.unsharedRoots, checkboxes)
    // this.gatherCheckboxes(collecState.sharedRoots, checkboxes)
    // this.gatherCheckboxes(collecState.remoteRoots, checkboxes)
    collecState.lockedRoots = collecState.lockedRoots.filter(c => c.label !== 'All');

    let embargoRoots = [];
    // eslint-disable-next-line no-unused-expressions
    collecState.syncInRoots && collecState.syncInRoots.forEach((root) => {
      const cols = root.children.filter(c => c.label == 'My Published Elements' || c.label == 'Embargoed Publications');
      embargoRoots = embargoRoots.concat(cols);
    });

    collecState.syncInRoots = embargoRoots;
    this.gatherCheckboxes(collecState.lockedRoots, checkboxes);
    this.gatherCheckboxes(collecState.syncInRoots, checkboxes, true);

    this.state = {
      processing: false,
      // unsharedRoots: collecState.unsharedRoots,
      // sharedRoots: collecState.sharedRoots,
      // remoteRoots: collecState.remoteRoots,
      lockedRoots: collecState.lockedRoots,
      syncInRoots: collecState.syncInRoots,
      checkboxes: checkboxes
    }

    this.handleCheckAll = this.handleCheckAll.bind(this)
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }

  gatherCheckboxes(roots, checkboxes, isSync = false) {
    if (Array.isArray(roots) && roots.length > 0) {
      roots.map((root, index) => {
        const rootId = isSync === true ? `S_${root.id}` : root.id;
        checkboxes[rootId] = false;
        this.gatherCheckboxes(root.children, checkboxes)
      })
    }
  }

  hasChecked() {
    let checkboxes = this.state.checkboxes
    if (Object.keys(checkboxes).every(key => checkboxes[key] === false)) {
      // all checkboxes are unchecked
      return false
    } else {
      return true
    }
  }

  isChecked(id) {
    return this.state.checkboxes[id]
  }

  handleCheckAll() {
    const { checkboxes } = this.state;
    const hasChecked = this.hasChecked();

    Object.keys(checkboxes).forEach((key) => { checkboxes[key] = !hasChecked; });

    this.setState({ checkboxes });
  }

  handleCheckboxChange(e) {
    const { checkboxes } = this.state;
    checkboxes[e.target.value] = e.target.checked;
    this.setState({ checkboxes });
  }

  handleClick() {
    const { onHide, action } = this.props;
    this.setState({ processing: true });

    const collections = [];
    const sync_collections = [];
    Object.keys(this.state.checkboxes).map((key) => {
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(key) && this.state.checkboxes[key]) { collections.push(key); }
      if (isNaN(key) && key.startsWith('S_') && this.state.checkboxes[key]) { sync_collections.push(key.substr(2)); }
    });

    const params = {
      collections,
      sync_collections,
      isSync: false,
      format: 'zip',
      nested: false
    };

    action(params);

    setTimeout(() => {
      this.setState({ processing: false });
      onHide();
    }, 1000);
  }

  renderCheckAll() {
    return (
      <div>
        <input type="checkbox" id="export-collection-check-all"
          checked={this.hasChecked()} onChange={this.handleCheckAll} className="common-checkbox" />
        <label className="g-marginLeft--10" htmlFor="export-collection-check-all">
          {this.hasChecked() ? "Deselect all" : "Select all"}
        </label>
      </div>
    )
  }

  renderCollections(label, key) {
    let roots = this.state[key]

    if (Array.isArray(roots) && roots.length > 0) {
      return (
        <div>
          <h4>{label}</h4>
          {this.renderSubtrees(roots)}
        </div>
      )
    }
  }

  renderEmbargoCollections(label, key) {
    let roots = this.state[key];

    if (Array.isArray(roots) && roots.length > 0) {
      return (
        <div>
          <h4>{label}</h4>
          {this.renderUserSubtrees(roots, true)}
        </div>
      )
    }
  }

  renderSharedCollections(label, key) {
    let roots = this.state[key]

    if (Array.isArray(roots) && roots.length > 0) {
      return (
        <div>
          <h4>{label}</h4>
          {this.renderUserSubtrees(roots)}
        </div>
      )
    }
  }

  renderUserSubtrees(roots, isSync= false) {
    if (Array.isArray(roots) && roots.length > 0) {

      let nodes = roots.map((root, index) => {

        let label
        if (root.shared_by) {
          label = 'by ' + root.shared_by.initials
        } else if (root.shared_to) {
          label = 'with ' + root.shared_to.initials
        } else {
          label = root.label
        }

        return (
          <li key={index}>
            <h6>{label}</h6>
            {this.renderSubtrees(root.children, isSync)}
          </li>
        )
      })

      return (
        <ul className="list-unstyled">
          {nodes}
        </ul>
      )
    }
  }

  renderSubtrees(roots, isSync=false) {
    if (Array.isArray(roots) && roots.length > 0) {
      let nodes = roots.map((root, index) => {
        const rootId = isSync==true ? `S_${root.id}` : root.id;
        return (
          <li key={index}>
            <input className="common-checkbox" type="checkbox"
                   id={"export-collection-" + root.id}
                   value={rootId}
                   onChange={this.handleCheckboxChange}
                   checked={this.isChecked(rootId)} />
            <label className="g-marginLeft--10" htmlFor={"export-collection-" + root.id}>
              {root.label}
            </label>

            {this.renderSubtrees(root.children)}
          </li>
        )
      })

      return (
        <ul className="list-unstyled">
          {nodes}
        </ul>
      )
    }
  }

  renderButtonBar() {
    const { onHide } = this.props;
    const { processing } = this.state;
    const bStyle = processing === true ? 'danger' : 'warning';
    const bClass = processing === true ? 'fa fa-spinner fa-pulse fa-fw' : 'fa fa-file-text-o';
    const bTitle = processing === true ? 'Exporting' : 'Export ZIP';
    return (
      <ButtonToolbar>
        <div className="pull-right">
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={onHide}>Cancel</Button>
            <Button
              bsStyle={bStyle}
              id="md-export-dropdown"
              disabled={this.isDisabled()}
              title="Export as ZIP file (incl. attachments)"
              onClick={this.handleClick}
            >
              <span><i className={bClass} />&nbsp;{bTitle}</span>
            </Button>
          </ButtonToolbar>
        </div>
      </ButtonToolbar>
    );
  }

  isDisabled() {
    const { processing } = this.state;
    return processing === true;
  }

  render() {
    const onChange = (v) => this.setState(
      previousState => { return { ...previousState, value: v } }
    )
    const { full } = this.props;
    return (
      <div className="export-collections-modal">
        {this.renderCollections('Global collections', 'lockedRoots')}
        {this.renderEmbargoCollections('Embargo collections', 'syncInRoots')}
        {/* {this.renderCollections('My collections', 'unsharedRoots')} */}
        {/* {this.renderSharedCollections('My shared collections', 'sharedRoots')} */}
        {/* {this.renderSharedCollections('Shared with me', 'remoteRoots')} */}
        {this.renderCheckAll()}
        {this.renderButtonBar()}
      </div>
    )
  }
}
