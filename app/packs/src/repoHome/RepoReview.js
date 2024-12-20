import React, { Component } from 'react';
import { Table, Col, Row, DropdownButton, MenuItem, ButtonGroup, Pagination, Form, FormGroup, InputGroup, FormControl, Modal, Panel, ButtonToolbar, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import Select from 'react-select';
import { filter } from 'lodash';
import { RepoReviewModal, RepoCommentModal } from 'repo-review-ui';
import RepoReviewDetails from 'src/repoHome/RepoReviewDetails';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';
import EmbargoActions from 'src/stores/alt/repo/actions/EmbargoActions';
import ReviewStore from 'src/stores/alt/repo/stores/ReviewStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { getFormattedISODateTime } from 'src/components/chemrepo/date-utils';
import StateLabel from 'src/components/chemrepo/common/StateLabel';
import SVGView from 'src/components/chemrepo/SVGViewPan';
import { SchemeWord, ChecklistPanel } from 'src/repoHome/RepoCommon';
import { ShowUserLabels, SearchUserLabels } from 'src/components/UserLabels';
import ReviewSearchBar from 'src/components/chemrepo/ReviewSearchBar';

// import RepoReviewModal from '../components/common/RepoReviewModal';

const renderElement = (e, currentElement, embargoBtn) => {
  if (e.type === 'Reaction') {
    const listClass = (currentElement !== null && currentElement.reaction && currentElement.reaction.id === e.id) ? 'list_focus_on' : 'list_focus_off';
    const schemeOnly = (e && e.scheme_only === true) || false;
    return (
      <tr
        key={e.id}
        className={listClass}
        onClick={() => ReviewActions.displayReviewReaction(e.id)}
      >
        <td style={{ position: 'relative' }} >
          <span className="review_element_label">
            <i className="icon-reaction" />{schemeOnly ? <SchemeWord /> : ''}&nbsp;{e.title}
          </span>
          &nbsp;By&nbsp;{e.published_by}&nbsp;at&nbsp;
          {getFormattedISODateTime(e.submit_at)}&nbsp;{StateLabel(e.state)}&nbsp;{StateLabel(e.embargo)}
          &nbsp;{embargoBtn}
          <div style={{ paddingTop: '5px' }}>
            <ShowUserLabels element={e} />
          </div>
          <div>
            <SVGView svg={e.svg} type={e.type} className="molecule-mid" />
            <ChecklistPanel isReviewer={e.isReviewer} checklist={e.checklist} review_info={e?.review_info || {}}  />
          </div>
        </td>
      </tr>
    );
  }
  const listClass = (currentElement !== null && currentElement.sample && currentElement.sample.id === e.id) ? 'list_focus_on' : 'list_focus_off';
  return (
    <tr
      key={e.id}
      className={listClass}
      onClick={() => ReviewActions.displayReviewSample(e.id)}
    >
      <td style={{ position: 'relative' }}>
        <span className="review_element_label">
          <i className="icon-sample" />&nbsp;{e.title}
        </span>
        &nbsp;By&nbsp;{e.published_by}&nbsp;at&nbsp;
        {getFormattedISODateTime(e.submit_at)}&nbsp;{StateLabel(e.state)}&nbsp;{StateLabel(e.embargo)}
        &nbsp;{embargoBtn}
        <div style={{ paddingTop: '5px' }}>
          <ShowUserLabels element={e} />
        </div>
        <div>
          <SVGView svg={e.svg} type={e.type} className="molecule-mid" />
          <ChecklistPanel isReviewer={e.isReviewer} checklist={e.checklist} review_info={e?.review_info || {}} />
        </div>
      </td>
    </tr>
  );
};

const defaultState = 'pending';

export default class RepoReview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      perPage: 10,
      elements: [],
      currentElement: null,
      showReviewModal: false,
      showCommentModal: false,
      reviewData: {},
      selectType: 'All',
      searchType: 'All',
      searchValue: '',
      listTypeOptions: [],
      selectState: defaultState,
      bundles: [],
      btnAction: '',
      field: '',
      orgInfo: '',
      showEmbargoModal: false,
      selectedElement: null,
      selectedEmbargo: null,
    };
    this.onChange = this.onChange.bind(this);
    this.handleElementSelection = this.handleElementSelection.bind(this);
    this.handleSelectType = this.handleSelectType.bind(this);
    this.handleSelectAdvValue = this.handleSelectAdvValue.bind(this);
    this.handleSearchNameInput = this.handleSearchNameInput.bind(this);
    this.onEmbargoBtnClick = this.onEmbargoBtnClick.bind(this);
    this.onEmbargoBtnSave = this.onEmbargoBtnSave.bind(this);
    this.handleSubmitReview = this.handleSubmitReview.bind(this);
    this.handleReviewUpdate = this.handleReviewUpdate.bind(this);
    this.handleCommentUpdate = this.handleCommentUpdate.bind(this);
    this.setUserLabel = this.setUserLabel.bind(this);
  }

  componentDidMount() {
    ReviewStore.listen(this.onChange);
    ReviewActions.getElements.defer();
    EmbargoActions.getEmbargoBundle(); // added to ReviewStore
  }

  componentWillUnmount() {
    ReviewStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleSubmitReview(elementId, elementType, comment, btnAction, checklist, reviewComments){
    LoadingActions.start();
    ReviewActions.reviewPublish(elementId, elementType, comment, btnAction, checklist, reviewComments);
    // this.props.onHide(false);
  }

  handleReviewUpdate(e, col, rr) {
    const { review } = this.state;
    const checklist = rr.checklist || {};
    if (typeof (checklist[col]) === 'undefined') checklist[col] = {};
    checklist[col].status = e.target.checked;
    review.checklist = checklist;
    ReviewActions.updateReview(review);
  }

  handleCommentUpdate(elementId, elementType, field, commentInput, origInfo) {
    LoadingActions.start();
    const cinfo = {};
    if (typeof (cinfo[field]) === 'undefined') {
      cinfo[field] = {};
    }
    cinfo[field].comment = commentInput;
    cinfo[field].origInfo = origInfo;
    ReviewActions.updateComment(elementId, elementType, cinfo);
  }

  setUserLabel(label) {
    const { userLabel } = this.state;
    this.setState({ userLabel: label });
    if (userLabel !== label) ReviewActions.setUserLabel(label);

    this.handleElementSelection('label', label);
  }


  onPerPageChange(e) {
    const {
      page, selectType, selectState, selectLabel, searchType, searchValue
    } = this.state;
    const perPage = e.target.value;
    this.setState({ perPage });
    ReviewActions.getElements(selectType, selectState, selectLabel, searchType, searchValue, page, perPage);
  }

  onPaginationSelect(eventKey) {
    const {
      pages, perPage, selectType, selectState, selectLabel, searchType, searchValue
    } = this.state;
    if (eventKey > 0 && eventKey <= pages) {
      ReviewActions.getElements(
        selectType, selectState, selectLabel, searchType, searchValue,
        eventKey, perPage
      );
    }
  }

  onEmbargoBtnClick(e, element) {
    e.preventDefault();
    e.stopPropagation();
    const selectedElement = !this.state.showEmbargoModal ? element : null;
    this.setState({ showEmbargoModal: !this.state.showEmbargoModal, selectedElement });
  }

  onEmbargoBtnSave(e, element) {
    const { selectedEmbargo, selectedElement } = this.state;
    if (selectedEmbargo === null) {
      return alert('Please select an embargo first!');
    }
    EmbargoActions.assignEmbargo(selectedEmbargo.value, selectedElement);
    this.onEmbargoBtnClick(e, element);
    return true;
  }

  perPageInput() {
    const { perPage } = this.state;
    return (
      <Form horizontal className="list-show-count" >
        <FormGroup>
          <InputGroup>
            <InputGroup.Addon>Show</InputGroup.Addon>
            <FormControl
              type="text"
              style={{ textAlign: 'center' }}
              onChange={e => this.onPerPageChange(e)}
              value={perPage || 0}
            />
          </InputGroup>
        </FormGroup>
      </Form>
    );
  }

  pagination() {
    const { page, pages } = this.state;
    const items = [];
    const minPage = Math.max(page - 2, 1);
    const maxPage = Math.min(minPage + 4, pages);
    items.push(<Pagination.First key="first-page" onClick={() => this.onPaginationSelect(1)} />);
    if (page > 1) {
      items.push(<Pagination.Prev key="previous-page" onClick={() => this.onPaginationSelect(page - 1)} />);
    }
    for (let tpage = minPage; tpage <= maxPage; tpage += 1) {
      items.push((
        <Pagination.Item
          key={`${tpage}-page`}
          active={tpage === page}
          onClick={() => this.onPaginationSelect(tpage)}
        >
          {tpage}
        </Pagination.Item>
      ));
    }

    if (pages > maxPage) {
      items.push(<Pagination.Ellipsis key="ellipsis-page" />);
    }
    if (page !== pages) {
      items.push(<Pagination.Next key="next-page" onClick={() => this.onPaginationSelect(page + 1)} />);
    }
    items.push(<Pagination.Last key="last-page" onClick={() => this.onPaginationSelect(pages)} />);

    return <div className="list-pagination"><Pagination>{items}</Pagination></div>;
  }

  handleSelectType(val) {
    const { selectType, selectState, perPage, selectLabel } = this.state;
    if (val && (val === 'Submitter' || val === 'Embargo')) {
      RepositoryFetcher.fetchReviewSearchOptions(val, selectType, selectState).then((res) => {
        const options = res && res.result && res.result
          .map(u => ({ value: u.key, name: u.name, label: u.label }));
        this.setState({ listTypeOptions: options });
        ReviewActions.getElements(selectType, selectState, selectLabel, val, '', 1, perPage);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    } else {
      ReviewActions.getElements(selectType, selectState, selectLabel, val, '', 1, perPage);
    }
  }

  handleSearchNameInput(event) {
    const { value } = event.target;
    if (value) {
      this.setState({ searchValue: value });
    }
  }

  handleSelectAdvValue(val) {
    const {
      perPage, selectType, selectState, selectLabel, searchType
    } = this.state;
    if (val) {
      this.setState({ page: 1, searchValue: val });
      ReviewActions.getElements(selectType, selectState, selectLabel, searchType, val, 1, perPage);
    }
  }

  handleElementSelection(t, event) {
    const { perPage, searchType, selectLabel, searchValue } = this.state;
    if (t === 'type') {
      this.setState({ selectType: event });
      ReviewActions.getElements(event, this.state.selectState, selectLabel, searchType, searchValue, 1, perPage);
    } else if (t === 'state') {
      this.setState({ selectState: event });
      ReviewActions.getElements(this.state.selectType, event, selectLabel, searchType, searchValue, 1, perPage);
    } else if (t === 'label') {
      // this.setState({ selectState: event });
      ReviewActions.getElements(this.state.selectType, this.state.selectState, event, searchType, searchValue, 1, perPage);
    }
  }

  handleKeyDown(event) {
    const {
      perPage, selectType, selectState, selectLabel, searchType, searchValue
    } = this.state;
    switch (event.keyCode) {
      case 13: // Enter
        ReviewActions.getElements(selectType, selectState, selectLabel, searchType, searchValue, 1, perPage);
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  loadValuesByType(input) {
    if (!input || input.length < 3) {
      return Promise.resolve({ options: [] });
    }
    return RepositoryFetcher.fetchReviewSearchValues(this.state.searchType, input)
      .then(res => ({
        options: res.result
          .map(u => ({
            value: u.key,
            name: u.name,
            label: u.label
          }))
      })).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  renderMenuItems(t, elements) {
    const menu = elements.map(element => (
      <MenuItem key={element} onSelect={() => this.handleElementSelection(t, element)}>
        {element}
      </MenuItem>
    ));
    return menu;
  }

  renderSearch() {
    const { searchType, searchValue, listTypeOptions, userLabel } = this.state;

    const customClass = '.btn-unified';
    const optSearchType = ['All', 'Samples', 'Reactions'];
    const optSearchState = ['All', 'pending', 'reviewed', 'accepted'];

    this.listOptions = [
      { value: 'All', label: 'filter by' },
      { value: 'Name', label: 'name' },
      { value: 'Embargo', label: 'embargo' },
      { value: 'Submitter', label: 'submitter' },
    ];

    const filterDropdown = (
      <ButtonGroup className="home-search" style={{ display: 'flex' }}>
        <DropdownButton
          className={customClass}
          id="type-inner-dropdown"
          title={this.state.selectType === 'All' ? 'Type' : this.state.selectType}
        >
          {this.renderMenuItems('type', optSearchType)}
        </DropdownButton>
        <DropdownButton
          className={customClass}
          id="state-inner-dropdown"
          title={this.state.selectState}
        >
          {this.renderMenuItems('state', optSearchState)}
        </DropdownButton>
        <div style={{ width: '100%' }}>
          <SearchUserLabels fnCb={this.setUserLabel} userLabel={userLabel} className={customClass} />
        </div>
      </ButtonGroup>
    );

    const searchTypeTbl = (
      <Select
        simpleValue
        searchable={false}
        options={this.listOptions}
        placeholder="Select search field"
        clearable={false}
        valueKey="value"
        labelKey="label"
        onChange={this.handleSelectType}
        defaultValue="All"
        value={searchType}
        className="o-author"
      />
    );

    let searchValueTbl = null;
    switch (searchType) {
      case 'Embargo':
      case 'Submitter':
        searchValueTbl = (
          <Select
            simpleValue
            searchable
            options={listTypeOptions}
            placeholder="Select..."
            valueKey="value"
            labelKey="label"
            onChange={this.handleSelectAdvValue}
            value={searchValue}
            className="o-name"
          />
        );
        break;
      case 'Name':
        searchValueTbl = (
          <FormControl
            type="text"
            placeholder="Name..."
            value={this.state.searchValue || ''}
            onChange={event => this.handleSearchNameInput(event)}
            onKeyDown={event => this.handleKeyDown(event)}
          />
        );
        break;
      default:
        searchValueTbl = null;
    }

    const searchTbl = (
      <div className="home-adv-search">
        <div style={{ display: 'flex', width: '100%' }}>
          <div style={{ flexGrow: 1, width: '100%' }}>{filterDropdown}</div>
          <div style={{ display: 'flex', flexGrow: 1, width: '100%' }}>
            <div style={{ width: '100%' }}>{searchTypeTbl}</div>
            {searchValueTbl && (
              <div style={{ width: '100%' }}>{searchValueTbl}</div>
            )}
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ paddingLeft: '8px', marginTop: '8px', marginBottom: '8px', width: '100%' }}>
        {searchTbl}
      </div>
    );
  }

  renderEmabrgoModal() {
    const { showEmbargoModal, bundles, selectedElement, selectedEmbargo } = this.state;

    const options = [
      { value: '0', name: 'new', label: '--Create a new Embargo Bundle--' },
    ];

    bundles.forEach((col) => {
      const tag = col.taggable_data || {};
      options.push({ value: col.element_id, name: tag.label, label: tag.label });
    });

    const allBundles = filter(options, b => b.value !== (selectedEmbargo == null ? '' : selectedEmbargo.element_id));

    const element = selectedElement || {};
    return (
      <Modal backdrop="static" show={showEmbargoModal}>
        <Modal.Header><Modal.Title>{element.type}: [{element.title}]</Modal.Title></Modal.Header>
        <Modal.Body>
          <Panel bsStyle="success">
            <Panel.Heading>
              <Panel.Title>Movee {element.type} [{element.title}] to :</Panel.Title>
            </Panel.Heading>
            <Panel.Body>
              <Select
                value={this.state.selectedEmbargo}
                onChange={e => this.setState({ selectedEmbargo: e })}
                options={allBundles}
                className="select-assign-collection"
              />
              <br />
              <ButtonToolbar>
                <Button bsStyle="warning" onClick={e => this.onEmbargoBtnClick(e, element)}>Cancel</Button>
                <Button bsStyle="primary" onClick={e => this.onEmbargoBtnSave(e, element)}>Move Embargoed Bundle</Button>
              </ButtonToolbar>
            </Panel.Body>
          </Panel>
        </Modal.Body>
      </Modal>
    );
  }


  renderReviewModal() {
    const { showReviewModal, reviewData, review_info, review, currentElement, elementType, btnAction } = this.state;
    const obj = {};
    obj['review_info'] = review_info;
    obj['review'] = review;
    obj['btnAction'] = btnAction;
    obj['elementType'] = elementType;
    if (elementType === 'sample') {
      obj['elementId'] = currentElement?.sample?.id;
    } else {
      obj['elementId'] = currentElement?.reaction?.id;
    }

    return (
      <RepoReviewModal
        show={showReviewModal}
        data={obj}
        onSubmit={this.handleSubmitReview}
        onUpdate={this.handleReviewUpdate}
        onHide={() => this.setState({ showReviewModal: false })}
      />
    );
  }

  renderCommentModal() {
    const { showCommentModal, review_info, review, currentElement, elementType, btnAction, field, orgInfo } = this.state;
    const obj = {};
    obj['review_info'] = review_info;
    obj['field'] = field;
    obj['orgInfo'] = orgInfo;
    obj['review'] = review;
    obj['btnAction'] = btnAction;
    obj['elementType'] = elementType;
    if (elementType === 'sample') {
      obj['elementId'] = currentElement?.sample?.id;
    } else {
      obj['elementId'] = currentElement?.reaction?.id;
    }

    return (
      <RepoCommentModal
        show={showCommentModal}
        data={obj}
        onUpdate={this.handleCommentUpdate}
        onHide={() => this.setState({ showCommentModal: false })}
      />
    );
  }

  render() {
    const { elements, currentElement } = this.state;
    const { currentUser } = UserStore.getState();
    const embargoBtn = (element) => {
      if (element.state === 'reviewed' && element.embargo === '' && element.submitter_id === currentUser.id) {
        return (
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="moveEmbargo">Move to an embargoed bundle</Tooltip>}>
            <Button bsSize="xsmall" onClick={e => this.onEmbargoBtnClick(e, element)}><i className="fa fa-exchange" aria-hidden="true" /></Button>
          </OverlayTrigger>
        );
      }
      return null;
    };
    return (
      <div>
        <div style={{ position: 'relative', maxWidth: '2000px', margin: '0 auto' }}>
          <ReviewSearchBar
            renderSearch={this.renderSearch.bind(this)}
          />
        </div>
        <Row style={{ width: '100%', maxWidth: '2000px', margin: '0 auto' }}>
          <Col md={currentElement ? 4 : 12} >
            <div>
              <div className="review-list" style={{ backgroundColor: '#f5f5f5' }} >
                <Table striped className="review-entries">
                  <tbody striped="true" bordered="true" hover="true">
                    {((typeof (elements) !== 'undefined' && elements) || []).map(r => renderElement(r, currentElement, embargoBtn(r))) }
                  </tbody>
                </Table>
              </div>
              <div className="list-container-bottom">
                <Row>
                  <Col sm={8}>{this.pagination()}</Col>
                  <Col sm={4}>{this.perPageInput()}</Col>
                </Row>
              </div>
            </div>
          </Col>
          <Col className="review-element" md={currentElement ? 8 : 0}>
            <RepoReviewDetails />
            {this.renderEmabrgoModal()}
          </Col>
        </Row>
        {this.renderReviewModal()}
        {this.renderCommentModal()}
      </div>
    );
  }
}
