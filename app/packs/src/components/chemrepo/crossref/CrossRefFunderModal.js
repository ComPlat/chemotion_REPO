import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  FormGroup,
  FormControl,
  ControlLabel,
  Alert,
  Well,
  Row,
  Col,
  Table,
} from 'react-bootstrap';
import CrossRefFunderFetcher from 'src/fetchers/CrossRefFunderFetcher';

/**
 * CrossRefFunder Modal Component
 *
 * A reusable component that provides a modal interface for searching and selecting funders
 * from the CrossRef API. Features include:
 * - Search with minimum 3 character requirement
 * - Bootstrap table display with pagination
 * - Selection capability with callback to parent
 * - Caching of API responses (5 minutes)
 * - Error handling and loading states
 */
class CrossRefFunderModal extends Component {
  static formatAltNames(altNames) {
    if (!altNames || altNames.length === 0) {
      return 'N/A';
    }
    if (altNames.length <= 3) {
      return altNames.join(', ');
    }
    return `${altNames.slice(0, 3).join(', ')} (+${altNames.length - 3} more)`;
  }

  constructor(props) {
    super(props);
    this.state = {
      show: false,
      searchText: '',
      funders: [],
      loading: false,
      error: null,
      currentPage: 0,
      totalResults: 0,
      selectedFunderId: null,
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
  }

  handleShow() {
    this.setState({ show: true });
  }

  handleClose() {
    this.setState({
      show: false,
      searchText: '',
      funders: [],
      loading: false,
      error: null,
      currentPage: 0,
      totalResults: 0,
      selectedFunderId: null,
      sortField: null,
      sortDirection: 'asc',
      hasSearched: false,
    });
  }

  handleSearchChange(e) {
    this.setState({ searchText: e.target.value, error: null });
  }

  async handleSearch() {
    const { searchText, currentPage } = this.state;

    if (searchText.length < 3) {
      this.setState({
        error: 'Please enter at least 3 characters to search.',
      });
      return;
    }

    this.setState({ loading: true, error: null });

    try {
      const offset = currentPage * 20;
      const response = await CrossRefFunderFetcher.searchFunders(
        searchText,
        offset,
        20
      );

      this.setState({
        funders: response.items,
        totalResults: response.totalResults,
        loading: false,
        error: null,
        selectedFunderId: null,
        hasSearched: true,
      });
    } catch (error) {
      console.error('Search error:', error);
      this.setState({
        loading: false,
        error: 'Failed to search funders. Please try again.',
      });
    }
  }

  handleRowSelect(funder) {
    this.setState({
      selectedFunderId: funder.id,
    });
  }

  handlePageChange(page) {
    this.setState({ currentPage: page - 1 }, () => {
      this.handleSearch();
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

  async handleSelectAndReturn() {
    const selectedFunder = this.getSelectedFunder();
    const { onSelect, elementType, elementId, autoStore } = this.props;

    if (!selectedFunder) return;

    try {
      // Auto-store to database if elementType and elementId are provided
      if (autoStore && elementType && elementId) {
        this.setState({ loading: true });

        await CrossRefFunderFetcher.storeFunderForElement(
          elementType,
          elementId,
          selectedFunder
        );
      }

      // Call the parent callback
      if (onSelect) {
        onSelect(selectedFunder);
      }

      this.handleClose();
    } catch (error) {
      console.error('Error storing funder data:', error);
      this.setState({
        loading: false,
        error: `Failed to store funder data: ${error.message}`,
      });
    }
  }

  getSelectedFunder() {
    const { funders, selectedFunderId } = this.state;
    return funders.find(funder => funder.id === selectedFunderId) || null;
  }

  getSortedFunders() {
    const { funders, sortField, sortDirection } = this.state;

    if (!sortField) {
      return funders;
    }

    return [...funders].sort((a, b) => {
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

  renderSortIcon(field) {
    const { sortField, sortDirection } = this.state;
    if (sortField !== field) {
      return <span style={{ opacity: 0.3 }}> ↕</span>;
    }
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  render() {
    const { buttonText, title, onSelect, readOnly } = this.props;
    const {
      show,
      searchText,
      loading,
      error,
      currentPage,
      totalResults,
      selectedFunderId,
      hasSearched,
    } = this.state;

    const pageSize = 20;
    const totalPages = Math.ceil(totalResults / pageSize);
    const selectedFunder = this.getSelectedFunder();
    const sortedFunders = this.getSortedFunders();

    return (
      <div>
        <Button onClick={this.handleShow} bsStyle="primary" disabled={readOnly}>
          {buttonText}
        </Button>

        <Modal show={show} onHide={this.handleClose} bsSize="large">
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row>
              <Col md={12}>
                <FormGroup>
                  <ControlLabel>Search Funders</ControlLabel>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <FormControl
                      type="text"
                      placeholder="Enter funder name (minimum 3 characters)"
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
                    No funders found. Try different search terms or check your
                    spelling.
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

                {sortedFunders.length > 0 && (
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
                          <th>URI</th>
                          <th>Alt Names</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFunders.map(funder => (
                          <tr
                            key={funder.id}
                            style={{
                              backgroundColor:
                                selectedFunderId === funder.id
                                  ? '#d9edf7'
                                  : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() => this.handleRowSelect(funder)}
                          >
                            <td
                              style={{
                                fontSize: '12px',
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {funder.id}
                            </td>
                            <td>{funder.location}</td>
                            <td
                              style={{
                                fontWeight:
                                  selectedFunderId === funder.id
                                    ? 'bold'
                                    : 'normal',
                              }}
                            >
                              {funder.name}
                            </td>
                            <td
                              style={{
                                fontSize: '12px',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              <a
                                href={funder.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                              >
                                {funder.uri}
                              </a>
                            </td>
                            <td
                              style={{
                                fontSize: '12px',
                                maxWidth: '250px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {CrossRefFunderModal.formatAltNames(
                                funder.altNames
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

                {selectedFunder && (
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
                        <strong>ID:</strong> {selectedFunder.id}
                      </div>
                      {onSelect && (
                        <Button
                          bsStyle="success"
                          bsSize="small"
                          onClick={() => this.handleSelectAndReturn()}
                        >
                          Confirm Selection
                        </Button>
                      )}
                    </div>
                    <p>
                      <strong>Name:</strong> {selectedFunder.name}
                    </p>
                    <p>
                      <strong>Location:</strong> {selectedFunder.location}
                    </p>
                    <p>
                      <strong>URI:</strong>{' '}
                      <a
                        href={selectedFunder.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedFunder.uri}
                      </a>
                    </p>
                    {selectedFunder.altNames &&
                      selectedFunder.altNames.length > 0 && (
                        <p>
                          <strong>Alternative Names:</strong>{' '}
                          {selectedFunder.altNames.join(', ')}
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

CrossRefFunderModal.propTypes = {
  buttonText: PropTypes.string,
  title: PropTypes.string,
  onSelect: PropTypes.func,
  elementType: PropTypes.string,
  elementId: PropTypes.number,
  autoStore: PropTypes.bool,
  readOnly: PropTypes.bool,
};

CrossRefFunderModal.defaultProps = {
  buttonText: 'Search CrossRef Funders',
  title: 'CrossRef Funder Search',
  onSelect: null,
  elementType: null,
  elementId: null,
  autoStore: false,
  readOnly: false,
};

export default CrossRefFunderModal;
