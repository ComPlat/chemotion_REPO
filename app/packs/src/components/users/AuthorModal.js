import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, OverlayTrigger, Tooltip, Modal, Button, Table, Panel, Form, FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import { findIndex, filter } from 'lodash';
import uuid from 'uuid';
import Select from 'react-select';
import UsersFetcher from '../fetchers/UsersFetcher';
import PublicFetcher from '../fetchers/PublicFetcher';
import SelectionField from '../common/SelectionField';
import DeleteConfirmBtn from '../common/DeleteConfirmBtn';

const sortList = data => data.sort((a, b) => a.name.localeCompare(b.name));
const addUserTooltip = <Tooltip id="addUser_tooltip">Save to my collaboration</Tooltip>;
const removeAffTooltip = <Tooltip id="rmAff_tooltip">Remove this affiliation</Tooltip>;
const refreshOrcidTooltip = <Tooltip id="rmAff_tooltip">Refresh affiliations from ORCID</Tooltip>;
const addAffTooltip = <Tooltip id="addAff_tooltip">Add new affiliation</Tooltip>;

const refreshAffByOrcid = (g, onRefreshOrcidAff) => {
  let orcidRefreshBtn = '';
  if (g.type === 'Collaborator' && g.orcid != null) {
    orcidRefreshBtn = (
      <OverlayTrigger placement="right" overlay={refreshOrcidTooltip} >
        <Button
          bsSize="xsmall"
          bsStyle="success"
          onClick={() => onRefreshOrcidAff(g)}
        >
          <i className="fa fa-refresh" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }
  return (
    <span>
      { orcidRefreshBtn }
    </span>
  );
};

const lineAff = (g, aff, onDeleteAff) => {
  let removeBtn = '';
  if (g.type === 'Collaborator' && g.orcid == null) {
    removeBtn = (
      <OverlayTrigger placement="right" overlay={removeAffTooltip} >
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
      <td width="40%">{aff.organization}</td>
      <td width="20%">{aff.country}</td>
      <td width="10%">
        { removeBtn }
      </td>
    </tr>
  );
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
    UsersFetcher.fetchMyCollaborations()
      .then((result) => {
        if (result.authors && result.authors.length > 0) {
          this.setState({ authors: sortList(result.authors) });
        } else {
          this.setState({
            authors: [], users: [], fields: {}, showNewUser: false
          });
        }
      });
    PublicFetcher.affiliations('countries').then((result) => {
      const affOption = result.affiliations.map(a => ({ label: a, value: a }))
        .filter(a => a.value && a.value.length > 1);
      this.setState({ countries: affOption });
    });
    PublicFetcher.affiliations('organizations').then((result) => {
      const affOption = result.affiliations.map(a => ({ label: a, value: a }))
        .filter(a => a.value && a.value.length > 1);
      this.setState({ organizations: affOption });
    });
    PublicFetcher.affiliations('departments').then((result) => {
      const affOption = result.affiliations.map(a => ({ label: a, value: a }))
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
    UsersFetcher.addCollaboratorAff(params)
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
    UsersFetcher.deleteCollaboratorAff(params)
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
    UsersFetcher.refreshOrcidAff(params)
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
    switch (type) {
      case 'firstName':
        fields.firstName = ev.currentTarget.value;
        break;
      case 'lastName':
        fields.lastName = ev.currentTarget.value;
        break;
      case 'orcid':
        fields.orcid = ev.currentTarget.value;
        break;
      case 'country':
        fields.country = ev && ev.value;
        break;
      case 'organization':
        fields.organization = ev && ev.value;
        break;
      case 'department':
        fields.department = ev && ev.value;
        break;
      case 'search_key':
        fields.search_key = ev.currentTarget.value;
        break;
      default:
        if (typeof fields === 'undefined') {
          fields = {};
        }
        fields[type] = ev && ev.value;
    }
    this.setState({ fields });
  }

  findUsers() {
    const { fields } = this.state;
    if ((!fields.firstName || fields.firstName.trim() === '') && (!fields.lastName || fields.lastName.trim() === '')
    && (!fields.orcid || fields.orcid.trim() === '')) {
      alert('Please input First Name or Last Name');
      return false;
    }
    UsersFetcher.fetchUsersByNameFirst(fields.lastName || '', fields.firstName || '')
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
    const { fields } = this.state;
    if (!fields.orcid || fields.orcid.trim() === '') {
      alert('Please input ORCID');
      return false;
    }

    UsersFetcher.fetchandAddCollaboratorByOrcid(fields.orcid)
      .then((result) => {
        if (result.error) {
          alert(`[${fields.orcid.trim()}] \n ${result.message}`);
          return false;
        }

        this.setState({
          authors: sortList(result.authors), users: [], fields: {}, showNewUser: false
        });
      });
    return true;
  }

  handleAddUser(u) {
    const { authors } = this.state;
    UsersFetcher.AddMyCollaboration({ id: u.id })
      .then((result) => {
        authors.push(result.user);
        this.setState({
          authors: sortList(authors), users: [], fields: {}, showNewUser: false
        });
      });
  }

  createAdd() {
    const { fields, authors } = this.state;

    const nilFields = [];
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

    UsersFetcher.createAddMyCollaboration(fields)
      .then((result) => {
        if (result.error) {
          alert(result.error);
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
    UsersFetcher.deleteCollaboration({ id: c.id })
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

  render() {
    const { authors, users, showNewUser } = this.state;
    const modalStyle = { overflowY: 'auto' };
    const searchTbody = (users || []).map(g => (
      <tbody key={`tbody_${g.id}`}>
        <tr key={`row_${g.id}`} id={`row_${g.id}`} style={{ fontWeight: 'bold' }}>
          <td>
            <OverlayTrigger placement="right" overlay={addUserTooltip} >
              <Button
                bsSize="xsmall"
                bsStyle="warning"
                onClick={() => this.handleAddUser(g)}
              >
                <i className="fa fa-floppy-o" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
            &nbsp;
          </td>
          <td>{g.name}</td>
          <td>{g.orcid}</td>
          <td>{g.current_affiliations && g.current_affiliations.length > 0 ? g.current_affiliations[0].department : ''}</td>
          <td>{g.current_affiliations && g.current_affiliations.length > 0 ? g.current_affiliations[0].organization : ''}</td>
          <td>{g.current_affiliations && g.current_affiliations.length > 0 ? g.current_affiliations[0].country : ''}</td>
        </tr>
      </tbody>
    ));
    let tbody = '';
    if (Object.keys(authors).length <= 0) {
      tbody = '';
    } else {
      tbody = authors.map(g => (
        <tbody key={`tbody_${g.id}`}>
          <tr key={`row_${g.id}`} id={`row_${g.id}`} style={{ fontWeight: 'bold' }}>
            <td>
              <DeleteConfirmBtn
                label={g.name}
                onClickYes={() => this.handleDeleteCollaborator(g)}
              />
              &nbsp;
            </td>
            <td>{g.name}</td>
            <td>{g.orcid} {refreshAffByOrcid(g, this.onRefreshOrcidAff)}</td>
            <td>
              <Table style={{ backgroundColor: 'unset', margin: 'unset' }}>
                <tbody>
                  {
                    g.current_affiliations && g.current_affiliations.length > 0 ?
                      g.current_affiliations.map(a =>
                      lineAff(g, a, this.onDeleteAff, this.handleInputChange)) : null
                  }
                  {
                    g.type === 'Collaborator' && g.orcid == null ?
                      (
                        <tr>
                          <td width="30%">
                            <SelectionField
                              options={this.state.departments}
                              value={(this.state.fields && this.state.fields[`${g.id}@line_department`]) || ''}
                              field={`${g.id}@line_department`}
                              placeholder="e.g. Institute of Organic Chemistry"
                              onChange={this.handleInputChange}
                              isCreatable
                            />
                          </td>
                          <td width="40%">
                            <SelectionField
                              options={this.state.organizations}
                              value={(this.state.fields && this.state.fields[`${g.id}@line_organization`]) || ''}
                              field={`${g.id}@line_organization`}
                              placeholder="e.g. Karlsruhe Institute of Technology"
                              onChange={this.handleInputChange}
                              isCreatable
                            />
                          </td>
                          <td width="20%">
                            <SelectionField
                              options={this.state.countries}
                              value={(this.state.fields && this.state.fields[`${g.id}@line_country`]) || ''}
                              field={`${g.id}@line_country`}
                              placeholder="e.g. Germany"
                              onChange={this.handleInputChange}
                            />
                          </td>
                          <td width="10%">
                            <OverlayTrigger placement="right" overlay={addAffTooltip} >
                              <Button
                                bsSize="xsmall"
                                bsStyle="success"
                                onClick={() => this.onAddAff(g)}
                              >
                                <i className="fa fa-plus" aria-hidden="true" />
                              </Button>
                            </OverlayTrigger>
                          </td>
                        </tr>
                      ) : null
                  }
                </tbody>
              </Table>
            </td>
          </tr>
        </tbody>
      ));
    }

    let newAff = '';
    if (showNewUser === true) {
      newAff = (
        <Form>
          <FormGroup controlId="formInlineCountry">
            <InputGroup>
              <InputGroup.Addon>Country</InputGroup.Addon>
              <Select.Creatable
                name={`select-${uuid.v4()}`}
                options={this.state.countries}
                placeholder="e.g. Germany"
                multi={false}
                isClearable
                value={this.state.fields.country || ''}
                onChange={event => this.handleInputChange('country', event)}
                promptTextCreator={p => `Create new country; ${p} `}
              />
            </InputGroup>
          </FormGroup>
          <FormGroup controlId="formInlineOrganization">
            <InputGroup>
              <InputGroup.Addon>Organization</InputGroup.Addon>
              <Select.Creatable
                name={`select-${uuid.v4()}`}
                options={this.state.organizations}
                placeholder="e.g. Karlsruhe Institute of Technology"
                multi={false}
                isClearable
                value={this.state.fields.organization || ''}
                onChange={event => this.handleInputChange('organization', event)}
                promptTextCreator={p => `Create new organization; ${p} `}
              />
            </InputGroup>
          </FormGroup>
          <FormGroup controlId="formInlineOrganization">
            <InputGroup>
              <InputGroup.Addon>Department</InputGroup.Addon>
              <Select.Creatable
                name={`select-${uuid.v4()}`}
                options={this.state.departments}
                placeholder="e.g. Institute of Organic Chemistry"
                multi={false}
                isClearable
                value={this.state.fields.department || ''}
                onChange={event => this.handleInputChange('department', event)}
                promptTextCreator={p => `Create new department; ${p} `}
              />
            </InputGroup>
          </FormGroup>
          <Button bsSize="small" bsStyle="warning" onClick={() => this.createAdd()}>
            <i className="fa fa-file" aria-hidden="true" />&nbsp;
            Create and Save to my collaboration
          </Button>
        </Form>
      );
    }

    const newUserPanel = (
      <Panel bsStyle="success">
        <Panel.Heading>
          <Panel.Title>
            Add new collaborator (by ORCID or By Name)
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <Row>
            <Col md={8}>
              <FormGroup controlId="formInlineLastName">
                <InputGroup>
                  <InputGroup.Addon>ORCID</InputGroup.Addon>
                  <FormControl
                    type="text"
                    placeholder="0000-0002-1234-5678"
                    value={this.state.fields.orcid || ''}
                    onChange={e => this.handleInputChange('orcid', e)}
                  />
                  <InputGroup.Button>
                    <Button bsStyle="success" onClick={() => this.findOrcid()}><i className="fa fa-search" aria-hidden="true" />&nbsp;Find and save to collaboration by ORCID</Button>
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={8}>
              <Form>
                <FormGroup controlId="formInlineFirstName">
                  <InputGroup>
                    <InputGroup.Addon>First Name</InputGroup.Addon>
                    <FormControl
                      type="text"
                      placeholder="eg: AK"
                      value={this.state.fields.firstName || ''}
                      onChange={e => this.handleInputChange('firstName', e)}
                    />
                    <InputGroup.Addon>Last Name</InputGroup.Addon>
                    <FormControl
                      type="text"
                      placeholder="J. Moriarty"
                      value={this.state.fields.lastName || ''}
                      onChange={e => this.handleInputChange('lastName', e)}
                    />
                    <InputGroup.Button>
                      <Button bsStyle="success" onClick={() => this.findUsers()}>
                        <i className="fa fa-search" aria-hidden="true" />&nbsp;
                        Find by Name
                      </Button>
                    </InputGroup.Button>
                  </InputGroup>
                </FormGroup>
              </Form>
            </Col>
          </Row>
          <Row>
            <Col md={8}>
              {newAff}
            </Col>
          </Row>
        </Panel.Body>
      </Panel>
    );

    return (
      <Modal
        show={this.props.show}
        dialogClassName="importChemDrawModal"
        onHide={this.handleHide}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>My Collaboration</Modal.Title>
        </Modal.Header>
        <Modal.Body style={modalStyle}>
          <div>
            { newUserPanel }
            <Panel bsStyle="success">
              <Panel.Heading>
                <Panel.Title>
                  Search Result
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <Table responsive condensed hover>
                  <thead>
                    <tr style={{ backgroundColor: '#ddd' }}>
                      <th width="10%">Action</th>
                      <th width="10%">Name</th>
                      <th width="10%">ORCID</th>
                      <th width="20%">Department</th>
                      <th width="25%">Organization</th>
                      <th width="15%">Country</th>
                    </tr>
                  </thead>
                  { searchTbody }
                </Table>
              </Panel.Body>
            </Panel>
            <Panel bsStyle="info">
              <Panel.Heading>
                <Panel.Title>
                  My Collaboration
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <Table responsive condensed hover>
                  <thead>
                    <tr style={{ backgroundColor: '#ddd' }}>
                      <th width="5%">Action</th>
                      <th width="10%">Name</th>
                      <th width="15%">ORCID</th>
                      <th width="70%">
                        <Table style={{ backgroundColor: 'unset', margin: 'unset' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: 'unset' }} width="30%">Department</td>
                              <td style={{ padding: 'unset' }} width="40%">Organization</td>
                              <td style={{ padding: 'unset' }} width="20%">Country</td>
                              <td style={{ padding: 'unset' }} width="10%">&nbsp;</td>
                            </tr>
                          </tbody>
                        </Table>
                      </th>
                    </tr>
                  </thead>
                  { tbody }
                </Table>
              </Panel.Body>
            </Panel>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

AuthorModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};
