import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, OverlayTrigger, Tooltip, Modal, Button, Table, Panel, Form, FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import { findIndex, filter } from 'lodash';
import uuid from 'uuid';
import CreatableSelect from 'react-select/lib/Creatable';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';
import DeleteConfirmBtn from 'src/components/common/DeleteConfirmBtn';

// Styling for ROR icon
const rorIconStyles = {
  rorIconLink: {
    color: 'inherit',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  rorIcon: {
    height: '1em',
    marginLeft: '5px',
    verticalAlign: 'text-top',
  }
};

const sortList = data => data?.sort((a, b) => a?.name?.localeCompare(b.name));
const tooltips = {
  addUser: <Tooltip id="addUser_tooltip">Save to my collaboration</Tooltip>,
  removeAff: <Tooltip id="rmAff_tooltip">Remove this affiliation</Tooltip>,
  refreshOrcid: <Tooltip id="refreshOrcid_tooltip">Refresh affiliations from ORCID iD</Tooltip>,
  addAff: <Tooltip id="addAff_tooltip">Add new affiliation</Tooltip>,
};

// Component for ROR icon display
const RorIcon = ({ rorId }) => {
  if (!rorId) return null;

  return (
    <a
      href={`https://ror.org/${rorId}`}
      target="_blank"
      rel="noopener noreferrer"
      title="View in Research Organization Registry"
      style={rorIconStyles.rorIconLink}
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src="/images/ror-icon-rgb.svg"
        alt="ROR"
        style={rorIconStyles.rorIcon}
      />
    </a>
  );
};

RorIcon.propTypes = {
  rorId: PropTypes.string
};

export default class AuthorModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      countries: [],
      organizations: [],
      departments: [],
      authors: [],
      users: [],
      fields: {},
      showNewUser: false
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.findUsers = this.findUsers.bind(this);
    this.findOrcid = this.findOrcid.bind(this);
    this.handleAddUser = this.handleAddUser.bind(this);
    this.handleHide = this.handleHide.bind(this);
    this.onAddAff = this.onAddAff.bind(this);
    this.onDeleteAff = this.onDeleteAff.bind(this);
    this.onRefreshOrcidAff = this.onRefreshOrcidAff.bind(this);
  }

  componentDidMount() {
    CollaboratorFetcher.fetchMyCollaborations()
      .then((result) => {
        if (result.authors && result.authors.length > 0) {
          this.setState({ authors: sortList(result.authors) });
        } else {
          this.setState({
            authors: [], users: [], fields: {}, showNewUser: false
          });
        }
      });

    // Fetch country options
    PublicFetcher.affiliations('countries').then((result) => {
      const affOption = result?.map(a => ({ label: a, value: a }))
        .filter(a => a.value && a.value.length > 1);
      this.setState({ countries: affOption });
    });

    // Fetch organization options
    PublicFetcher.affiliations('organizations').then((result) => {
      const affOption = result?.map(a => ({ label: a, value: a }))
        .filter(a => a.value && a.value.length > 1);
      this.setState({ organizations: affOption });
    });

    // Fetch department options
    PublicFetcher.affiliations('departments').then((result) => {
      const affOption = result?.map(a => ({ label: a, value: a }))
        .filter(a => a.value && a.value.length > 1);
      this.setState({ departments: affOption });
    });
  }

  onAddAff(g) {
    const { authors, fields } = this.state;
    const department = fields[`${g.id}@line_department`];
    const organization = fields[`${g.id}@line_organization`];
    const country = fields[`${g.id}@line_country`];
    const params = {
      id: g.id, department, organization, country
    };
    CollaboratorFetcher.addCollaboratorAff(params)
      .then((result) => {
        if (result.error) {
          alert(result.error);
        } else {
          const idx = findIndex(authors, o => o.id === result.user.id);
          authors.splice(idx, 1, result.user);
          fields[`${g.id}@line_department`] = '';
          fields[`${g.id}@line_organization`] = '';
          fields[`${g.id}@line_country`] = '';
          this.setState({ authors, fields });
        }
      });
  }

  onDeleteAff(a, g) {
    const { authors } = this.state;
    const params = { user_id: g.id, aff_id: a.id };
    CollaboratorFetcher.deleteCollaboratorAff(params)
      .then((result) => {
        if (result.error) {
          alert(result.error);
        } else {
          const idx = findIndex(authors, o => o.id === result.user.id);
          authors.splice(idx, 1, result.user);
          this.setState({ authors });
        }
      });
  }

  onRefreshOrcidAff(g) {
    const params = { user_id: g.id };
    CollaboratorFetcher.refreshOrcidAff(params)
      .then((result) => {
        if (result.error) {
          alert(result.message);
        } else {
          this.setState({
            authors: sortList(result.authors), users: [], fields: {}, showNewUser: false
          });
        }
      });
  }

  handleHide() {
    this.setState({ users: [], fields: {}, showNewUser: false });
    this.props.onHide();
  }

  // inputs of create new group
  handleInputChange(type, ev) {
    let { fields } = this.state;
    fields = fields || {};

    if (typeof ev === 'object' && ev && 'value' in ev) {
      // Handle react-select value
      fields[type] = ev.value;
    } else if (ev && ev.currentTarget) {
      // Handle regular input value
      fields[type] = ev.currentTarget.value;
    } else if (ev === null) {
      // Handle clearing the field
      fields[type] = '';
    }

    this.setState({ fields });
  }

  findUsers() {
    const { fields } = this.state;
    if ((!fields.firstName || fields.firstName.trim() === '') &&
        (!fields.lastName || fields.lastName.trim() === '') &&
        (!fields.email || fields.email.trim() === '') &&
        (!fields.orcid || fields.orcid.trim() === '')) {
      alert('Please input Email or first name or last name');
      return false;
    }

    CollaboratorFetcher.fetchUsersByNameFirst(fields.lastName || '', fields.firstName || '', fields.email || '')
      .then((result) => {
        if (result.users && result.users.length > 0) {
          this.setState({
            users: sortList(result.users),
            showNewUser: false,
            fields: {}
          });
        } else {
          this.setState({ showNewUser: true, users: [] });
        }
      });
    return true;
  }

  findOrcid() {
    const { fields, departments, organizations } = this.state;
    if (!fields.orcid || fields.orcid.trim() === '') {
      alert('Please input ORCID iD');
      return false;
    }

    CollaboratorFetcher.fetchandAddCollaboratorByOrcid(fields.orcid)
      .then((result) => {
        if (result.error) {
          alert(`[${fields.orcid.trim()}] \n ${result.message}`);
          return false;
        }

        if (result.users) {
          const user = result.users || {};
          if (user.id !== null) {
            const users = [];
            users.push(result.users);
            this.setState({
              users,
              showNewUser: false,
              fields: {}
            });
          } else {
            fields.firstName = user.first_name;
            fields.lastName = user.last_name;
            fields.email = user.email;
            const aff = (user.affiliations && user.affiliations[0]) || {};

            fields.country = aff.country;
            if (typeof (organizations.find(x => x.value === aff.organization)) === 'undefined') {
              organizations.push({ label: aff.organization, value: aff.organization });
            }
            fields.organization = aff.organization;
            if (typeof (departments.find(x => x.value === aff.department)) === 'undefined') {
              departments.push({ label: aff.department, value: aff.department });
            }
            fields.department = aff.department;

            this.setState({
              showNewUser: true,
              fields,
              departments
            });
          }
        } else {
          this.setState({ showNewUser: true, users: [] });
        }
      });
    return true;
  }

  toggleGroupLead(collaborator) {
    const { authors } = this.state;

    CollaboratorFetcher.updateCollaborator({
      id: collaborator.id,
      is_group_lead: !collaborator.is_group_lead
    })
      .then((result) => {
        // Update the local state with the returned updated collaborator
        const updatedAuthors = authors.map(author => {
          if (author.id === result.user.id) {
            return result.user;
          }
          return author;
        });

        this.setState({ authors: updatedAuthors });
      })
      .catch(error => {
        console.error("Failed to update group lead status", error);
        alert("Failed to update group lead status");
      });
  }

  handleAddUser(u) {
    const { authors } = this.state;
    CollaboratorFetcher.AddMyCollaboration({ id: u.id })
      .then((result) => {
        authors.push(result.user);
        this.setState({
          authors: sortList(authors), users: [], fields: {}, showNewUser: false
        });
      });
  }

  createAdd() {
    const { fields, authors } = this.state;

    const validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

    if (!fields.email?.match(validRegex)) {
      alert(`Invalid Email Address [${fields.email}]`);
      return false;
    }

    const nilFields = [];
    if (!fields.email || fields.email.trim() === '') {
      nilFields.push('Email');
    }
    if (!fields.firstName || fields.firstName.trim() === '') {
      nilFields.push('First Name');
    }
    if (!fields.lastName || fields.lastName.trim() === '') {
      nilFields.push('Last Name');
    }
    if (!fields.country || fields.country.trim() === '') {
      nilFields.push('Country');
    }
    if (!fields.organization || fields.organization.trim() === '') {
      nilFields.push('Organization');
    }
    if (!fields.department || fields.department.trim() === '') {
      nilFields.push('Department');
    }
    if (nilFields.length > 0) {
      alert(`Please input ${nilFields.join()}!`);
      return false;
    }

    CollaboratorFetcher.createAddMyCollaboration(fields)
      .then((result) => {
        if (result.error) {
          alert(result.message);
        } else {
          authors.push(result.user);
          this.setState({
            authors: sortList(authors), users: [], fields: {}, showNewUser: false
          });
        }
      });
    return true;
  }

  handleDeleteCollaborator(c) {
    const { authors } = this.state;
    CollaboratorFetcher.deleteCollaboration({ id: c.id })
      .then((result) => {
        if (result.error) {
          alert(result.error);
        } else {
          this.setState({
            authors: filter(authors, o => o.id !== c.id)
          });
        }
      });
  }

  renderAffiliationRow(g, aff, onDeleteAff) {
    let removeBtn = '';
    if (g.type === 'Collaborator' && g.orcid == null) {
      removeBtn = (
        <OverlayTrigger placement="right" overlay={tooltips.removeAff}>
          <Button
            bsSize="xsmall"
            bsStyle="danger"
            onClick={() => onDeleteAff(aff, g)}
          >
            <i className="fa fa-times" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      );
    }

    return (
      <tr key={uuid.v4()}>
        <td width="30%">{aff.department}</td>
        <td width="40%">
          {aff.organization}
          {aff.ror_id && <RorIcon rorId={aff.ror_id} />}
        </td>
        <td width="20%">{aff.country}</td>
        <td width="10%">
          {removeBtn}
        </td>
      </tr>
    );
  }

  renderOrcidRefreshButton(g) {
    if (g.type === 'Collaborator' && g.orcid != null) {
      return (
        <OverlayTrigger placement="right" overlay={tooltips.refreshOrcid}>
          <Button
            bsSize="xsmall"
            bsStyle="success"
            onClick={() => this.onRefreshOrcidAff(g)}
          >
            <i className="fa fa-refresh" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      );
    }
    return null;
  }

  render() {
    const { authors, users, showNewUser, fields } = this.state;

    // Current collaborations display
    const collaboratorsList = authors?.map(g => (
      <tr key={`collab_${g.id}`}>
        <td style={{ verticalAlign: 'middle', textAlign: 'center', width: '10%' }}>
          <Button
            bsSize="xsmall"
            bsStyle={g.is_group_lead ? "primary" : "default"}
            onClick={() => this.toggleGroupLead(g)}
            title={g.is_group_lead ? "Remove as group lead" : "Set as group lead"}
            style={{
              width: '100%',
              maxWidth: '120px',
              opacity: g.is_group_lead ? 1 : 0.7
            }}
          >
            {g.is_group_lead ? (
              <><i className="fa fa-star" /> Group Lead</>
            ) : (
              <>Set Group Lead</>
            )}
          </Button>
        </td>
        <td style={{ verticalAlign: 'middle', width: '15%' }}>
          <h5 style={{ margin: '0', fontWeight: 500 }}>{g.name}</h5>
        </td>
        <td style={{ verticalAlign: 'middle', width: '15%' }}>
          <span style={{ fontSize: '0.9em', color: '#666' }}>{g.email}</span>
        </td>
        <td style={{ verticalAlign: 'middle', width: '15%' }}>
          {g.orcid ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <img
                src="https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png"
                alt="ORCID"
                style={{ height: '16px', width: '16px' }}
              />
              <span style={{ fontSize: '0.85em' }}>{g.orcid}</span>
              {this.renderOrcidRefreshButton(g)}
            </div>
          ) : '-'}
        </td>
        <td style={{ padding: 0, width: '50%' }}>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            <Table condensed hover style={{ marginBottom: 0 }}>
              <tbody>
                {g.current_affiliations && g.current_affiliations.length > 0 ? (
                  g.current_affiliations.map((aff, index) => (
                    <tr key={`aff_${g.id}_${index}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ border: 'none', width: '30%', fontSize: '0.9em' }}>{aff.department || '-'}</td>
                      <td style={{ border: 'none', width: '40%', fontSize: '0.9em' }}>
                        {aff.organization || '-'}
                        {aff.ror_id && <RorIcon rorId={aff.ror_id} />}
                      </td>
                      <td style={{ border: 'none', width: '20%', fontSize: '0.9em' }}>{aff.country || '-'}</td>
                      <td style={{ border: 'none', width: '10%', textAlign: 'right' }}>
                        {g.type === 'Collaborator' && g.orcid == null && (
                          <OverlayTrigger placement="right" overlay={tooltips.removeAff}>
                            <Button
                              bsSize="xsmall"
                              bsStyle="danger"
                              onClick={() => this.onDeleteAff(aff, g)}
                            >
                              <i className="fa fa-times" aria-hidden="true" />
                            </Button>
                          </OverlayTrigger>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ border: 'none', textAlign: 'center', color: '#999', padding: '8px', fontSize: '0.9em' }}>
                      No affiliations
                    </td>
                  </tr>
                )}

                {/* Add new affiliation row */}
                {g.type === 'Collaborator' && g.orcid == null && (
                  <tr style={{ backgroundColor: '#f9f9f9' }}>
                    <td style={{
                      border: 'none',
                      paddingTop: '8px',
                      paddingBottom: '8px',
                      paddingRight: '8px',
                      width: '30%'
                    }}>
                      <CreatableSelect
                        placeholder="Department"
                        isClearable
                        options={this.state.departments}
                        value={fields[`${g.id}@line_department`] ?
                          { value: fields[`${g.id}@line_department`], label: fields[`${g.id}@line_department`] } : null}
                        onChange={(choice) => this.handleInputChange(`${g.id}@line_department`, choice)}
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '34px',
                            fontSize: '0.85em',
                            borderColor: '#ccc'
                          }),
                          placeholder: (base) => ({ ...base, fontSize: '0.85em' }),
                          // Increase the height of dropdown menu
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999
                          })
                        }}
                      />
                    </td>
                    <td style={{
                      border: 'none',
                      paddingTop: '8px',
                      paddingBottom: '8px',
                      paddingRight: '8px',
                      width: '40%'
                    }}>
                      <CreatableSelect
                        placeholder="Organization"
                        isClearable
                        options={this.state.organizations}
                        value={fields[`${g.id}@line_organization`] ?
                          { value: fields[`${g.id}@line_organization`], label: fields[`${g.id}@line_organization`] } : null}
                        onChange={(choice) => this.handleInputChange(`${g.id}@line_organization`, choice)}
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '34px',
                            fontSize: '0.85em',
                            borderColor: '#ccc'
                          }),
                          placeholder: (base) => ({ ...base, fontSize: '0.85em' }),
                          // Increase the height of dropdown menu
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999
                          })
                        }}
                      />
                    </td>
                    <td style={{
                      border: 'none',
                      paddingTop: '8px',
                      paddingBottom: '8px',
                      paddingRight: '8px',
                      width: '20%'
                    }}>
                      <CreatableSelect
                        placeholder="Country"
                        isClearable
                        options={this.state.countries}
                        value={fields[`${g.id}@line_country`] ?
                          { value: fields[`${g.id}@line_country`], label: fields[`${g.id}@line_country`] } : null}
                        onChange={(choice) => this.handleInputChange(`${g.id}@line_country`, choice)}
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '34px',
                            fontSize: '0.85em',
                            borderColor: '#ccc'
                          }),
                          placeholder: (base) => ({ ...base, fontSize: '0.85em' }),
                          // Increase the height of dropdown menu
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999
                          })
                        }}
                      />
                    </td>
                    <td style={{
                      border: 'none',
                      textAlign: 'right',
                      paddingTop: '8px',
                      width: '10%'
                    }}>
                      <Button
                        bsSize="small" // Changed from xsmall to small for better visibility
                        bsStyle="primary"
                        onClick={() => this.onAddAff(g)}
                        title="Add affiliation"
                        style={{ height: '34px', width: '34px' }} // Match height with select inputs
                      >
                        <i className="fa fa-plus" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </td>
        <td style={{ verticalAlign: 'middle', textAlign: 'center', width: '5%' }}>
          <DeleteConfirmBtn
            label=""
            onClickYes={() => this.handleDeleteCollaborator(g)}
            bsSize="small"
          />
        </td>
      </tr>
    ));

    // Search results table
    const searchResults = users.length > 0 && (
      <div style={{ marginTop: '20px' }}>
        <h4>Search Results</h4>
        <Table responsive condensed hover>
          <thead>
            <tr>
              <th width="5%">Add</th>
              <th width="20%">Name</th>
              <th width="20%">Email</th>
              <th width="15%">ORCID iD</th>
              <th width="15%">Department</th>
              <th width="15%">Organization</th>
              <th width="10%">Country</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={`result_${u.id}`}>
                <td>
                  <OverlayTrigger placement="right" overlay={tooltips.addUser}>
                    <Button
                      bsSize="xsmall"
                      bsStyle="primary"
                      onClick={() => this.handleAddUser(u)}
                    >
                      <i className="fa fa-plus-circle" aria-hidden="true" />
                    </Button>
                  </OverlayTrigger>
                </td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.orcid}</td>
                <td>{u.current_affiliations?.[0]?.department || ''}</td>
                <td>
                  {u.current_affiliations?.[0]?.organization || ''}
                  {u.current_affiliations?.[0]?.ror_id &&
                    <RorIcon rorId={u.current_affiliations[0].ror_id} />}
                </td>
                <td>{u.current_affiliations?.[0]?.country || ''}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );

    // New user form
    const newUserForm = showNewUser && (
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
        <h4>Add New Collaborator</h4>
        <Row>
          <Col sm={6}>
            <FormGroup>
              <label>First Name</label>
              <FormControl
                type="text"
                placeholder="First Name"
                value={fields.firstName || ''}
                onChange={e => this.handleInputChange('firstName', e)}
              />
            </FormGroup>
          </Col>
          <Col sm={6}>
            <FormGroup>
              <label>Last Name</label>
              <FormControl
                type="text"
                placeholder="Last Name"
                value={fields.lastName || ''}
                onChange={e => this.handleInputChange('lastName', e)}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col sm={12}>
            <FormGroup>
              <label>Email</label>
              <FormControl
                type="email"
                placeholder="Email"
                value={fields.email || ''}
                onChange={e => this.handleInputChange('email', e)}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col sm={12}>
            <FormGroup>
              <label>Country</label>
              <CreatableSelect
                placeholder="Select or type a country"
                isClearable
                options={this.state.countries}
                value={fields.country ? { value: fields.country, label: fields.country } : null}
                onChange={(choice) => this.handleInputChange('country', choice)}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col sm={12}>
            <FormGroup>
              <label>Organization</label>
              <CreatableSelect
                placeholder="Select or type an organization"
                isClearable
                options={this.state.organizations}
                value={fields.organization ? { value: fields.organization, label: fields.organization } : null}
                onChange={(choice) => this.handleInputChange('organization', choice)}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col sm={12}>
            <FormGroup>
              <label>Department</label>
              <CreatableSelect
                placeholder="Select or type a department"
                isClearable
                options={this.state.departments}
                value={fields.department ? { value: fields.department, label: fields.department } : null}
                onChange={(choice) => this.handleInputChange('department', choice)}
              />
            </FormGroup>
          </Col>
        </Row>
        <div style={{ textAlign: 'right', marginTop: '15px' }}>
          <Button bsStyle="primary" onClick={() => this.createAdd()}>
            Create and Add
          </Button>
        </div>
      </div>
    );

    return (
      <Modal
        show={this.props.show}
        dialogClassName="importChemDrawModal"
        onHide={this.handleHide}
        backdrop="static"
        bsSize="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>My Collaborations</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <div style={{ marginBottom: '30px' }}>
            <h4>Find Collaborators</h4>

            {/* ORCID Search */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
              <h5 style={{ marginTop: '0' }}>Search by ORCID</h5>
              <Row>
                <Col sm={10}>
                  <FormGroup>
                    <FormControl
                      type="text"
                      placeholder="ORCID iD (e.g., 0000-0002-1234-5678)"
                      value={fields.orcid || ''}
                      onChange={e => this.handleInputChange('orcid', e)}
                    />
                  </FormGroup>
                </Col>
                <Col sm={2}>
                  <Button block bsStyle="primary" onClick={() => this.findOrcid()}>
                    <i className="fa fa-search" /> Find
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Name/Email Search */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
              <h5 style={{ marginTop: '0' }}>Search by Name or Email</h5>
              <Row style={{ marginBottom: '15px' }}>
                <Col sm={4}>
                  <FormGroup>
                    <label>First Name</label>
                    <FormControl
                      type="text"
                      placeholder="First Name"
                      value={fields.firstName || ''}
                      onChange={e => this.handleInputChange('firstName', e)}
                    />
                  </FormGroup>
                </Col>
                <Col sm={4}>
                  <FormGroup>
                    <label>Last Name</label>
                    <FormControl
                      type="text"
                      placeholder="Last Name"
                      value={fields.lastName || ''}
                      onChange={e => this.handleInputChange('lastName', e)}
                    />
                  </FormGroup>
                </Col>
                <Col sm={4}>
                  <FormGroup>
                    <label>Email</label>
                    <FormControl
                      type="email"
                      placeholder="Email"
                      value={fields.email || ''}
                      onChange={e => this.handleInputChange('email', e)}
                    />
                  </FormGroup>
                </Col>
              </Row>
              <div style={{ textAlign: 'right' }}>
                <Button bsStyle="primary" onClick={() => this.findUsers()}>
                  <i className="fa fa-search" /> Search
                </Button>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchResults}

          {/* New User Form */}
          {newUserForm}

{/* Current Collaborations */}
{authors.length > 0 && (
  <div style={{ marginTop: '30px' }}>
    <h4 style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
      My Collaborations
    </h4>
    <div className="collaborations-list">
      <Table responsive hover style={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ borderBottom: '2px solid #eee', width: '10%' }}></th>
            <th style={{ borderBottom: '2px solid #eee', width: '15%' }}>Name</th>
            <th style={{ borderBottom: '2px solid #eee', width: '15%' }}>Email</th>
            <th style={{ borderBottom: '2px solid #eee', width: '15%' }}>ORCID</th>
            <th style={{ borderBottom: '2px solid #eee', width: '50%' }}>Affiliations</th>
            <th style={{ borderBottom: '2px solid #eee', width: '5%' }}></th>
          </tr>
        </thead>
        <tbody>{collaboratorsList}</tbody>
      </Table>
    </div>
  </div>
)}
        </Modal.Body>
      </Modal>
    );
  }
}

AuthorModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};