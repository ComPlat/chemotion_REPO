import React, { Component } from 'react';
import {
  Table,
  Card,
  Col,
  Row,
  ButtonGroup,
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import Select from 'react-select';
import RepoEmbargoDetails from 'src/repo/repoHome/RepoEmbargoDetails';
import EmbargoActions from 'src/repo/actions/EmbargoActions';
import EmbargoStore from 'src/repo/stores/EmbargoStore';
import { ElAspect } from 'src/repo/repoHome/RepoCommon';
import ConfirmModal from 'src/components/common/ConfirmModal';
import { MetadataModal, InfoModal } from 'src/repo/repoHome/RepoEmbargoModal';
import RepoFundingModal from 'src/repo/chemrepo/common/RepoFundingModal';
import RepoReviewAuthorsModal from 'src/repo/chemrepo/common/RepoReviewAuthorsModal';
import EmbargoCommentsModal from 'src/repo/chemrepo/common/EmbargoCommentsModal';
import EmbargoBundleModal from 'src/repo/chemrepo/common/EmbargoBundleModal';
import EmbargoFetcher from 'src/repo/fetchers/EmbargoFetcher';
import RepoEmbargoOverview from 'src/repo/repoHome/RepoEmbargoOverview';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';

const tipBtn = (message, button) => (
  <OverlayTrigger placement="top" overlay={<Tooltip>{message}</Tooltip>}>
    {button}
  </OverlayTrigger>
);

const bundleLabel = (col) => col?.taggable_data?.label || `Embargo_${col?.element_id}`;

export default class RepoEmbargo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      current_user: {},
      currentElement: null,
      moveElement: {},
      selectEmbargo: null,
      bundles: [],
      showConfirmModal: false,
      showMoveModal: false,
      showInfoModal: false,
      showCommentsModal: false,
      showMetadataModal: false,
      filterContributor: null,
    };
    this.onChange = this.onChange.bind(this);
    this.handleContributorFilter = this.handleContributorFilter.bind(this);
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
    this.handleCommentsShow = this.handleCommentsShow.bind(this);
    this.handleCommentsClose = this.handleCommentsClose.bind(this);
    this.handleCommentsSave = this.handleCommentsSave.bind(this);
    this.handleOverview = this.handleOverview.bind(this);
  }

  componentDidMount() {
    EmbargoStore.listen(this.onChange);
    EmbargoActions.fetchEmbargoBundle();
    this.toggleOverviewClass();
  }

  componentDidUpdate(prevProps, prevState) {
    const wasOverview = prevState.selectEmbargo === null && prevState.bundles?.length > 0;
    const isOverview = this.state.selectEmbargo === null && this.state.bundles?.length > 0;
    if (wasOverview !== isOverview) this.toggleOverviewClass();
  }

  componentWillUnmount() {
    EmbargoStore.unlisten(this.onChange);
    const el = document.querySelector('.home-content-with-fixed-header');
    if (el) el.classList.remove('embargo-overview-mode');
  }

  onChange(state) {
    let { selectEmbargo, elements, current_user, currentElement, bundles } = this.state;
    if (state.selectEmbargo) ({ selectEmbargo } = state);
    if (state.elements) ({ elements } = state);
    if (state.current_user) ({ current_user } = state);
    currentElement = state.currentElement || (this.state.currentElement ? null : currentElement);
    if (state.bundles) ({ bundles } = state);

    const changed =
      selectEmbargo?.id !== this.state.selectEmbargo?.id
      || JSON.stringify(elements) !== JSON.stringify(this.state.elements)
      || current_user?.id !== this.state.current_user?.id
      || currentElement !== this.state.currentElement
      || bundles !== this.state.bundles;
    if (!changed) return;

    const match = bundles?.find(b => b.element_id === selectEmbargo?.element_id);
    if (!match) {
      this.setState({ selectEmbargo: null, elements, current_user, currentElement, bundles });
      return;
    }
    EmbargoFetcher.refreshEmbargo(selectEmbargo || {})
      .then((result) => {
        if (result.error) return;
        this.setState(
          { selectEmbargo: result, elements, current_user, currentElement, bundles },
          () => EmbargoActions.getEmbargoElements(selectEmbargo.element_id)
        );
      })
      .catch(err => console.log(err)); // eslint-disable-line no-console
  }

  toggleOverviewClass() {
    const isOverview = this.state.selectEmbargo === null && this.state.bundles?.length > 0;
    const el = document.querySelector('.home-content-with-fixed-header');
    if (el) el.classList.toggle('embargo-overview-mode', isOverview);
  }

  onClickDelete() { this.setState({ showConfirmModal: true }); }

  handleMoveShow(element) { this.setState({ showMoveModal: true, moveElement: element }); }
  handleMoveClose() { this.setState({ showMoveModal: false, moveElement: {} }); }
  handleInfoShow() { this.setState({ showInfoModal: true }); }
  handleInfoClose() { this.setState({ showInfoModal: false }); }
  handleCommentsShow() { this.setState({ showCommentsModal: true }); }
  handleCommentsClose() { this.setState({ showCommentsModal: false }); }
  handleMetadataShow() { this.setState({ showMetadataModal: true }); }
  handleMetadataClose() { this.setState({ showMetadataModal: false }); }

  handleOverview() {
    this.setState({ selectEmbargo: null, elements: [], selectEmbargoId: null, filterContributor: null });
  }

  handleContributorFilter(selected) {
    this.setState({ filterContributor: selected ? selected.value : null });
  }

  handleCommentsSave(comment) {
    const { selectEmbargo, bundles } = this.state;
    RepositoryFetcher.repoReviewPublish(selectEmbargo?.element_id, 'collection', comment, 'Comments', {}, null)
      .then((result) => {
        if (result.review && selectEmbargo) {
          selectEmbargo.review = result.review;
          const index = bundles.findIndex(b => b.element_id === selectEmbargo.element_id);
          if (index !== -1) bundles[index] = selectEmbargo;
        }
        this.setState({ showCommentsModal: false, selectEmbargo, bundles });
      })
      .catch(err => console.log(err)); // eslint-disable-line no-console
  }

  handleElementSelection(selected) {
    if (!selected) return;
    const { bundles } = this.state;
    const selectEmbargo = bundles.find(b => b.element_id === selected.value);
    this.setState(
      { selectEmbargo },
      () => EmbargoActions.getEmbargoElements(selected.value)
    );
  }

  isSubmitter() {
    const { selectEmbargo, current_user } = this.state;
    return current_user?.id === selectEmbargo?.published_by
      || (selectEmbargo?.review?.submitters || []).includes(current_user?.id);
  }

  handleEmbargoAccount() {
    const { selectEmbargo, current_user } = this.state;
    if (!selectEmbargo) { alert('Please select an embargo first!'); return; }
    if (current_user.id !== selectEmbargo.published_by) {
      alert('only the submitter can generate a temporary account!');
      return;
    }
    EmbargoActions.generateEmbargoAccount(selectEmbargo.element_id);
    alert(`A temporary account for [${bundleLabel(selectEmbargo)}] has been created. The details have been sent to you by e-mail.`);
  }

  handleEmbargoRelease() {
    const { selectEmbargo } = this.state;
    if (!selectEmbargo) { alert('Please select an embargo first!'); return; }
    if (!this.isSubmitter()) { alert('only the submitter can perform the release!'); return; }
    EmbargoActions.releaseEmbargo(selectEmbargo.element_id);
    alert(`The submission for the release of the embargo [${bundleLabel(selectEmbargo)}] has been completed!`);
  }

  handleEmbargoDelete(shouldPerform) {
    if (shouldPerform) {
      const { selectEmbargo } = this.state;
      if (!selectEmbargo) alert('Please select an embargo first!');
      else if (!this.isSubmitter()) alert('only the submitter can delete the release!');
      else EmbargoActions.deleteEmbargo(selectEmbargo.element_id);
    }
    this.setState({ showConfirmModal: false });
  }

  handleMoveEmbargo(target) {
    const { selectEmbargo, moveElement } = this.state;
    EmbargoActions.moveEmbargo(selectEmbargo.element_id, target, moveElement);
    this.setState({ showMoveModal: false, moveElement: {} });
  }

  renderActionBar() {
    const { selectEmbargo, elements, current_user } = this.state;
    const acceptedEl = (elements || []).filter(e => e.state === 'accepted');
    const canAct = selectEmbargo && current_user
      && (current_user.is_reviewer || this.isSubmitter());
    if (!canAct) return null;

    return (
      <ButtonToolbar className="px-3 py-2">
        <ButtonGroup>
          <Button
            variant="primary"
            disabled={!selectEmbargo || elements.length === 0}
            onClick={this.handleEmbargoAccount}
          >
            <i className="fa fa-envelope-o me-1" aria-hidden="true" />Anonymous
          </Button>
          <Button
            variant="warning"
            disabled={!selectEmbargo || acceptedEl.length === 0 || acceptedEl.length !== elements.length}
            onClick={this.handleEmbargoRelease}
          >
            <i className="fa fa-telegram me-1" aria-hidden="true" />Release
          </Button>
          <Button
            variant="danger"
            disabled={!selectEmbargo || elements.length !== 0}
            onClick={() => this.onClickDelete()}
          >
            <i className="fa fa-trash-o me-1" aria-hidden="true" />Delete
          </Button>
        </ButtonGroup>
      </ButtonToolbar>
    );
  }

  renderBundleOptions(bundles) {
    const { current_user } = this.state;
    return (bundles || [])
      .filter(col => (
        current_user.is_reviewer
        || current_user.is_submitter
        || col.published_by === current_user.id
        || (col.review?.submitters || []).includes(current_user.id)
        || current_user.type === 'anonymous'
      ))
      .map(col => ({ value: col.element_id, name: bundleLabel(col), label: bundleLabel(col) }));
  }

  renderContributorOptions(bundles) {
    const contributors = new Set();
    (bundles || []).forEach((col) => {
      const name = col.taggable_data?.contributors?.name;
      if (name) contributors.add(name);
    });
    return Array.from(contributors).sort().map(name => ({ value: name, label: name }));
  }

  renderToolbar(bundles) {
    const { selectEmbargo, elements, filterContributor, currentElement } = this.state;
    const hasComment = selectEmbargo?.review?.history?.length > 0;
    const noElements = !elements?.length;
    const options = this.renderBundleOptions(bundles);
    const compact = !!currentElement;
    const iconCls = compact ? 'fa' : 'fa me-1';

    return (
      <div className="d-flex justify-content-between bg-white w-100 gap-2">
        <Select
          className="flex-grow-1 w-100"
          value={options.find(o => o.value === selectEmbargo?.element_id) || null}
          onChange={this.handleElementSelection}
          options={options}
          clearable={false}
          placeholder="Select an embargo"
        />
        {!selectEmbargo?.element_id && (
          <div className="flex-grow-1 w-100">
            <Select
              className="w-100"
              value={this.renderContributorOptions(bundles).find(o => o.value === filterContributor) || null}
              onChange={this.handleContributorFilter}
              options={this.renderContributorOptions(bundles)}
              isClearable
              placeholder="Filter by contributor..."
            />
          </div>
        )}
        {selectEmbargo?.element_id && (
          <ButtonGroup className="flex-grow-1 w-100">
            {tipBtn('Show all embargos', (
              <Button size="sm" variant="light" onClick={this.handleOverview}>
                <i className={`${iconCls} fa-list-ul`} aria-hidden="true" />
                {!compact && 'All Embargoes'}
              </Button>
            ))}
            {tipBtn('Comments', (
              <Button
                size="sm"
                variant={hasComment ? 'success' : 'light'}
                disabled={noElements}
                onClick={this.handleCommentsShow}
              >
                <i className={`${iconCls} fa-comments`} aria-hidden="true" />
                {!compact && 'Comments'}
              </Button>
            ))}
            {tipBtn('Metadata', (
              <Button size="sm" variant="light" disabled={noElements} onClick={this.handleMetadataShow}>
                <i className={`${iconCls} fa-file-code-o`} aria-hidden="true" />
                {!compact && 'Metadata'}
              </Button>
            ))}
            {tipBtn('Info. and DOIs', (
              <Button size="sm" variant="light" disabled={noElements} onClick={this.handleInfoShow}>
                <i className={`${iconCls} fa-address-card-o`} aria-hidden="true" />
                {!compact && 'Info. and DOIs'}
              </Button>
            ))}
            <RepoReviewAuthorsModal
              element={selectEmbargo || {}}
              isEmbargo
              disabled={noElements}
              schemeOnly={false}
              title=""
              taggData={selectEmbargo?.taggable_data || {}}
              compact={compact}
            />
            <RepoFundingModal
              elementId={selectEmbargo?.element_id}
              elementType={selectEmbargo?.element_type}
              compact={compact}
            />
          </ButtonGroup>
        )}
      </div>
    );
  }

  render() {
    const {
      elements, bundles, currentElement, current_user, showConfirmModal,
      showInfoModal, showCommentsModal, selectEmbargo, showMetadataModal, filterContributor,
      showMoveModal, moveElement,
    } = this.state;
    const isOwner = this.isSubmitter();

    if (selectEmbargo === null && bundles?.length > 0) {
      const filteredBundles = filterContributor
        ? bundles.filter(b => b.taggable_data?.contributors?.name === filterContributor)
        : bundles;
      return (
        <Col sm={12} md={12} className="px-2">
          <div className="repo-embargo-overview-wrapper">
            <div className="repo-embargo-overview-toolbar border-bottom pb-2">
              {this.renderToolbar(bundles)}
            </div>
            <div className="repo-embargo-overview-list">
              <RepoEmbargoOverview collections={filteredBundles} currentUser={current_user} />
            </div>
          </div>
        </Col>
      );
    }

    const embargoLabel = selectEmbargo?.taggable_data?.label;
    const elementId = selectEmbargo?.element_id || 0;
    const metadata = selectEmbargo?.metadata_xml || '';

    return (
      <Row className="m-0" style={{ maxWidth: '2000px', margin: '0 auto' }}>
        <Col md={currentElement ? 4 : 12}>
          <Card className="border-0 mb-2">
            <Card.Body className="p-2">
              {this.renderToolbar(bundles)}
            </Card.Body>
          </Card>
          <div className="embargo-list">
            <Table striped className="review-entries mb-0">
              <tbody>
                {(elements || []).map(r => ElAspect(
                  r,
                  EmbargoActions.displayReviewEmbargo,
                  current_user,
                  isOwner,
                  currentElement,
                  this.handleMoveShow,
                ))}
              </tbody>
            </Table>
          </div>
          {this.renderActionBar()}
          <ConfirmModal
            showModal={showConfirmModal}
            title="Warning"
            content="Are you sure that you want to delete this ?"
            onClick={this.handleEmbargoDelete}
          />
        </Col>
        <Col className="review-element" md={currentElement ? 8 : 0}>
          <RepoEmbargoDetails currentElement={currentElement} />
          <EmbargoBundleModal
            show={showMoveModal}
            onHide={this.handleMoveClose}
            element={moveElement}
            bundles={bundles}
            sourceEmbargo={selectEmbargo}
            onConfirm={this.handleMoveEmbargo}
          />
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
            label={embargoLabel}
            metadata={metadata}
            onCloseFn={this.handleMetadataClose}
            elementId={elementId}
            elementType="Collection"
          />
        </Col>
      </Row>
    );
  }
}
