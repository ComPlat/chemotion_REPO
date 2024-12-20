import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel,
  FormGroup,
  ControlLabel,
  FormControl,
  Button,
  Alert,
  Row,
  Col,
} from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { observer } from 'mobx-react';
import { RepoStoreContext } from 'src/stores/RepoRootStore';
import CrossRefFunderModal from 'src/components/chemrepo/crossref/CrossRefFunderModal';
import ROROrganizationModal from 'src/components/chemrepo/ror/ROROrganizationModal';

const FUNDING_TYPES = {
  CrossRef: 'Crossref Funder ID',
  ROR: 'ROR',
  Other: 'Other',
};

const INITIAL_INPUTS = {
  fundingType: 'CrossRef',
  funderIdentifier: '',
  funderName: '',
  awardNumber: '',
  awardTitle: '',
  awardUri: '',
  addingFunding: false,
};

const UriCellRenderer = ({ value }) => {
  if (value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </a>
    );
  }
  return '';
};

UriCellRenderer.propTypes = {
  value: PropTypes.string,
};

UriCellRenderer.defaultProps = {
  value: '',
};

const ActionsCellRenderer = ({ context, data }) => {
  const handleClick = () => {
    if (context && context.handleRemoveFunding) {
      context.handleRemoveFunding(data);
    }
  };

  return (
    <Button bsStyle="danger" bsSize="xsmall" onClick={handleClick}>
      <i className="fa fa-trash-o" />
    </Button>
  );
};

ActionsCellRenderer.propTypes = {
  context: PropTypes.shape({
    handleRemoveFunding: PropTypes.func,
  }),
  data: PropTypes.shape({}),
};

ActionsCellRenderer.defaultProps = {
  context: null,
  data: null,
};

const FundingTypeFormatter = params =>
  FUNDING_TYPES[params.value] || params.value;

class FundingReferences extends Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_INPUTS };
    this.handleTypeChange = this.handleTypeChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleAddFunding = this.handleAddFunding.bind(this);
    this.handleCrossRefSelect = this.handleCrossRefSelect.bind(this);
    this.handleRORSelect = this.handleRORSelect.bind(this);
    this.handleRemoveFunding = this.handleRemoveFunding.bind(this);
    this.clearInputs = this.clearInputs.bind(this);

    this.columnDefs = [
      {
        headerName: 'Type',
        field: 'funderIdentifierType',
        width: 100,
        valueFormatter: FundingTypeFormatter,
      },
      {
        headerName: 'Organization Identifier',
        field: 'funderIdentifier',
        flex: 1,
      },
      {
        headerName: 'Organization Name',
        field: 'funderName',
        flex: 1,
      },
      {
        headerName: 'Award Number',
        field: 'awardNumber',
        flex: 1,
      },
      {
        headerName: 'Award Title',
        field: 'awardTitle',
        flex: 1,
      },
      {
        headerName: 'Award URI',
        field: 'awardUri',
        flex: 1,
        cellRenderer: UriCellRenderer,
        filter: false,
      },
      {
        hide: props.readOnly,
        width: 50,
        cellRenderer: ActionsCellRenderer,
        filter: false,
      },
    ];
  }

  componentDidMount() {
    const { elementType, elementId, isNew } = this.props;
    const { fundingStore } = this.context;
    if (!isNew) {
      fundingStore.loadFundings(elementType, elementId);
    }
  }

  handleTypeChange(event) {
    const fundingType = event.target.value;
    this.setState({ fundingType });

    // Clear manual inputs when switching to CrossRef or ROR
    if (fundingType === 'CrossRef' || fundingType === 'ROR') {
      this.setState({
        funderIdentifier: '',
        funderName: '',
      });
    }
  }

  handleInputChange(field, event) {
    this.setState({
      [field]: event.target.value,
    });
  }

  handleCrossRefSelect(funder) {
    // Map the CrossRef funder data to the form fields
    this.setState({
      funderIdentifier: funder.uri || funder.id || '',
      funderName: funder.name || '',
    });
  }

  handleRORSelect(organization) {
    // Map the ROR organization data to the form fields
    this.setState({
      funderIdentifier: organization.uri || organization.id || '',
      funderName: organization.name || '',
    });
  }

  async handleAddFunding() {
    const { elementType, elementId } = this.props;
    const { fundingStore } = this.context;
    const {
      fundingType,
      funderIdentifier,
      funderName,
      awardNumber,
      awardTitle,
      awardUri,
    } = this.state;

    // Validate that organization name is provided
    if (!funderName.trim()) {
      fundingStore.setError('Organization name is required');
      return;
    }

    // Create funding data for all types (CrossRef, ROR, Other)
    const fundingData = {
      name: funderName,
      uri: funderIdentifier || '',
      awardUri,
      awardTitle,
      awardNumber,
      fundingType, // Include funding type in stored data
    };

    this.setState({ addingFunding: true });
    await fundingStore.addFunding(elementType, elementId, fundingData);
    this.clearInputs();
    this.setState({ addingFunding: false });
  }

  async handleRemoveFunding(funding) {
    const { fundingStore } = this.context;
    if (!funding || !funding.fundingId) {
      fundingStore.setError('Invalid funding data for removal');
      return;
    }
    const { elementType, elementId } = this.props;
    await fundingStore.removeFunding(elementType, elementId, funding.fundingId);
  }

  clearInputs() {
    const { fundingStore } = this.context;
    this.setState({ ...INITIAL_INPUTS });
    fundingStore.clearError();
  }

  render() {
    const { fundingStore } = this.context;
    const { readOnly, elementType, elementId } = this.props;
    const {
      fundingType,
      funderIdentifier,
      funderName,
      awardNumber,
      awardTitle,
      awardUri,
      addingFunding,
    } = this.state;
    const { fundings, loading, error } = fundingStore;
    const isManualEntry = fundingType === 'Other';
    const fundingKey = `${elementType}_${elementId}`;
    const currentFundings = fundings.get ? fundings.get(fundingKey) || [] : [];
    return (
      <Panel>
        <Panel.Body>
          {error && (
            <Alert bsStyle="danger" onDismiss={() => fundingStore.clearError()}>
              {error}
            </Alert>
          )}

          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <h4>Add Funding Information</h4>
            <Row>
              <Col md={12}>
                <FormGroup>
                  <ControlLabel>Funding Type & Search</ControlLabel>
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div style={{ flex: '0 0 200px' }}>
                      <FormControl
                        disabled={readOnly}
                        componentClass="select"
                        value={fundingType}
                        onChange={this.handleTypeChange}
                      >
                        {Object.keys(FUNDING_TYPES).map(key => (
                          <option key={key} value={key}>
                            {FUNDING_TYPES[key]}
                          </option>
                        ))}
                      </FormControl>
                    </div>
                    <div>
                      {fundingType === 'CrossRef' && (
                        <CrossRefFunderModal
                          onSelect={this.handleCrossRefSelect}
                          buttonText="Search Crossref (Open Funder Registry)"
                          readOnly={readOnly}
                        />
                      )}
                      {fundingType === 'ROR' && (
                        <ROROrganizationModal
                          onSelect={this.handleRORSelect}
                          buttonText="Search ROR (Research Organizations)"
                          readOnly={readOnly}
                        />
                      )}
                      {fundingType === 'Other' && (
                        <span
                          style={{
                            color: '#666',
                            fontStyle: 'italic',
                            lineHeight: '34px',
                            display: 'inline-block',
                          }}
                        >
                          Manual entry - fill in the fields below
                        </span>
                      )}
                    </div>
                  </div>
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <ControlLabel>Organization Identifier</ControlLabel>
                  <FormControl
                    type="text"
                    value={funderIdentifier}
                    onChange={e =>
                      this.handleInputChange('funderIdentifier', e)
                    }
                    placeholder="Enter organization identifier (optional)"
                    disabled={!isManualEntry}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <ControlLabel>
                    Organization Name <span style={{ color: 'red' }}>*</span>
                  </ControlLabel>
                  <FormControl
                    type="text"
                    value={funderName}
                    onChange={e => this.handleInputChange('funderName', e)}
                    placeholder="Enter organization name"
                    required
                    disabled={!isManualEntry}
                  />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <FormGroup>
                  <ControlLabel>Award Number</ControlLabel>
                  <FormControl
                    type="text"
                    value={awardNumber}
                    onChange={e => this.handleInputChange('awardNumber', e)}
                    placeholder="Enter award number"
                    disabled={readOnly}
                  />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <ControlLabel>Award Title</ControlLabel>
                  <FormControl
                    type="text"
                    value={awardTitle}
                    onChange={e => this.handleInputChange('awardTitle', e)}
                    placeholder="Enter award title"
                    disabled={readOnly}
                  />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <ControlLabel>Award URI</ControlLabel>
                  <FormControl
                    type="text"
                    value={awardUri}
                    onChange={e => this.handleInputChange('awardUri', e)}
                    placeholder="Enter award URI"
                    disabled={readOnly}
                  />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span
                    style={{
                      color: '#2e6da4',
                      fontStyle: 'italic',
                      marginRight: '10px',
                    }}
                  >
                    * Note: Funding information under embargo will automatically
                    apply to all corresponding reactions and samples.
                  </span>
                  <Button
                    bsStyle="success"
                    onClick={this.handleAddFunding}
                    disabled={readOnly || addingFunding || !funderName.trim()}
                    style={{ marginRight: '10px' }}
                  >
                    {addingFunding ? 'Adding...' : 'Add Funding Reference'}
                  </Button>
                  <Button
                    bsStyle="default"
                    disabled={readOnly}
                    onClick={this.clearInputs}
                  >
                    Clear
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          <div>
            <h4>Current Funding References</h4>
            {loading && <div>Loading...</div>}
            {(!currentFundings || currentFundings.length === 0) && !loading ? (
              <Alert bsStyle="info">No funding references found.</Alert>
            ) : (
              <div
                className="ag-theme-alpine"
                style={{
                  height: 'calc(100vh - 580px)',
                  width: '100%',
                  marginTop: '15px',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                }}
              >
                <AgGridReact
                  rowData={currentFundings.slice()}
                  columnDefs={this.columnDefs}
                  defaultColDef={{
                    filter: true,
                    sortable: false,
                    resizable: true,
                    suppressMovable: true,
                  }}
                  getRowId={params => String(params.data.fundingId)}
                  deltaRowDataMode
                  onGridReady={() => {}}
                  context={{ handleRemoveFunding: this.handleRemoveFunding }}
                  headerHeight={40}
                  rowHeight={35}
                  animateRows
                  enableCellTextSelection
                  // domLayout="autoHeight"
                />
              </div>
            )}
          </div>
        </Panel.Body>
      </Panel>
    );
  }
}
FundingReferences.contextType = RepoStoreContext;

FundingReferences.propTypes = {
  elementId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  elementType: PropTypes.string.isRequired, // 'Reaction' or 'Sample' or 'Collection'
  isNew: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool.isRequired,
};

export default observer(FundingReferences);
