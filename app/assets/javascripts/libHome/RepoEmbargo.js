import React, { Component } from 'react';
import { Table, Col, Row, Navbar, DropdownButton, MenuItem, ButtonGroup, Button, ButtonToolbar, Modal, Panel } from 'react-bootstrap';
import Select from 'react-select';
import { findIndex, filter } from 'lodash';
import RepoEmbargoDetails from './RepoEmbargoDetails';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import { ElAspect } from './RepoCommon';
import { ConfirmModal } from '../components/common/ConfirmModal';

const renderMenuItems = (bundles) => {
  if (bundles.length < 1) return <div />;
  const menu = bundles.map(bundle => (
    <MenuItem key={bundle.value} eventKey={bundle.value}>
      {bundle.label}
    </MenuItem>
  ));
  return menu;
};

export default class RepoEmbargo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      current_user: {},
      currentElement: null,
      moveElement: {},
      newEmbargo: null,
      selectEmbargo: null,
      bundles: [],
      showConfirmModal: false,
      showMoveModal: false,
    };
    this.onChange = this.onChange.bind(this);
    this.handleElementSelection = this.handleElementSelection.bind(this);
    this.handleEmbargoAccount = this.handleEmbargoAccount.bind(this);
    this.handleEmbargoRelease = this.handleEmbargoRelease.bind(this);
    this.handleEmbargoDelete = this.handleEmbargoDelete.bind(this);
    this.handleMoveEmbargo = this.handleMoveEmbargo.bind(this);
    this.handleMoveShow = this.handleMoveShow.bind(this);
    this.handleMoveClose = this.handleMoveClose.bind(this);
    this.loadBundles = this.loadBundles.bind(this);
    this.handleEmbargoChange = this.handleEmbargoChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
    this.loadBundles();
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
    if (this.state.selectEmbargo !== null) {
      const vaildSelect = state.bundles.find(b => b.value === this.state.selectEmbargo.value);
      if (typeof (vaildSelect) === 'undefined') {
        this.setState({ selectEmbargo: null });
      }
    }
  }

  onClickDelete() {
    this.setState({ showConfirmModal: true });
  }


  handleMoveShow(element) {
    this.setState({
      showMoveModal: true,
      moveElement: element
    });
  }

  handleMoveClose() {
    this.setState({ showMoveModal: false, moveElement: {} });
  }

  handleEmbargoChange(selectedValue) {
    if (selectedValue) {
      this.setState({ newEmbargo: selectedValue });
    }
  }

  handleElementSelection(eventKey, event) {
    const { bundles } = this.state;
    const selectEmbargo = bundles.find(b => b.value === eventKey);
    this.setState({ selectEmbargo });
    PublicActions.getEmbargoElements(eventKey);
  }

  handleEmbargoAccount() {
    const { selectEmbargo } = this.state;

    if (selectEmbargo === null) {
      alert('Please select an embargo first!');
    } else {
      PublicActions.generateEmbargoAccount(selectEmbargo.value);
      alert(`A temporary account for [${selectEmbargo.label}] has been created. The details have been sent to you by e-mail.`);
    }
  }

  handleEmbargoRelease() {
    const { selectEmbargo } = this.state;

    if (selectEmbargo === null) {
      alert('Please select an embargo first!');
    } else {
      PublicActions.releaseEmbargo(selectEmbargo.value);
      alert(`The embargo on [${selectEmbargo.label}] has been released!`);
    }
  }

  handleEmbargoDelete(shouldPerform) {
    if (shouldPerform) {
      const { selectEmbargo } = this.state;
      if (selectEmbargo === null) {
        alert('Please select an embargo first!');
      } else {
        PublicActions.deleteEmbargo(selectEmbargo.value);
      }
    }
    this.setState({ showConfirmModal: false });
  }

  handleMoveEmbargo() {
    const { selectEmbargo, moveElement, newEmbargo } = this.state;
    PublicActions.moveEmbargo(selectEmbargo.value, newEmbargo, moveElement);
    this.setState({ showMoveModal: false });
  }

  loadBundles() {
    PublicActions.fetchEmbargoBundle();
  }

  renderSearch(bundles) {
    const { selectEmbargo, elements, current_user } = this.state;
    const acceptedEl = ((typeof (elements) !== 'undefined' && elements) || []).filter(e => e.state === 'accepted');
    const customClass = '.btn-unified';
    const actionButtons = current_user.type === 'Anonymous' ? <span /> :
      (
        <span>
          <Button
            bsStyle="primary"
            id="all-inner-button"
            disabled={selectEmbargo === null || elements.length === 0}
            onClick={() => this.handleEmbargoAccount()}
          >
            <i className="fa fa-envelope-o" aria-hidden="true" />&nbsp;Anonymous
          </Button>
          <Button
            bsStyle="primary"
            id="all-inner-button"
            disabled={selectEmbargo === null || acceptedEl.length === 0 || acceptedEl.length !== elements.length}
            onClick={() => this.handleEmbargoRelease()}
          >
            <i className="fa fa-telegram" aria-hidden="true" />&nbsp;Release
          </Button>
          <Button
            bsStyle="danger"
            id="all-inner-button"
            disabled={selectEmbargo === null || elements.length !== 0}
            onClick={() => this.onClickDelete()}
          >
            <i className="fa fa-trash-o" aria-hidden="true" />&nbsp;Delete
          </Button>
        </span>
      );
    const filterDropdown = (
      <ButtonGroup>
        <DropdownButton
          className={customClass}
          id="embargo-inner-dropdown"
          title={selectEmbargo === null ? 'Embargo Bundle' : selectEmbargo.label}
          style={{ width: '180px' }}
          onSelect={this.handleElementSelection}
        >
          {renderMenuItems(bundles)}
        </DropdownButton>
        {actionButtons}
      </ButtonGroup>
    );

    return (
      <div style={{ paddingLeft: '15px', marginTop: '8px', marginBottom: '8px' }}>
        {filterDropdown}
      </div>
    );
  }


  // render modal
  renderMoveModal() {
    const { showMoveModal, selectEmbargo, moveElement, bundles } = this.state;
    const defaultBundles = [
      { value: '0', name: 'new', label: '--Create a new Embargo Bundle--' },
    ];
    const allBundles = defaultBundles.concat(filter(bundles, b => b.name !== (selectEmbargo == null ? '' : selectEmbargo.name)));

    return (
      <Modal
        show={showMoveModal}
        dialogClassName="move-embargo-dialog"
        onHide={this.handleMoveClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>{moveElement.type}: [{moveElement.title}]</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            <Panel bsStyle="success">
              <Panel.Heading>
                <Panel.Title>
                  Move {moveElement.type} [{moveElement.title}] from Embargo Bundle [{selectEmbargo && selectEmbargo.label}] to :
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <div>
                  <Select
                    value={this.state.newEmbargo}
                    onChange={e => this.handleEmbargoChange(e)}
                    options={allBundles}
                    className="select-assign-collection"
                  />
                  <br />
                  <ButtonToolbar>
                    <Button bsStyle="primary" onClick={() => this.handleMoveEmbargo()}>Move Embargoed Bundle</Button>
                  </ButtonToolbar>
                </div>
              </Panel.Body>
            </Panel>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    const {
      elements, bundles, currentElement, currentUser, showConfirmModal
    } = this.state;
    return (
      <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
        <Col md={currentElement ? 4 : 12} >
          <Navbar fluid className="navbar-custom" style={{ marginBottom: '5px' }}>
            {this.renderSearch(bundles)}
            <div style={{ clear: 'both' }} />
          </Navbar>
          <div>
            <div className="review-list" style={{ backgroundColor: '#f5f5f5' }} >
              <Table striped className="review-entries">
                <tbody striped="true" bordered="true" hover="true">
                  {((typeof (elements) !== 'undefined' && elements) || []).map(r => ElAspect(r, PublicActions.displayReviewEmbargo, currentUser, currentElement, this.handleMoveShow)) }
                </tbody>
              </Table>
            </div>
          </div>
          <ConfirmModal
            showModal={showConfirmModal}
            title="Warning"
            content="Are you sure that you want to delete this ?"
            onClick={this.handleEmbargoDelete}
          />
        </Col>
        <Col
          className="review-element"
          md={currentElement ? 8 : 0}
        >
          <RepoEmbargoDetails />
          { this.renderMoveModal() }
        </Col>
      </Row>
    );
  }
}
