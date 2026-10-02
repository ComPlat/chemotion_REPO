import React, { Component } from 'react';
import {
  Table,
  Col,
  Row,
  Pagination,
  Form,
  InputGroup,
  Button,
  Tooltip,
  OverlayTrigger,
} from 'react-bootstrap';

import { RepoReviewModal, RepoCommentModal } from 'repo-review-ui';
import { Select } from 'src/components/common/Select';
import RepoReviewDetails from 'src/repo/repoHome/RepoReviewDetails';
import ReviewActions from 'src/repo/actions/ReviewActions';
import EmbargoActions from 'src/repo/actions/EmbargoActions';
import ReviewStore from 'src/repo/stores/ReviewStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';
import { getFormattedISODateTime } from 'src/repo/chemrepo/date-utils';
import StateLabel from 'src/repo/chemrepo/common/StateLabel';
import SVGView from 'src/repo/chemrepo/SVGViewPan';
import { SchemeWord, ChecklistPanel } from 'src/repo/repoHome/RepoCommon';
import { ShowUserLabels, SearchUserLabels, UserLabel } from 'src/components/UserLabels';
import EmbargoBundleModal from 'src/repo/chemrepo/common/EmbargoBundleModal';

const ctrlStyle = (type) => {
  const styles = {
    start: { borderRadius: '4px 0 0 4px', borderRight: 'none' },
    middle: { borderRadius: '0', borderRight: 'none' },
    end: { borderRadius: '0 4px 4px 0' },
  };

  const style = styles[type];
  if (!style) return {};

  return {
    control: (base) => ({
      ...base,
      ...style,
      minHeight: '38px',
    }),
  };
};

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
          {getFormattedISODateTime(e.submit_at)}
          {(e.labels || []).map((l) => (
            <React.Fragment key={l.id}>&nbsp;<UserLabel {...l} /></React.Fragment>
          ))}
          &nbsp;{StateLabel(e.state)}&nbsp;{StateLabel(e.embargo)}
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
        {getFormattedISODateTime(e.submit_at)}
        {(e.labels || []).map((l) => (
          <React.Fragment key={l.id}>&nbsp;<UserLabel {...l} /></React.Fragment>
        ))}
        &nbsp;{StateLabel(e.state)}&nbsp;{StateLabel(e.embargo)}
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
    };
    this.onChange = this.onChange.bind(this);
    this.handleElementSelection = this.handleElementSelection.bind(this);
    this.handleSelectType = this.handleSelectType.bind(this);
    this.handleSelectAdvValue = this.handleSelectAdvValue.bind(this);
    this.handleSearchNameInput = this.handleSearchNameInput.bind(this);
    this.onEmbargoBtnClick = this.onEmbargoBtnClick.bind(this);
    this.onEmbargoClose = this.onEmbargoClose.bind(this);
    this.onEmbargoConfirm = this.onEmbargoConfirm.bind(this);
    this.handleSubmitReview = this.handleSubmitReview.bind(this);
    this.handleReviewUpdate = this.handleReviewUpdate.bind(this);
    this.handleCommentUpdate = this.handleCommentUpdate.bind(this);
    this.setUserLabel = this.setUserLabel.bind(this);
    this.renderSearch = this.renderSearch.bind(this);
    this.renderSearchBar = this.renderSearchBar.bind(this);
  }

  componentDidMount() {
    ReviewStore.listen(this.onChange);
    ReviewActions.getElements.defer();
    EmbargoActions.getEmbargoBundle(); // ReviewStore also handles the bundle list
  }

  componentWillUnmount() {
    ReviewStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleSubmitReview(elementId, elementType, comment, btnAction, checklist, reviewComments){
    RepoLoadingActions.start();
    ReviewActions.reviewPublish(elementId, elementType, comment, btnAction, checklist, reviewComments);
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
    RepoLoadingActions.start();
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
    this.setState({ perPage: e.target.value });
  }

  commitPerPage() {
    const {
      page, perPage, selectType, selectState, selectLabel, searchType, searchValue
    } = this.state;
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
    this.setState({ showEmbargoModal: true, selectedElement: element });
  }

  onEmbargoClose() {
    this.setState({ showEmbargoModal: false, selectedElement: null });
  }

  onEmbargoConfirm(target) {
    const { selectedElement } = this.state;
    EmbargoActions.assignEmbargo(target.value, selectedElement);
    this.onEmbargoClose();
  }

  perPageInput() {
    const { perPage } = this.state;
    return (
      <Form
        className="list-show-count"
        onSubmit={(e) => { e.preventDefault(); this.commitPerPage(); }}
      >
        <Form.Group>
          <InputGroup>
            <InputGroup.Text>Show</InputGroup.Text>
            <Form.Control
              type="text"
              style={{ textAlign: 'center' }}
              onChange={e => this.onPerPageChange(e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  this.commitPerPage();
                }
              }}
              value={perPage || 0}
            />
          </InputGroup>
        </Form.Group>
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

  handleSelectType(selected) {
    const { selectType, selectState, perPage, selectLabel } = this.state;
    const val = selected.value;
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

  handleSelectAdvValue(selected) {
    const {
      perPage, selectType, selectState, selectLabel, searchType
    } = this.state;
    const val = selected.value;
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

  renderSearchBar() {
    return (
      <div
        className="d-flex align-items-center w-100"
      >
        <div className="flex-grow-1">{this.renderSearch()}</div>
      </div>
    );
  }

  renderSearch() {
    const { searchType, searchValue, listTypeOptions, userLabel } = this.state;
    let searchValueTbl = null;

    const optSearchType = [
      { value: 'All', label: 'All' },
      { value: 'Samples', label: 'Samples' },
      { value: 'Reactions', label: 'Reactions' }
    ];
    const optSearchState = [
      { value: 'All', label: 'All' },
      { value: 'pending', label: 'pending' },
      { value: 'reviewed', label: 'reviewed' },
      { value: 'accepted', label: 'accepted' }
    ];

    this.listOptions = [
      { value: 'All', label: 'Filter by ...' },
      { value: 'Name', label: 'name' },
      { value: 'Embargo', label: 'embargo' },
      { value: 'Submitter', label: 'submitter' },
    ];

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
            value={(listTypeOptions || []).find(({value}) => value === searchValue)}
            className="o-name"
            styles={ctrlStyle('end')}
          />
        );
        break;
      case 'Name':
        searchValueTbl = (
          <Form.Control
            type="text"
            placeholder="Name..."
            value={this.state.searchValue || ''}
            onChange={event => this.handleSearchNameInput(event)}
            onKeyDown={event => this.handleKeyDown(event)}
            style={{
              borderRadius: '0 4px 4px 0',
            }}
          />
        );
        break;
      default:
        searchValueTbl = null;
    }

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
        value={this.listOptions.find(({value}) => value === searchType)}
        className="o-author"
        styles={ctrlStyle(searchValueTbl ? 'middle' : 'end')}
      />
    );

    const searchTbl = (
      <div className="home-adv-search">
        <div className="d-flex align-items-stretch w-100">
          <div style={{ minWidth: '150px' }}>
            <Select
              simpleValue
              searchable={false}
              options={optSearchType}
              placeholder="Type"
              clearable={false}
              valueKey="value"
              labelKey="label"
              onChange={(selected) => this.handleElementSelection('type', selected.value)}
              value={optSearchType.find(({value}) => value === this.state.selectType)}
              styles={ctrlStyle('start')}
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <Select
              simpleValue
              searchable={false}
              options={optSearchState}
              placeholder="State"
              clearable={false}
              valueKey="value"
              labelKey="label"
              onChange={(selected) => this.handleElementSelection('state', selected.value)}
              value={optSearchState.find(({value}) => value === this.state.selectState)}
              styles={ctrlStyle('middle')}
            />
          </div>
          <div style={{ minWidth: '200px' }}><SearchUserLabels fnCb={this.setUserLabel} userLabel={userLabel} styles={ctrlStyle('middle')} includeReviewLabels /></div>
          <div style={{ minWidth: '200px' }}>{searchTypeTbl}</div>
          {searchValueTbl && (
            <div className="flex-grow-1" style={{ minWidth: '200px' }}>{searchValueTbl}</div>
          )}
        </div>
      </div>
    );

    return (
      <div className="p-2 mb-2 w-100">
        {searchTbl}
      </div>
    );
  }

  renderReviewModal() {
    const { showReviewModal, review_info, review, currentElement, elementType, btnAction } = this.state;
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

    const { sttEnabled } = this.props;

    return (
      <RepoReviewModal
        show={showReviewModal}
        data={obj}
        onSubmit={this.handleSubmitReview}
        onUpdate={this.handleReviewUpdate}
        onHide={() => this.setState({ showReviewModal: false })}
        sttEnabled={sttEnabled || false}
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

    const { sttEnabled } = this.props;

    return (
      <RepoCommentModal
        show={showCommentModal}
        data={obj}
        onUpdate={this.handleCommentUpdate}
        onHide={() => this.setState({ showCommentModal: false })}
        sttEnabled={sttEnabled || false}
      />
    );
  }

  render() {
    const {
      elements, currentElement, bundles, showEmbargoModal, selectedElement,
    } = this.state;
    const { currentUser } = UserStore.getState();
    const embargoBtn = (element) => {
      if (element.state === 'reviewed' && element.embargo === '' && element.submitter_id === currentUser.id) {
        return (
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="moveEmbargo">Move to an embargoed bundle</Tooltip>}>
            <Button size="sm" onClick={e => this.onEmbargoBtnClick(e, element)}><i className="fa fa-exchange" aria-hidden="true" /></Button>
          </OverlayTrigger>
        );
      }
      return null;
    };
    const listClass = 'review-list-search';
    return (
      <div style={{ width: '100%', maxWidth: '2000px', margin: '0 auto' }}>
        <Row style={{ width: '100%' }}>
          <Col md={12} sm={12}>
            {this.renderSearchBar()}
          </Col>
          <Col md={currentElement ? 4 : 12}>
            <div>
              <div className={listClass} style={{ backgroundColor: '#f5f5f5' }}>
                <Table striped bordered hover className="review-entries">
                  <tbody>
                    {((typeof elements !== 'undefined' && elements) || []).map(
                      r => renderElement(r, currentElement, embargoBtn(r))
                    )}
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
            <EmbargoBundleModal
              show={showEmbargoModal}
              onHide={this.onEmbargoClose}
              element={selectedElement}
              bundles={bundles}
              onConfirm={this.onEmbargoConfirm}
            />
          </Col>
        </Row>
        {this.renderReviewModal()}
        {this.renderCommentModal()}
      </div>
    );
  }
}
