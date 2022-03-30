import React, { Component } from 'react';
import { Table, Col, Row, Navbar, DropdownButton, MenuItem, Label, ButtonGroup, Button, ButtonToolbar, Modal, Panel, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Select from 'react-select';
import { findIndex, filter } from 'lodash';
import RepoEmbargoDetails from './RepoEmbargoDetails';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import { ElAspect } from './RepoCommon';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { MetadataModal, InfoModal } from './RepoEmbargoModal';
import RepositoryFetcher from '../components/fetchers/RepositoryFetcher';
import { label } from 'react-dom-factories';

const renderMenuItems = (bundles) => {
  if (bundles.length < 1) return <div />;
  const menu = bundles.map(bundle => (
    <MenuItem key={bundle.element_id} eventKey={bundle.element_id}>
      {bundle.taggable_data && bundle.taggable_data.label}
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
      showInfoModal: false,
      showMetadataModal: false,
    };
    this.onChange = this.onChange.bind(this);
    this.handleElementSelection = this.handleElementSelection.bind(this);
    this.handleEmbargoAccount = this.handleEmbargoAccount.bind(this);
    this.handleEmbargoRelease = this.handleEmbargoRelease.bind(this);
    this.handleEmbargoDelete = this.handleEmbargoDelete.bind(this);
    this.handleMoveEmbargo = this.handleMoveEmbargo.bind(this);
    this.handleMoveShow = this.handleMoveShow.bind(this);
    this.handleMoveClose = this.handleMoveClose.bind(this);
    this.handleInfoShow = this.handleInfoShow.bind(this);
    this.handleInfoClose = this.handleInfoClose.bind(this);
    this.handleMetadataShow = this.handleMetadataShow.bind(this);
    this.handleMetadataClose = this.handleMetadataClose.bind(this);
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
      const vaildSelect = state.bundles.find(b => b.element_id === this.state.selectEmbargo.element_id);
      if (typeof (vaildSelect) === 'undefined') {
        this.setState({ selectEmbargo: null });
      } else {
        RepositoryFetcher.refreshEmbargo(this.state.selectEmbargo || {})
          .then((result) => {
            if (!result.error) this.setState({ selectEmbargo: result });
          }).catch((errorMessage) => {
            console.log(errorMessage);
          });
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

  handleInfoShow() {
    this.setState({ showInfoModal: true });
  }

  handleInfoClose() {
    this.setState({ showInfoModal: false });
  }

  handleMetadataShow() {
    this.setState({ showMetadataModal: true });
  }

  handleMetadataClose() {
    this.setState({ showMetadataModal: false });
  }

  handleEmbargoChange(selectedValue) {
    if (selectedValue) {
      this.setState({ newEmbargo: selectedValue });
    }
  }

  handleElementSelection(eventKey, event) {
    const { bundles } = this.state;
    const selectEmbargo = bundles.find(b => b.element_id === eventKey.value);
    this.setState({ selectEmbargo });
    PublicActions.getEmbargoElements(eventKey.value);
  }

  handleEmbargoAccount() {
    const { selectEmbargo, current_user } = this.state;

    if (selectEmbargo === null) {
      alert('Please select an embargo first!');
    } else if (current_user.id !== selectEmbargo.published_by) {
      alert('only the submitter can generate a temporary account!');
    } else {
      PublicActions.generateEmbargoAccount(selectEmbargo.element_id);
      alert(`A temporary account for [${selectEmbargo.taggable_data && selectEmbargo.taggable_data.label}] has been created. The details have been sent to you by e-mail.`);
    }
  }

  handleEmbargoRelease() {
    const { selectEmbargo, current_user } = this.state;
    if (selectEmbargo === null) {
      alert('Please select an embargo first!');
    } else if (current_user.id !== selectEmbargo.published_by) {
      alert('only the submitter can perform the release!');
    } else {
      PublicActions.releaseEmbargo(selectEmbargo.element_id);
      alert(`The embargo on [${selectEmbargo.taggable_data && selectEmbargo.taggable_data.label}] has been released!`);
    }
  }

  handleEmbargoDelete(shouldPerform) {
    if (shouldPerform) {
      const { selectEmbargo, current_user } = this.state;
      if (selectEmbargo === null) {
        alert('Please select an embargo first!');
      } else if (current_user.id !== selectEmbargo.published_by) {
        alert('only the submitter can delete the release!');
      } else {
        PublicActions.deleteEmbargo(selectEmbargo.element_id);
      }
    }
    this.setState({ showConfirmModal: false });
  }

  handleMoveEmbargo() {
    const { selectEmbargo, moveElement, newEmbargo } = this.state;
    PublicActions.moveEmbargo(selectEmbargo.element_id, newEmbargo, moveElement);
    this.setState({ showMoveModal: false });
  }

  loadBundles() {
    PublicActions.fetchEmbargoBundle();
  }

  renderSearch(bundles) {
    const { selectEmbargo, elements, current_user } = this.state;
    const acceptedEl = ((typeof (elements) !== 'undefined' && elements) || []).filter(e => e.state === 'accepted');
    const customClass = '.btn-unified';

    const options = [];

    bundles.forEach((col) => {
      const tag = col.taggable_data || {};
      options.push({ value: col.element_id, name: tag.label, label: tag.label });
    });

    const filterDropdown = (
      <div className="home-adv-search">
        <Select
          value={selectEmbargo && selectEmbargo.element_id}
          onChange={e => this.handleElementSelection(e)}
          options={options}
          style={{ width: '180px' }}
        />
      <ButtonGroup>
        <Button
          id="all-info-button"
          disabled={selectEmbargo === null || elements.length === 0}
          onClick={() => this.handleMetadataShow()}
        >
          <i className="fa fa-file-code-o" aria-hidden="true" />&nbsp;Metadata
        </Button>
        <Button
          id="all-info-button"
          disabled={selectEmbargo === null || elements.length === 0}
          onClick={() => this.handleInfoShow()}
        >
          <i className="fa fa-users" aria-hidden="true" />&nbsp;Info
        </Button>
      </ButtonGroup>
      </div>
    );

    return (
      <div style={{ paddingLeft: '15px', marginTop: '8px', marginBottom: '8px' }}>
        {filterDropdown}
      </div>
    );
  }

  rendeActionBtn(bundles) {
    const { selectEmbargo, elements, current_user } = this.state;
    const acceptedEl = ((typeof (elements) !== 'undefined' && elements) || []).filter(e => e.state === 'accepted');
    const customClass = '.btn-unified';

    const actionButtons = (!selectEmbargo || !current_user || (current_user.id !== selectEmbargo.published_by)) ? <span /> :
      (
        <span>
          <ButtonToolbar>
            <Button
              bsStyle="primary"
              id="all-inner-button"
              disabled={selectEmbargo === null || elements.length === 0}
              onClick={() => this.handleEmbargoAccount()}
            >
              <i className="fa fa-envelope-o" aria-hidden="true" />&nbsp;Anonymous
            </Button>
            <Button
              bsStyle="warning"
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
          </ButtonToolbar>
        </span>
      );
    const filterDropdown = (
      <ButtonGroup>
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
    const options = [
      { value: '0', name: 'new', label: '--Create a new Embargo Bundle--' },
    ];

    bundles.forEach((col) => {
      const tag = col.taggable_data || {};
      options.push({ value: col.element_id, name: tag.label, label: tag.label });
    });

    const allBundles = filter(options, b => b.value !== (selectEmbargo == null ? '' : selectEmbargo.element_id));

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
                  Move {moveElement.type} [{moveElement.title}] from Embargo Bundle [{selectEmbargo && selectEmbargo.taggable_data.label}] to :
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
      elements, bundles, currentElement, currentUser, showConfirmModal, showInfoModal, selectEmbargo, showMetadataModal
    } = this.state;
    const id = (selectEmbargo && selectEmbargo.element_id) || 0;
    const la =  selectEmbargo && selectEmbargo.taggable_data && selectEmbargo.taggable_data.label;
    const metadata = (selectEmbargo && selectEmbargo.metadata_xml) || '';
    const owner = (selectEmbargo && selectEmbargo.published_by) || 0;

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
                  {((typeof (elements) !== 'undefined' && elements) || []).map(r => ElAspect(r, PublicActions.displayReviewEmbargo, currentUser, owner, currentElement, this.handleMoveShow)) }
                </tbody>
              </Table>
            </div>
            {this.rendeActionBtn(bundles)}
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
          <InfoModal
            showModal={showInfoModal}
            selectEmbargo={selectEmbargo}
            onCloseFn={this.handleInfoClose}
          />
          <MetadataModal
            showModal={showMetadataModal}
            label={la}
            metadata={metadata}
            onCloseFn={this.handleMetadataClose}
            elementId={id}
            elementType="Collection"
          />
        </Col>
      </Row>
    );
  }
}
