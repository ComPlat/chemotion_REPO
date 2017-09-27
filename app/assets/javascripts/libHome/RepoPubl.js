import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import {
  Pagination, Table, Form, Col, Row, InputGroup, ButtonGroup, Button,
  Glyphicon, Grid, Radio, DropdownButton, MenuItem,
  FormGroup, FormControl, Nav, Navbar, Tooltip, OverlayTrigger,
  Tabs, Tab
} from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import UIActions from '../components/actions/UIActions';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import PubchemLabels from '../components/PubchemLabels';
import RepoElementDetails from './RepoElementDetails';
import SuggestionsFetcher from '../components/fetchers/SuggestionsFetcher';
import PublicFetcher from '../components/fetchers/PublicFetcher';
import AutoCompleteInput from '../components/search/AutoCompleteInput';
import StructureEditorModal from '../components/structure_editor/StructureEditorModal';
import Formula from '../components/common/Formula';


const pubchemTag = (molecule) => {
  if (molecule && molecule.tag &&
    molecule.tag.taggable_data && molecule.tag.taggable_data.pubchem_cid) {
    return {
      pubchem_tag: { pubchem_cid: molecule.tag.taggable_data.pubchem_cid }
    };
  }
  return false;
};

const renderReaction = (element, currentElement) => {
  const listClass = (currentElement !== null && currentElement.id === element.id) ? 'list_focus_on' : 'list_focus_off';
  return (
    <tr
      key={`list-reaction-${element.type}-${element.id}`}
      className={listClass}
      onClick={() => PublicActions.displayReaction(element.id)}
    >
      <td
        colSpan="2"
        style={{ position: 'relative' }}
      >
        <div>
          <SVG src={element.svgPath} className="reaction" key={element.svgPath} />
        </div>
      </td>
    </tr>
  );
};

export default class RepoPubl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // ...PublicStore.getState(),
      page: 1,
      perPage: 10,
      showStructureEditor: false,
      isSearch: false,
      defaultSearchValue: null,
      selectType: 'all',
      inputDisabled: false,
      queryMolfile: null,
      searchType: 'similar',
      tanimotoThreshold: 0.7,
      listType: 'reaction',
      advFlag: false,
      advType: 'Authors',
      advValue: [],
      selectUsers: [],
      key: uuid.v4(),
      showSearch: false
    };

    this.onChange = this.onChange.bind(this);
    this.changeSort = this.changeSort.bind(this);
    this.handleClearSearchSelection = this.handleClearSearchSelection.bind(this);
    this.handleStructureEditorCancel = this.handleStructureEditorCancel.bind(this);
    this.handleSelectAdvValue = this.handleSelectAdvValue.bind(this);
    this.showAdvancedSearch = this.showAdvancedSearch.bind(this);
    this.closeAdvancedSearch = this.closeAdvancedSearch.bind(this);
    this.renderAdvancedSearch = this.renderAdvancedSearch.bind(this);
    this.advSearchClick = this.advSearchClick.bind(this);
    this.handleSelectAdvType = this.handleSelectAdvType.bind(this);
    this.loadAdvValuesByName = this.loadAdvValuesByName.bind(this);
    this.handleElementSelection = this.handleElementSelection.bind(this);
    this.handleShowSearch = this.handleShowSearch.bind(this);
  }

  componentDidMount() {
    PublicActions.selectPublicCollection.defer();
    PublicStore.listen(this.onChange);
    PublicActions.getReactions.defer();
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleSearchTypeChange(e) {
    this.setState({ searchType: e.target && e.target.value });
  }

  handleStructureEditorCancel() {
    this.setState({ isSearch: false });
    this.hideStructureEditor();
  }

  showStructureEditor() {
    this.setState({ showStructureEditor: true });
  }

  hideStructureEditor() {
    this.setState({ showStructureEditor: false });
  }

  showAdvancedSearch() {
    this.setState({ advFlag: true });
  }

  handleSelectAdvType(val) {
    if (val) { this.setState({ advType: val, advValue: null }); }
  }

  onPerPageChange(e) {
    this.setState({ perPage: e.target.value }, () => this.getList());
  }

  getList(ps = {}) {
    const {
      advFlag, advType, advValue,
      isSearch,
      selectType, selection,
      page, perPage,
    } = this.state;
    let params = {
      advFlag,
      advType,
      advValue,
      elementType: selectType,
      page,
      perPage,
      selection,
      ...ps
    };
    if (isSearch) {
      switch (this.state.listType) {
        case 'reaction':
          PublicActions.getSearchReactions(params);
          break;
        case 'sample':
          PublicActions.getSearchMolecules(params);
          break;
        case 'scheme':
          params = { ...params, collectionId: 'schemeOnly' };
          PublicActions.getSearchReactions(params);
          break;
        default:
      }
      return;
    }
    switch (this.state.listType) {
      case 'reaction':
        params = { ...params, schemeOnly: false };
        PublicActions.getReactions(params);
        break;
      case 'sample':
        PublicActions.getMolecules(params);
        break;
      case 'scheme':
        params = { ...params, schemeOnly: true };
        PublicActions.getReactions(params);
        break;
      default:
        PublicActions.getReactions(params);
    }
    UIActions.clearSearchSelection();
  }

  handleClearSearchSelection() {
    this.setState({
      defaultSearchValue: null,
      searchType: 'similar',
      tanimotoThreshold: 0.7,
      queryMolfile: null,
      isSearch: false,
      key: uuid.v4(),
      page: 1
    }, () => this.getList());
  }

  handleElementSelection(event) {
    this.setState({ selectType: event.toLowerCase() });
  }

  handleShowSearch() {
    const { showSearch, advFlag } = this.state;
    this.setState({ showSearch: !showSearch, advFlag: !advFlag });
  }

  closeAdvancedSearch() {
    this.setState({ advType: 'Authors', advValue: null, page: 1 }, () => this.getList());
  }


  loadAdvValuesByName(input) {
    if (!input || input.length < 3) {
      return Promise.resolve({ options: [] });
    }
    return PublicFetcher.fetchAdvancedValues(this.state.advType, input)
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

  changeSort(e) {
    this.setState({
      // isSearch: false,
      // defaultSearchValue: null,
      page: 1,
      listType: e
    }, () => this.getList());
  }


  renderMolecule(molecule) {
    const {
      advFlag, advType, advValue, currentElement
    } = this.state;
    const pubchemInfo = pubchemTag(molecule);
    const svgPathSample = molecule.sample_svg_file
      ? `/images/samples/${molecule.sample_svg_file}`
      : `/images/molecules/${molecule.molecule_svg_file}`;
    const listClass = (currentElement !== null && currentElement.molecule && currentElement.molecule.id === molecule.id) ? 'list_focus_on' : 'list_focus_off';
    return (
      <tr
        key={molecule.id}
        className={listClass}
        onClick={() => PublicActions.displayMolecule(molecule.id, advFlag, advType, advValue)}
      >
        <td
          colSpan="2"
          style={{ position: 'relative' }}
        >
          <div style={{ float: 'left' }}>
            <SVG src={svgPathSample} className="molecule" key={svgPathSample} />
          </div>
          <div style={{ paddingLeft: 5, wordWrap: 'break-word' }}>
            <h4> <Formula formula={molecule.sum_formular} /> </h4>
            <h4>
              {molecule.iupac_name}
              {pubchemInfo ? <PubchemLabels element={pubchemTag(molecule)} /> : null }
            </h4>
          </div>
        </td>
      </tr>
    );
  }

  renderMenuItems() {
    const elements = [
      'All', 'Samples', 'Reactions'
    ];

    const menu = elements.map(element => (
      <MenuItem key={element} eventKey={element} onSelect={this.handleElementSelection}>
        {element}
      </MenuItem>
    ));

    return menu;
  }


  handleTanimotoChange(e) {
    const val = e.target && e.target.value;
    if (!isNaN(val - val)) {
      this.setState({ tanimotoThreshold: val });
    }
  }

  handleSelectionChange(selection) {
    this.setState({
      isSearch: true,
      selection,
      page: 1
    }, () => this.getList());
  }

  structureSearch(molfile) {
    const {
      page,
      perPage,
      searchType,
      selectType,
      tanimotoThreshold
    } = this.state;

    const tanimoto = (tanimotoThreshold <= 0 || tanimotoThreshold > 1) ? 0.3 : tanimotoThreshold;
    const selection = {
      molfile,
      search_type: searchType,
      tanimoto_threshold: tanimoto,
      search_by_method: 'structure',
      structure_search: true
    };

    this.setState(
      {
        isSearch: true,
        selection,
        page: 1,
        defaultSearchValue: 'structure',
        queryMolfile: molfile
      },
      () => PublicActions.getSearchMolecules({ // NB: use getList instead?
        elementType: selectType,
        page,
        perPage,
        selection,
      })
    );
  }

  handleStructureEditorSave(molfile) {
    this.hideStructureEditor();
    if (molfile) {
      const molfileLines = molfile.match(/[^\r\n]+/g);
      if (molfileLines && molfileLines[1].trim()[0] !== 0) {
        this.structureSearch(molfile);
      } else {
        // TODO: clear search?
      }
    }
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
    const { pages } = this.state;
    if (eventKey > 0 && eventKey <= pages) {
      this.setState({ page: eventKey }, () => this.getList());
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


  renderSwitch() {
    const { listType } = this.state;
    return (
      <Tabs
        activeKey={listType}
        onSelect={this.changeSort}
        id="element-list-type"
      >
        <Tab eventKey="reaction" title="Reactions" />
        <Tab eventKey="sample" title="Samples" />
        <Tab eventKey="scheme" title="Scheme-only reactions" />
      </Tabs>
    );
  }

  renderSelectValues() {
    const { advValue } = this.state;
    return (
      <Select.Async
        multi
        isLoading
        backspaceRemoves
        value={advValue}
        valueKey="value"
        labelKey="label"
        loadOptions={this.loadAdvValuesByName}
        onChange={this.handleSelectAdvValue}
      />
    );
  }

  handleSelectAdvValue(val) {
    if (val) {
      this.setState({ advValue: val });
    }
  }

  advSearchClick() {
    this.setState({ page: 1 }, () => this.getList());
  }

  renderAdvancedSearch() {
    const { advFlag, advType, advValue } = this.state;
    if (advFlag === true) {
      this.listOptions = [
        {
          value: 'Authors',
          label: 'by authors'
        },
        {
          value: 'Ontologies',
          label: 'by analysis type'
        }
      ];
      return (
        <div style={{ display: 'flex' }}>
          <div>
            <Select
              simpleValue
              searchable={false}
              options={this.listOptions}
              placeholder="Select search field"
              clearable={false}
              valueKey="value"
              labelKey="label"
              onChange={this.handleSelectAdvType}
              defaultValue="Authors"
              value={advType}
              style={{ minWidth: '160px' }}
            />
          </div>
          <div>
            <Select.Async
              multi
              isLoading
              backspaceRemoves
              value={advValue}
              valueKey="value"
              labelKey="label"
              loadOptions={this.loadAdvValuesByName}
              onChange={this.handleSelectAdvValue}
              style={{ minWidth: '200px' }}
            />
          </div>
          <div>
            <ButtonGroup>
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="advSearch">Advanced Search</Tooltip>}>
                <Button onClick={this.advSearchClick} style={{ backgroundColor: 'rgb(221, 221, 221)' }}>
                  <i className="fa fa-search" />
                </Button>
              </OverlayTrigger>
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="closeAdvSearch">Reset Advanced Search</Tooltip>}>
                <Button onClick={this.closeAdvancedSearch} style={{ backgroundColor: 'rgb(221, 221, 221)' }}>
                  <i className="fa fa-times" />
                </Button>
              </OverlayTrigger>
            </ButtonGroup>
          </div>
        </div>
      );
    }
    return (<div />);
  }

  renderSearch() {
    const { isSearch, defaultSearchValue } = this.state;
    const customClass = '.btn-unified';

    const stSearchTooltip = <Tooltip id="search_tooltip">Draw Molecule Structure to query</Tooltip>;
    const clearTooltip = <Tooltip id="search_tooltip">Clear search</Tooltip>;

    const buttonAfter = (
      <ButtonGroup>
        <OverlayTrigger placement="bottom" delayShow={1000} overlay={stSearchTooltip}>
          <Button bsStyle={customClass ? null : 'primary'} className={customClass} onClick={() => this.showStructureEditor()}>
            <Glyphicon glyph="pencil" id="AutoCompletedrawAddon" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="right" delayShow={1000} overlay={clearTooltip}>
          <Button bsStyle={customClass ? null : 'danger'} className={customClass} onClick={this.handleClearSearchSelection}>
            <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );

    const submitAddons = (
      <Grid>
        <Row>
          <Col sm={6} md={4}>
            <Form inline>
              <Radio
                ref={(input) => { this.searchSimilarRadio = input; }}
                value="similar"
                checked={this.state.searchType === 'similar'}
                onChange={e => this.handleSearchTypeChange(e)}
              >
                &nbsp; Similarity Search &nbsp;
              </Radio>
              &nbsp;&nbsp;
              <FormControl
                style={{ width: '40%' }}
                type="text"
                value={this.state.tanimotoThreshold}
                ref={(input) => { this.searchTanimotoInput = input; }}
                onChange={e => this.handleTanimotoChange(e)}
              />
            </Form>
          </Col>
          <Col sm={4} md={2}>
            <Radio
              ref={(input) => { this.searchSubstructureRadio = input; }}
              value="sub"
              checked={this.state.searchType === 'sub'}
              onChange={e => this.handleSearchTypeChange(e)}
            >
              Substructure Search
            </Radio>
          </Col>
        </Row>
      </Grid>
    );

    const inputAttributes = {
      placeholder: 'IUPAC, InChI, SMILES, ...',
      style: { minWidth: 168, maxWidth: 268 }
    };

    const suggestionsAttributes = {
      style: {
        marginTop: 15,
        width: 398,
        maxHeight: 400
      }
    };

    const searchTooltip = <Tooltip id="search_tooltip">Select search type</Tooltip>;

    const innerDropdown = (
      <OverlayTrigger placement="top" delayShow={1000} overlay={searchTooltip}>
        <DropdownButton
          id="search-inner-dropdown"
          title={this.state.selectType === 'all' ? 'All' :
          <span><i className={`icon-${this.state.selectType.toLowerCase().slice(0, -1)}`} aria-hidden="true" /></span>}
        >
          {this.renderMenuItems()}
        </DropdownButton>
      </OverlayTrigger>
    );

    return (
      <div className="chemotion-search">
        <div className="search-structure-draw">
          <StructureEditorModal
            showModal={this.state.showStructureEditor}
            onSave={this.props.noSubmit ? null : this.handleStructureEditorSave.bind(this)}
            onCancel={this.handleStructureEditorCancel}
            molfile={this.state.queryMolfile}
            submitBtnText="Search"
            submitAddons={submitAddons}
          />
        </div>
        {
          this.state.showSearch ?
          (
            <span>
              <Button bsStyle="primary" className="button-caret" onClick={this.handleShowSearch}>
                <i className="fa fa-caret-left" aria-hidden="true" />&nbsp;<i className="fa fa-search" aria-hidden="true" />
              </Button>
              <div className="search-autocomplete">
                <AutoCompleteInput
                  key={this.state.key}
                  inputAttributes={inputAttributes}
                  inputDisabled={isSearch}
                  defaultSearchValue={defaultSearchValue}
                  suggestionsAttributes={suggestionsAttributes}
                  suggestions={input => SuggestionsFetcher.fetchSuggestionsForCurrentUser(
                    this.state.selectType.toLowerCase(), input, 'public', false)}
                  ref={(input) => { this.autoComplete = input; }}
                  onSelectionChange={selection => this.handleSelectionChange(selection)}
                  buttonBefore={innerDropdown}
                  buttonAfter={buttonAfter}
                />
              </div>
            </span>
          ) :
          (
            <Button bsStyle="primary" className="button-caret" onClick={this.handleShowSearch}>
              <i className="fa fa-search" aria-hidden="true" />&nbsp;<i className="fa fa-caret-right" aria-hidden="true" />
            </Button>
          )
        }
      </div>
    );
  }

  render() {
    const {
      molecules, listType, reactions, currentElement, showSearch
    } = this.state;

    const isPubElement = !!(((currentElement && this.state.currentElement.publication &&
      this.state.currentElement.publication.published_at) || (
      this.state.currentElement && this.state.currentElement.published_samples
      && this.state.currentElement.published_samples.length > 0 &&
      this.state.currentElement.published_samples[0].published_at
    )));

    const listClass = (showSearch && isPubElement) ? 'public-list-adv' : 'public-list';

    const elementList = () => {
      switch (listType) {
        case 'reaction':
          return (reactions || []).map(r => renderReaction(r, currentElement));
        case 'sample':
          return (molecules || []).map(m => this.renderMolecule(m));
        case 'scheme':
          return (reactions || []).map(r => renderReaction(r, currentElement));
        default:
          return (reactions || []).map(r => renderReaction(r, currentElement));
      }
    };

    return (
      <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
        <Col md={isPubElement === true ? 4 : 12} >
          <Navbar fluid className="navbar-custom" style={{ marginBottom: '0px' }}>
            <Nav navbar className="navbar-form" style={{ marginTop: '5px', marginBottom: 'unset', paddingLeft: 'unset' }} pullLeft>
              {this.renderSearch()}
            </Nav>
            <Nav navbar className="navbar-form" style={{ marginTop: '5px', marginBottom: 'unset', paddingLeft: 'unset' }} pullLeft>
              {this.renderAdvancedSearch()}
            </Nav>
            <Nav navbar className="navbar-form" style={{ marginTop: '5px', marginBottom: 'unset' }} pullRight>
              {this.renderSwitch()}
            </Nav>
          </Navbar>

          <div className={listClass} style={{ backgroundColor: '#f5f5f5' }} >
            <Table className="sample-entries">
              <tbody>
                {elementList()}
              </tbody>
            </Table>
          </div>
          <div className="list-container-bottom">
            <Row>
              <Col sm={8}>{this.pagination()}</Col>
              <Col sm={4}>{this.perPageInput()}</Col>
            </Row>
          </div>
        </Col>
        <Col
          md={isPubElement === true}
          // style={this.state.currentElement ? {} : { display: 'none' }}
        >
          <div className="public-element">
            <RepoElementDetails />
          </div>
        </Col>
      </Row>
    );
  }
}
