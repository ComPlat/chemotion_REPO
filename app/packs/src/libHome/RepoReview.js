import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import { Table, Col, Row, Navbar, DropdownButton, MenuItem, ButtonGroup, Pagination, Form, FormGroup, InputGroup, FormControl, Modal, Panel, ButtonToolbar, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import Select from 'react-select';
import { filter } from 'lodash';
import RepoReviewDetails from './RepoReviewDetails';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import UserStore from '../components/stores/UserStore';
import RepositoryFetcher from '../components/fetchers/RepositoryFetcher';
import { SvgPath, ElStateLabel, ElSubmitTime, SchemeWord } from './RepoCommon';

const renderElement = (e, currentElement, embargoBtn) => {
  if (e.type === 'Reaction') {
    const listClass = (currentElement !== null && currentElement.reaction && currentElement.reaction.id === e.id) ? 'list_focus_on' : 'list_focus_off';
    const schemeOnly = (e && e.scheme_only === true) || false;
    return (
      <tr
        key={e.id}
        className={listClass}
        onClick={() => PublicActions.displayReviewReaction(e.id)}
      >
        <td style={{ position: 'relative' }} >
          <span className="review_element_label">
            <i className="icon-reaction" />{schemeOnly ? <SchemeWord /> : ''}&nbsp;{e.title}
          </span>
          &nbsp;By&nbsp;{e.published_by}&nbsp;at&nbsp;
          {ElSubmitTime(e.submit_at)}&nbsp;{ElStateLabel(e.state)}&nbsp;{ElStateLabel(e.embargo)}
          &nbsp;{embargoBtn}
          <div>
            <SVG src={SvgPath(e.svg, e.type)} className="molecule-mid" key={e.svg} />
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
      onClick={() => PublicActions.displayReviewSample(e.id)}
    >
      <td style={{ position: 'relative' }}>
        <span className="review_element_label">
          <i className="icon-sample" />&nbsp;{e.title}
        </span>
        &nbsp;By&nbsp;{e.published_by}&nbsp;at&nbsp;
        {ElSubmitTime(e.submit_at)}&nbsp;{ElStateLabel(e.state)}&nbsp;{ElStateLabel(e.embargo)}
        &nbsp;{embargoBtn}
        <div>
          <SVG src={SvgPath(e.svg, e.type)} className="molecule-mid" key={e.svg} />
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
      selectType: 'All',
      searchType: 'All',
      searchValue: '',
      listTypeOptions: [],
      selectState: defaultState,
      bundles: [],
      showEmbargoModal: false,
      selectedElement: null,
      selectedEmbargo: null
    };
    this.onChange = this.onChange.bind(this);
    this.handleElementSelection = this.handleElementSelection.bind(this);
    this.handleSelectType = this.handleSelectType.bind(this);
    this.handleSelectAdvValue = this.handleSelectAdvValue.bind(this);
    this.handleSearchNameInput = this.handleSearchNameInput.bind(this);
    this.onEmbargoBtnClick = this.onEmbargoBtnClick.bind(this);
    this.onEmbargoBtnSave = this.onEmbargoBtnSave.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
    PublicActions.getElements.defer();
    PublicActions.getEmbargoBundle();
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  onPerPageChange(e) {
    const {
      page, selectType, selectState, searchType, searchValue
    } = this.state;
    const perPage = e.target.value;
    this.setState({ perPage });
    PublicActions.getElements(selectType, selectState, searchType, searchValue, page, perPage);
  }

  onPaginationSelect(eventKey) {
    const {
      pages, perPage, selectType, selectState, searchType, searchValue
    } = this.state;
    if (eventKey > 0 && eventKey <= pages) {
      PublicActions.getElements(
        selectType, selectState, searchType, searchValue,
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
    PublicActions.assignEmbargo(selectedEmbargo.value, selectedElement);
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
    const { selectType, selectState, perPage } = this.state;
    if (val && (val === 'Submitter' || val === 'Embargo')) {
      RepositoryFetcher.fetchReviewSearchOptions(val, selectType, selectState).then((res) => {
        const options = res && res.result && res.result
          .map(u => ({ value: u.key, name: u.name, label: u.label }));
        this.setState({ listTypeOptions: options });
        PublicActions.getElements(selectType, selectState, val, '', 1, perPage);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    } else {
      PublicActions.getElements(selectType, selectState, val, '', 1, perPage);
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
      perPage, selectType, selectState, searchType
    } = this.state;
    if (val) {
      this.setState({ page: 1, searchValue: val });
      PublicActions.getElements(selectType, selectState, searchType, val, 1, perPage);
    }
  }

  handleElementSelection(t, event) {
    const { perPage, searchType, searchValue } = this.state;
    if (t === 'type') {
      this.setState({ selectType: event });
      PublicActions.getElements(event, this.state.selectState, searchType, searchValue, 1, perPage);
    } else if (t === 'state') {
      this.setState({ selectState: event });
      PublicActions.getElements(this.state.selectType, event, searchType, searchValue, 1, perPage);
    }
  }

  handleKeyDown(event) {
    const {
      perPage, selectType, selectState, searchType, searchValue
    } = this.state;
    switch (event.keyCode) {
      case 13: // Enter
        PublicActions.getElements(selectType, selectState, searchType, searchValue, 1, perPage);
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
    const { searchType, searchValue, listTypeOptions } = this.state;

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

    let searchValueTbl = (<div />);
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
        searchValueTbl = (<div />);
    }

    const searchTbl = (
      <div className="home-adv-search">
        <div style={{ display: 'flex' }}>
          { filterDropdown }
          { searchTypeTbl }
          { searchValueTbl }
        </div>
      </div>
    );

    return (
      <div style={{ paddingLeft: '15px', marginTop: '8px', marginBottom: '8px' }}>
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
              <Panel.Title>Move {element.type} [{element.title}] to :</Panel.Title>
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
      <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
        <Col md={currentElement ? 4 : 12} >
          <Navbar fluid className="navbar-custom" style={{ marginBottom: '5px' }}>
            {this.renderSearch()}
            <div style={{ clear: 'both' }} />
          </Navbar>
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
    );
  }
}
