import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  FormGroup,
  FormControl,
  ControlLabel,
  Table,
  Alert,
  Well,
  Row,
  Col,
} from 'react-bootstrap';
import RORFunderFetcher from 'src/fetchers/RORFunderFetcher';

export default class ROROrganizationModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false,
      searchText: '',
      organizations: [],
      loading: false,
      error: null,
      currentPage: 0,
      totalResults: 0,
      selectedOrganizationId: null,
      sortField: null,
      sortDirection: 'asc',
      hasSearched: false,
    };

    this.handleShow = this.handleShow.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleRowSelect = this.handleRowSelect.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleSelectAndReturn = this.handleSelectAndReturn.bind(this);
  }

  handleShow() {
    this.setState({ show: true });
  }

  handleClose() {
    this.setState({
      show: false,
      searchText: '',
      organizations: [],
      error: null,
      currentPage: 0,
      totalResults: 0,
      selectedOrganizationId: null,
      sortField: null,
      sortDirection: 'asc',
      hasSearched: false,
    });
  }

  handleSearchChange(event) {
    this.setState({ searchText: event.target.value, error: null });
  }

  handleSearch() {
    const { searchText, currentPage } = this.state;

    if (!searchText || searchText.length < 3) {
      this.setState({
        error: 'Please enter at least 3 characters to search',
      });
      return;
    }

    this.performSearch(searchText, currentPage);
  }

  handleRowSelect(organization) {
    this.setState({
      selectedOrganizationId: organization.id,
    });
  }

  handlePageChange(page) {
    const { searchText } = this.state;
    this.setState({ currentPage: page - 1 }, () => {
      this.performSearch(searchText, page - 1);
    });
  }

  handleSort(field) {
    const { sortField, sortDirection } = this.state;
    const newDirection =
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';

    this.setState({
      sortField: field,
      sortDirection: newDirection,
    });
  }

  handleSelectAndReturn() {
    const selectedOrganization = this.getSelectedOrganization();
    const { onSelect } = this.props;

    if (!selectedOrganization) return;

    if (onSelect) {
      onSelect(selectedOrganization);
    }

    this.handleClose();
  }

  getSelectedOrganization() {
    const { organizations, selectedOrganizationId } = this.state;
    return organizations.find(org => org.id === selectedOrganizationId) || null;
  }

  getSortedOrganizations() {
    const { organizations, sortField, sortDirection } = this.state;

    if (!sortField) {
      return organizations;
    }

    return [...organizations].sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  performSearch(query, page) {
    this.setState({ loading: true, error: null });

    RORFunderFetcher.searchOrganizations(query, page + 1)
      .then(response => {
        this.setState({
          organizations: response.items || [],
          currentPage: page,
          totalResults: response.totalResults,
          loading: false,
          selectedOrganizationId: null,
          hasSearched: true,
        });
      })
      .catch(error => {
        console.error('Error searching ROR organizations:', error);
        this.setState({
          error: `Failed to search organizations: ${error.message}`,
          loading: false,
        });
      });
  }

  renderSortIcon(field) {
    const { sortField, sortDirection } = this.state;
    if (sortField !== field) {
      return <span style={{ opacity: 0.3 }}> ↕</span>;
    }
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  render() {
    const { buttonText, title, readOnly } = this.props;
    const {
      show,
      searchText,
      loading,
      error,
      currentPage,
      totalResults,
      selectedOrganizationId,
      hasSearched,
    } = this.state;

    const pageSize = 20;
    const totalPages = Math.ceil(totalResults / pageSize);
    const selectedOrganization = this.getSelectedOrganization();
    const sortedOrganizations = this.getSortedOrganizations();

    return (
      <div>
        <Button onClick={this.handleShow} bsStyle="primary" disabled={readOnly}>
          {buttonText}
          <img
            src="/images/ror-icon-rgb.svg"
            alt="ROR"
            style={{
              height: '1em',
              marginLeft: '5px',
              verticalAlign: 'text-top',
            }}
          />
        </Button>

        <Modal show={show} onHide={this.handleClose} bsSize="large">
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row>
              <Col md={12}>
                <FormGroup>
                  <ControlLabel>Search Organizations</ControlLabel>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <FormControl
                      type="text"
                      placeholder="Enter organization name (minimum 3 characters)"
                      value={searchText}
                      onChange={this.handleSearchChange}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          this.handleSearch();
                        }
                      }}
                    />
                    <Button
                      bsStyle="primary"
                      onClick={this.handleSearch}
                      disabled={loading || searchText.length < 3}
                    >
                      {loading ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                </FormGroup>

                {error && <Alert bsStyle="danger">{error}</Alert>}

                {totalResults === 0 && !loading && hasSearched && (
                  <Alert bsStyle="info">
                    No organizations found for &ldquo;{searchText}&rdquo;. Try
                    different search terms or check your spelling.
                  </Alert>
                )}

                {totalResults > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <small>
                      {`Found ${totalResults} results. Showing page ${
                        currentPage + 1
                      } of ${totalPages}`}
                    </small>
                  </div>
                )}

                {sortedOrganizations.length > 0 && (
                  <div
                    style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      border: '1px solid #ddd',
                    }}
                  >
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => this.handleSort('id')}
                          >
                            ID{this.renderSortIcon('id')}
                          </th>
                          <th
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => this.handleSort('location')}
                          >
                            Location{this.renderSortIcon('location')}
                          </th>
                          <th
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => this.handleSort('name')}
                          >
                            Name{this.renderSortIcon('name')}
                          </th>
                          {/* <th
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => this.handleSort('country')}
                          >
                            Country{this.renderSortIcon('country')}
                          </th> */}
                          <th>Types</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOrganizations.map(org => (
                          <tr
                            key={org.id}
                            style={{
                              backgroundColor:
                                selectedOrganizationId === org.id
                                  ? '#d9edf7'
                                  : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() => this.handleRowSelect(org)}
                          >
                            <td
                              style={{
                                fontSize: '12px',
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {org.id}
                            </td>
                            <td>{org.location}</td>
                            <td
                              style={{
                                fontWeight:
                                  selectedOrganizationId === org.id
                                    ? 'bold'
                                    : 'normal',
                              }}
                            >
                              <strong>{org.name}</strong>
                              {org.established && (
                                <div
                                  style={{ fontSize: '0.9em', color: '#666' }}
                                >
                                  Established: {org.established}
                                </div>
                              )}
                            </td>
                            {/* <td>{org.country}</td> */}
                            <td
                              style={{
                                fontSize: '12px',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {org.types && org.types.length > 0 ? (
                                <div>
                                  {org.types.map(type => (
                                    <span
                                      key={`${org.id}-${type}`}
                                      style={{
                                        fontSize: '0.8em',
                                        backgroundColor: '#f0f0f0',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        marginRight: '4px',
                                        display: 'inline-block',
                                        marginBottom: '2px',
                                      }}
                                    >
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}

                {totalPages > 1 && (
                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <div className="pagination-wrapper">
                      <Button
                        bsSize="small"
                        disabled={currentPage === 0}
                        onClick={() => this.handlePageChange(1)}
                        style={{ marginRight: '5px' }}
                      >
                        First
                      </Button>
                      <Button
                        bsSize="small"
                        disabled={currentPage === 0}
                        onClick={() => this.handlePageChange(currentPage)}
                        style={{ marginRight: '5px' }}
                      >
                        Prev
                      </Button>

                      <span style={{ margin: '0 10px', lineHeight: '30px' }}>
                        Page {currentPage + 1} of {totalPages}
                      </span>

                      <Button
                        bsSize="small"
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => this.handlePageChange(currentPage + 2)}
                        style={{ marginLeft: '5px', marginRight: '5px' }}
                      >
                        Next
                      </Button>
                      <Button
                        bsSize="small"
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => this.handlePageChange(totalPages)}
                        style={{ marginLeft: '5px' }}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                )}

                {selectedOrganization && (
                  <Well style={{ marginTop: '15px', marginBottom: '0' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      <div>
                        <strong>ID:</strong> {selectedOrganization.id}
                      </div>
                      <Button
                        bsStyle="success"
                        bsSize="small"
                        onClick={() => this.handleSelectAndReturn()}
                      >
                        Confirm Selection
                      </Button>
                    </div>
                    <p>
                      <strong>Name:</strong> {selectedOrganization.name}
                    </p>
                    <p>
                      <strong>Location:</strong> {selectedOrganization.location}
                    </p>
                    <p>
                      <strong>Country:</strong> {selectedOrganization.country}
                    </p>
                    {selectedOrganization.uri && (
                      <p>
                        <strong>URI:</strong>{' '}
                        <a
                          href={selectedOrganization.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedOrganization.uri}
                        </a>
                      </p>
                    )}
                    {selectedOrganization.types &&
                      selectedOrganization.types.length > 0 && (
                        <p>
                          <strong>Types:</strong>{' '}
                          {selectedOrganization.types.join(', ')}
                        </p>
                      )}
                    {selectedOrganization.established && (
                      <p>
                        <strong>Established:</strong>{' '}
                        {selectedOrganization.established}
                      </p>
                    )}
                  </Well>
                )}
              </Col>
            </Row>
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

ROROrganizationModal.propTypes = {
  buttonText: PropTypes.string,
  title: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
};

ROROrganizationModal.defaultProps = {
  buttonText: 'Search ROR Organizations',
  title: 'ROR Organization Search',
  readOnly: false,
};
