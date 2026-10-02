import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  Form,
  Button,
  Alert,
  Row,
  Col,
} from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { observer } from 'mobx-react';
import { RepoStoreContext } from 'src/repo/stores/RepoRootStore';
import CrossRefFunderModal from 'src/repo/chemrepo/crossref/CrossRefFunderModal';
import ROROrganizationModal from 'src/repo/chemrepo/ror/ROROrganizationModal';

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
    <Button variant="danger" size="sm" onClick={handleClick}>
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
      <Card>
        <Card.Body>
          {error && (
            <Alert variant="danger" onDismiss={() => fundingStore.clearError()}>
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
                <Form.Group>
                  <Form.Label>Funding Type & Search</Form.Label>
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div style={{ flex: '0 0 200px' }}>
                      <Form.Select
                        disabled={readOnly}
                        value={fundingType}
                        onChange={this.handleTypeChange}
                      >
                        {Object.keys(FUNDING_TYPES).map(key => (
                          <option key={key} value={key}>
                            {FUNDING_TYPES[key]}
                          </option>
                        ))}
                      </Form.Select>
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
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Organization Identifier</Form.Label>
                  <Form.Control
                    type="text"
                    value={funderIdentifier}
                    onChange={e =>
                      this.handleInputChange('funderIdentifier', e)
                    }
                    placeholder="Enter organization identifier (optional)"
                    disabled={!isManualEntry}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Organization Name <span style={{ color: 'red' }}>*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={funderName}
                    onChange={e => this.handleInputChange('funderName', e)}
                    placeholder="Enter organization name"
                    required
                    disabled={!isManualEntry}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Award Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={awardNumber}
                    onChange={e => this.handleInputChange('awardNumber', e)}
                    placeholder="Enter award number"
                    disabled={readOnly}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Award Title</Form.Label>
                  <Form.Control
                    type="text"
                    value={awardTitle}
                    onChange={e => this.handleInputChange('awardTitle', e)}
                    placeholder="Enter award title"
                    disabled={readOnly}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Award URI</Form.Label>
                  <Form.Control
                    type="text"
                    value={awardUri}
                    onChange={e => this.handleInputChange('awardUri', e)}
                    placeholder="Enter award URI"
                    disabled={readOnly}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <div className="d-flex align-items-center justify-content-end mt-2">
                  <Alert
                    variant="warning"
                    className="mb-0 py-1 px-2 small me-1"
                  >
                    Note: Funding information under embargo will automatically
                    apply to all corresponding reactions and samples.
                  </Alert>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={this.handleAddFunding}
                    disabled={readOnly || addingFunding || !funderName.trim()}
                    className="me-1"
                  >
                    {addingFunding ? 'Adding...' : 'Add Funding Reference'}
                  </Button>
                  <Button
                    size="sm"
                    variant="warning"
                    disabled={readOnly}
                    onClick={this.clearInputs}
                  >
                    Reset inputs
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          <div>
            <h4>Current Funding References</h4>
            {loading && <div>Loading...</div>}
            {(!currentFundings || currentFundings.length === 0) && !loading ? (
              <Alert variant="info">No funding references found.</Alert>
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
                />
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
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
