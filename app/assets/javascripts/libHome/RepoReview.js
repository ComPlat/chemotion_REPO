import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import { Table, Col, Row, Navbar, DropdownButton, MenuItem, ButtonGroup, Pagination, Form, FormGroup, InputGroup, FormControl } from 'react-bootstrap';
import RepoReviewDetails from './RepoReviewDetails';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import { IconToMyDB, SvgPath, ElStateLabel, ElSubmitTime, SchemeWord } from './RepoCommon';

const renderElement = (e, currentElement) => {
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
            <IconToMyDB isLogin id={e.id} type="reaction" />{schemeOnly ? <SchemeWord /> : ''}&nbsp;{e.title}
          </span>
          &nbsp;By&nbsp;{e.published_by}&nbsp;at&nbsp;
          {ElSubmitTime(e.submit_at)}&nbsp;{ElStateLabel(e.state)}&nbsp;{ElStateLabel(e.embargo)}
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
          <IconToMyDB isLogin id={e.id} type="sample" />&nbsp;{e.title}
        </span>
        &nbsp;By&nbsp;{e.published_by}&nbsp;at&nbsp;
        {ElSubmitTime(e.submit_at)}&nbsp;{ElStateLabel(e.state)}&nbsp;{ElStateLabel(e.embargo)}
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
      selectState: defaultState
    };
    this.onChange = this.onChange.bind(this);
    this.handleElementSelection = this.handleElementSelection.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
    PublicActions.getElements.defer();
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleElementSelection(t, event) {
    const { page, perPage } = this.state;
    if (t === 'type') {
      this.setState({ selectType: event });
      PublicActions.getElements(event,this.state.selectState, 1, perPage);
    } else if (t === 'state') {
      this.setState({ selectState: event });
      PublicActions.getElements(this.state.selectType, event, 1, perPage);
    }
  }


  onPerPageChange(e) {
    const { page, selectType, selectState } = this.state;
    const perPage = e.target.value;
    this.setState({ perPage });
    PublicActions.getElements(selectType, selectState, page, perPage);
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

  onPaginationSelect(eventKey) {
    const { pages, perPage, selectType, selectState } = this.state;
    if (eventKey > 0 && eventKey <= pages) {
      PublicActions.getElements(selectType, selectState, eventKey, perPage);
    }
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

  renderMenuItems(t, elements) {
    const menu = elements.map(element => (
      <MenuItem key={element} onSelect={() => this.handleElementSelection(t, element)}>
        {element}
      </MenuItem>
    ));
    return menu;
  }

  renderSearch() {
    const customClass = '.btn-unified';
    const optSearchType = ['All', 'Samples', 'Reactions'];
    const optSearchState = ['pending', 'reviewed', 'accepted'];

    const filterDropdown = (
      <ButtonGroup>
        <DropdownButton
          className={customClass}
          id="type-inner-dropdown"
          title={this.state.selectType === 'All' ? 'Type' : this.state.selectType}
          style={{ width: '100px' }}
        >
          {this.renderMenuItems('type', optSearchType)}
        </DropdownButton>
        <DropdownButton
          className={customClass}
          id="state-inner-dropdown"
          title={this.state.selectState}
          style={{ width: '100px' }}
        >
          {this.renderMenuItems('state', optSearchState)}
        </DropdownButton>
      </ButtonGroup>
    );

    return (
      <div style={{ paddingLeft: '15px', marginTop: '8px', marginBottom: '8px' }}>
        {filterDropdown}
      </div>
    );
  }

  render() {
    const { elements, currentElement } = this.state;
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
                  {((typeof (elements) !== 'undefined' && elements) || []).map(r => renderElement(r, currentElement)) }
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
        <Col
          className="review-element"
          md={currentElement ? 8 : 0}
          // style={this.state.currentElement ? {} : { display: 'none' }}
        ><RepoReviewDetails />
        </Col>
      </Row>
    );
  }
}
