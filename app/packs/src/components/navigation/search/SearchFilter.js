import React from 'react'
import {Button, FormControl, ButtonGroup, OverlayTrigger, Tooltip} from 'react-bootstrap'
import Select from 'react-select'
import UIActions from 'src/stores/alt/actions/UIActions';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';

export default class SearchFilter extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      showFilters: props.show,
      advValue: null,
      advType: 'Authors',
      filters: [
        {
          link: '',
          match: '=', // to set default search type for adv search, allows users to search better!
          field: {
            table: 'samples',
            column: 'name',
            label: 'Sample Name',
          },
          value: '',
        },
      ],
    };

    this.listOptions = [
      {
        value: {
          table: 'samples',
          column: 'name',
          label: 'Sample Name'
        },
        label: 'Sample Name'
      },
      {
        value: {
          table: 'samples',
          column: 'short_label',
          label: 'Sample Short Label'
        },
        label: 'Sample Short Label'
      },
      {
        value: {
          table: 'samples',
          column: 'external_label',
          label: 'Sample External Label'
        },
        label: 'Sample External Label'
      },
      {
        value: {
          table: 'samples',
          column: 'xref',
          opt: 'cas',
          label: 'CAS'
        },
        label: 'CAS'
      }
    ];



    this.andOrOps = [
      { value: "AND", label: "AND" },
      { value: "OR", label: "OR" }
    ]

    this.matchOps = [
      { value: "=", label: "EXACT" },
      { value: "LIKE", label: "LIKE (substring)" },
      { value: "ILIKE", label: "LIKE (case insensitive substring)" },
      { value: "NOT LIKE", label: "NOT LIKE (substring)" },
      { value: "NOT ILIKE", label: "NOT LIKE (case insensitive substring)" }
    ]

    this.search = this.search.bind(this)
    this.showFilters = this.showFilters.bind(this)
    this.renderField = this.renderField.bind(this)
    this.handleUpdateFilters = this.handleUpdateFilters.bind(this)
    this.handleSelectAdvType = this.handleSelectAdvType.bind(this);
    this.loadAdvValuesByName = this.loadAdvValuesByName.bind(this);
    this.handleSelectAdvValue = this.handleSelectAdvValue.bind(this);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({showFilters: nextProps.show})
  }

  showFilters(bool) {
    let show = !this.state.showFilters
    if (typeof(bool) == "boolean") {
      show = bool
      UIActions.toggleAdvancedSearch(bool)
    }

    this.setState({ showFilters: show })
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

  handleSelectAdvType(val) {
    if (val) { this.setState({ advType: val, advValue: null }); }
  }

  handleSelectAdvValue(val) {
    if (val) {
      this.setState({ advValue: val });
    }
  }

  handleUpdateFilters(idx, field, val) {
    const { filters } = this.state;

    filters[idx][field] = val;

    const filter = filters[filters.length - 1];
    const check = (filter.field && filter.value && filter.link) ||
                (idx == 0 && filter.field && filter.value);

    if (check) {
      filters.push({ link: 'OR', match: 'EXACT', field: '', value: '' });
    }

    this.setState(filters);
  }

  search() {
    let { filters, advType, advValue } = this.state;

    // Remove invalid filter
    filters = filters.filter((f, id) => {
      return (f.field && f.link && f.value) ||
        (id == 0 && f.field && f.value)
    })

    const advValIds = (advValue && advValue.map(val => (val.value))) || null;
    this.setState({
      showFilters: false,
    }, this.props.searchFunc(filters, { type: advType, value: advValIds }));
  }

  renderField(val) {
    return (val.label)
  }

  renderDynamicRow() {
    let {filters} = this.state

    let dynamicRow = ( <span /> )

    if (filters.length > 1) {
      let addedFilters = filters.filter((val, idx) => idx > 0)

      dynamicRow = addedFilters.map((filter, idx) => {
        let id = idx + 1
        return (
          <div key={"filter_" + idx} className="adv-search-row">
            <span className="link-select">
              <Select simpleValue options={this.andOrOps}
                value={filter.link} clearable={false}
                onChange={(val) => this.handleUpdateFilters(id, "link", val)} />
            </span>
            <span className="match-select">
              <Select simpleValue options={this.matchOps}
                value={filter.match} clearable={false}
                onChange={(val) => this.handleUpdateFilters(id, "match", val)} />
            </span>
            <span className="field-select">
              <Select simpleValue options={this.listOptions} clearable={false}
                placeholder="Select search field" value={filter.field}
                onChange={(val) => this.handleUpdateFilters(id, "field", val)} />
            </span>
            <FormControl type="text" value={filters.value}
              componentClass="textarea" rows={2}
              className="value-select" placeholder="Search value"
              onChange={(e) => this.handleUpdateFilters(id, "value", e.target.value)}
            />
          </div>
        )
      })

    }

    return dynamicRow
  }


  renderAdvancedSearch() {
    const { showFilters, advType, advValue } = this.state;
    if (showFilters === true) {
      this.listAdvOptions = [
        {
          value: 'Authors',
          label: 'by authors',
        },
        {
          value: 'Contributors',
          label: 'by contributors',
        }
      ];
      return (
        <div className="adv-search-row">
          <span style={{ flex: '0 0 127px' }} />
          <span className="match-select">
            <Select
              simpleValue
              searchable={false}
              options={this.listAdvOptions}
              placeholder="Select search field"
              clearable={false}
              valueKey="value"
              labelKey="label"
              onChange={this.handleSelectAdvType}
              defaultValue="Authors"
              value={advType}
              className="o-author"
            />
          </span>
          <span className="field-select-full">
            <Select.Async
              multi
              isLoading
              backspaceRemoves
              value={advValue}
              valueKey="value"
              labelKey="label"
              loadOptions={this.loadAdvValuesByName}
              onChange={this.handleSelectAdvValue}
              className="o-name"
            />
          </span>
        </div>
      );
    }
    return (<div />);
  }

  render() {
    let {showFilters, currentOption, filters} = this.state
    if (!showFilters) return (<span />)

    return (
      <div className="advanced-search">
        <div>
          <div className="adv-search-row">
            <span style={{flex: "0 0 127px"}} />
            <span className="match-select">
              <Select simpleValue searchable={false} options={this.matchOps}
                placeholder="Select search type" clearable={false}
                value={filters[0].match}
                onChange={(val) => this.handleUpdateFilters(0, "match", val)} />
            </span>
            <span className="field-select">
              <Select simpleValue searchable={false} options={this.listOptions}
                placeholder="Select search field" clearable={false}
                value={filters[0].field} valueRenderer={this.renderField}
                onChange={(val) => this.handleUpdateFilters(0, "field", val)} />
            </span>
            <FormControl type="text" value={filters[0].value}
              componentClass="textarea"
              className="value-select" placeholder="Search value"
              onChange={(e) => this.handleUpdateFilters(0, "value", e.target.value)}
            />
          </div>
          {this.renderDynamicRow()}
          {this.renderAdvancedSearch()}
        </div>
        <div className="footer">
          <Button bsStyle="primary" onClick={this.search}>
            Search
          </Button>
          <Button bsStyle="warning" onClick={() => this.showFilters(false)}>
            Close
          </Button>
        </div>
      </div>
    )
  }
}
