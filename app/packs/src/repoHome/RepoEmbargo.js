import React, { Component } from 'react';
import {
  Table,
  Col,
  Row,
  Navbar,
  ButtonGroup,
  Button,
  ButtonToolbar,
  Modal,
  Panel,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import uuid from 'uuid';
import Select from 'react-select';
import { filter } from 'lodash';
import RepoEmbargoDetails from 'src/repoHome/RepoEmbargoDetails';
import EmbargoActions from 'src/stores/alt/repo/actions/EmbargoActions';
import EmbargoStore from 'src/stores/alt/repo/stores/EmbargoStore';
import { ElAspect } from 'src/repoHome/RepoCommon';
import { ConfirmModal } from 'src/components/common/ConfirmModal';
import { MetadataModal, InfoModal } from 'src/repoHome/RepoEmbargoModal';
import RepoReviewAuthorsModal from 'src/components/chemrepo/common/RepoReviewAuthorsModal';
import EmbargoCommentsModal from 'src/components/chemrepo/common/EmbargoCommentsModal';
import EmbargoFetcher from 'src/repo/fetchers/EmbargoFetcher';
import RepoEmbargoOverview from 'src/repoHome/RepoEmbargoOverview';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';

const btnMessage = (_msg, _btn) => (
  <OverlayTrigger
    placement="top"
    overlay={<Tooltip id={uuid.v4()}>{_msg}</Tooltip>}
  >
    {_btn}
  </OverlayTrigger>
);

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
      showCommentsModal: false,
      showAuthorModal: false,
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
    this.handleAuthorShow = this.handleAuthorShow.bind(this);
    this.handleAuthorClose = this.handleAuthorClose.bind(this);
    this.handleMetadataShow = this.handleMetadataShow.bind(this);
    this.handleMetadataClose = this.handleMetadataClose.bind(this);
    this.handleEmbargoChange = this.handleEmbargoChange.bind(this);
    this.handleCommentsShow = this.handleCommentsShow.bind(this);
    this.handleCommentsClose = this.handleCommentsClose.bind(this);
    this.handleCommentsSave = this.handleCommentsSave.bind(this);
    this.handleOverview = this.handleOverview.bind(this);
  }

  componentDidMount() {
    EmbargoStore.listen(this.onChange);
    EmbargoActions.fetchEmbargoBundle();
  }

  componentWillUnmount() {
    EmbargoStore.unlisten(this.onChange);
  }

  onChange(state) {
    let { selectEmbargo, elements, current_user, currentElement, bundles } = this.state;
    if (state.selectEmbargo && state.selectEmbargo?.id !== this.state.selectEmbargo?.id) {
      ({ selectEmbargo } = state);
    }
    if (state.elements) { ({ elements } = state); }
    if (state.current_user) { ({ current_user } = state); }
    if (!state.currentElement && !this.state.currentElement) {
      currentElement = null;
    } else {
      ({ currentElement } = state);
    }
    if (state.bundles) { ({ bundles } = state); }
    if ((selectEmbargo?.id !== this.state.selectEmbargo?.id)
      || (JSON.stringify(elements) !== JSON.stringify(this.state.elements))
      || (current_user?.id !== this.state.current_user?.id)
      || (currentElement !== this.state.currentElement)
      || (bundles !== this.state.bundles)) {
      const validSelect = bundles?.find(b => b.element_id === selectEmbargo?.element_id);
      if (typeof (validSelect) === 'undefined') {
        this.setState(prevState => ({ ...prevState, selectEmbargo: null, elements, current_user, currentElement, bundles }));
      } else {
        EmbargoFetcher.refreshEmbargo(selectEmbargo || {})
          .then((result) => {
            if (!result.error) this.setState(prevState => ({ ...prevState, selectEmbargo: result, elements, current_user, currentElement, bundles }), EmbargoActions.getEmbargoElements(selectEmbargo.element_id));
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
    this.setState({ showMoveModal: true, moveElement: element });
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

  handleCommentsShow() {
    this.setState({ showCommentsModal: true });
  }

  handleCommentsClose() {
    this.setState({ showCommentsModal: false });
  }

  handleOverview() {
    this.setState({ selectEmbargo: null, elements: [], selectEmbargoId: null });
  }

  handleCommentsSave(comment) {
    const { selectEmbargo, bundles } = this.state;

    RepositoryFetcher.repoReviewPublish(selectEmbargo?.element_id, 'collection', comment, 'Comments', {}, null)
      .then(result => {
        if (result.review && selectEmbargo) {
          selectEmbargo.review = result.review;
          const index = bundles.findIndex(b => b.element_id === selectEmbargo.element_id);
          if (index !== -1) bundles[index] = selectEmbargo;
        }
        this.setState({ showCommentsModal: false, selectEmbargo, bundles });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleAuthorShow() {
    this.setState({ showAuthorModal: true });
  }

  handleAuthorClose() {
    this.setState({ showAuthorModal: false });
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
    if (eventKey) {
      const { bundles } = this.state;
      const selectEmbargo = bundles.find(b => b.element_id === eventKey.value);
      this.setState({ selectEmbargo }, EmbargoActions.getEmbargoElements(eventKey.value));
    }
  }

  handleEmbargoAccount() {
    const { selectEmbargo, current_user } = this.state;

    if (selectEmbargo === null) {
      alert('Please select an embargo first!');
    } else if (current_user.id !== selectEmbargo.published_by) {
      alert('only the submitter can generate a temporary account!');
    } else {
      EmbargoActions.generateEmbargoAccount(selectEmbargo.element_id);
      alert(`A temporary account for [${selectEmbargo.taggable_data && selectEmbargo.taggable_data.label}] has been created. The details have been sent to you by e-mail.`);
    }
  }

  handleEmbargoRelease() {
    const { selectEmbargo, current_user } = this.state;
    const isSubmitter =
      current_user?.id === selectEmbargo?.published_by ||
      (selectEmbargo?.review?.submitters || []).includes(current_user?.id);
    if (selectEmbargo === null) {
      alert('Please select an embargo first!');
    } else if (!isSubmitter) {
      alert('only the submitter can perform the release!');
    } else {
      EmbargoActions.releaseEmbargo(selectEmbargo.element_id);
      alert(`The submission for the release of the embargo [${selectEmbargo.taggable_data && selectEmbargo.taggable_data.label}] has been completed!`);
    }
  }

  handleEmbargoDelete(shouldPerform) {
    if (shouldPerform) {
      const { selectEmbargo, current_user } = this.state;
      const isSubmitter =
      current_user?.id === selectEmbargo?.published_by ||
      (selectEmbargo?.review?.submitters || []).includes(current_user?.id);

      if (selectEmbargo === null) {
        alert('Please select an embargo first!');
      } else if (!isSubmitter) {
        alert('only the submitter can delete the release!');
      } else {
        EmbargoActions.deleteEmbargo(selectEmbargo.element_id);
      }
    }
    this.setState({ showConfirmModal: false });
  }

  handleMoveEmbargo() {
    const { selectEmbargo, moveElement, newEmbargo } = this.state;
    EmbargoActions.moveEmbargo(selectEmbargo.element_id, newEmbargo, moveElement);
    this.setState({ showMoveModal: false });
  }

  rendeActionBtn(bundles) {
    const { selectEmbargo, elements, current_user } = this.state;
    const acceptedEl = ((typeof (elements) !== 'undefined' && elements) || []).filter(e => e.state === 'accepted');
    const is_submitter = current_user?.id === selectEmbargo?.published_by || (selectEmbargo?.review?.submitters || []).includes(current_user?.id);
    const actionButtons = (!selectEmbargo || !current_user || (current_user?.is_reviewer == false && !is_submitter)) ? <span /> :
      (
        <span>
          <ButtonToolbar>
            <ButtonGroup>
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
            </ButtonGroup>
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

  renderSearch(bundles) {
    const { selectEmbargo, elements, current_user } = this.state;
    const acceptedEl = ((typeof (elements) !== 'undefined' && elements) || []).filter(e => e.state === 'accepted');
    const options = [];
    const hasComment = selectEmbargo?.review?.history?.length > 0;
    bundles?.forEach((col) => {
      if (current_user.is_reviewer || current_user.is_submitter || col.published_by === current_user.id ||
        (col.review?.submitters || []).includes(current_user.id) || current_user.type === 'anonymous') {
        const tag = col.taggable_data || {};
        options.push({ value: col.element_id, name: tag.label, label: tag.label });
      }
    });

    const filterDropdown = (
      <div className="home-embargo-search">
        <Select
          value={selectEmbargo && selectEmbargo.element_id}
          onChange={e => this.handleElementSelection(e)}
          options={options}
          style={{ width: '148px' }}
          clearable={false}
        />
        <ButtonGroup>
          {btnMessage('Show all embargos', <Button
            id="overview-button"
            disabled={selectEmbargo === null}
            onClick={() => this.handleOverview()}
          >
            <i className="fa fa-list-ul" aria-hidden="true" />
          </Button>
          )}
          {btnMessage('Comments', <Button
            id="comment-button"
            disabled={selectEmbargo === null || elements?.length === 0}
            bsStyle={hasComment ? 'success' : 'default'}
            onClick={() => this.handleCommentsShow()}
          >
            <i className="fa fa-comments" aria-hidden="true" />
          </Button>
          )}
          {btnMessage('Metadata', <Button
            id="metadata-info-button"
            disabled={selectEmbargo === null || elements?.length === 0}
            onClick={() => this.handleMetadataShow()}
          >
            <i className="fa fa-file-code-o" aria-hidden="true" />
          </Button>
          )}
          {btnMessage('Info. and DOIs', <Button
            id="all-info-button"
            disabled={selectEmbargo === null || elements?.length === 0}
            onClick={() => this.handleInfoShow()}
          >
            <i className="fa fa-users" aria-hidden="true" />
          </Button>
          )}
          <RepoReviewAuthorsModal
            element={selectEmbargo}
            isEmbargo
            disabled={selectEmbargo === null || elements?.length === 0}
            schemeOnly={false}
            title=''
            taggData={selectEmbargo?.taggable_data}
          />
        </ButtonGroup>
      </div>
    );

    return (
      <div style={{ paddingLeft: '1px', marginTop: '5px', marginBottom: '5px' }}>
        {filterDropdown}
      </div>
    );
  }

  renderMoveModal() {
    const { showMoveModal, selectEmbargo, moveElement, bundles } = this.state;
    const options = [
      { value: '0', name: 'new', label: '--Create a new Embargo Bundle--' },
    ];

    bundles?.forEach((col) => {
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
      elements, bundles, currentElement, current_user, showConfirmModal, showInfoModal, showCommentsModal, selectEmbargo, showMetadataModal
    } = this.state;
    const id = (selectEmbargo && selectEmbargo.element_id) || 0;
    const la = selectEmbargo && selectEmbargo.taggable_data && selectEmbargo.taggable_data.label;
    const metadata = (selectEmbargo && selectEmbargo.metadata_xml) || '';
    const isOwner =
      selectEmbargo?.published_by === current_user.id ||
      (selectEmbargo?.review?.submitters || []).includes(current_user?.id) ||
      false;

    if (selectEmbargo === null && bundles?.length > 0) {
      return (
        <Col sm={12} md={12}>
          <Navbar fluid className="navbar-custom" style={{ marginBottom: '5px' }}>
            {this.renderSearch(bundles)}
            <div style={{ clear: 'both' }} />
          </Navbar>
          <RepoEmbargoOverview collections={bundles} currentUser={current_user} />
        </Col>
      );
    }

    return (
      <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
        <Col md={currentElement ? 4 : 12} >
          <Navbar fluid className="navbar-custom" style={{ marginBottom: '5px' }}>
            {this.renderSearch(bundles)}
            <div style={{ clear: 'both' }} />
          </Navbar>
          <div>
            <div className="embargo-list" style={{ backgroundColor: '#f5f5f5' }} >
              <Table striped className="review-entries">
                <tbody striped="true" bordered="true" hover="true">
                  {((typeof (elements) !== 'undefined' && elements) || []).map(r => ElAspect(r, EmbargoActions.displayReviewEmbargo, current_user, isOwner, currentElement, this.handleMoveShow)) }
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
        <Col className="review-element" md={currentElement ? 8 : 0}>
          <RepoEmbargoDetails currentElement={currentElement} />
          {this.renderMoveModal()}

          <InfoModal
            showModal={showInfoModal}
            selectEmbargo={selectEmbargo}
            onCloseFn={this.handleInfoClose}
          />
          <EmbargoCommentsModal
            showModal={showCommentsModal}
            selectEmbargo={selectEmbargo}
            onCloseFn={this.handleCommentsClose}
            onSaveFn={this.handleCommentsSave}
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
