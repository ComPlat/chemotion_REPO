import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Col, OverlayTrigger, Tooltip, Modal, Button, Table, Panel, Form, FormControl, FormGroup, ControlLabel } from 'react-bootstrap';
import { findIndex, filter } from 'lodash';
import UsersFetcher from '../fetchers/UsersFetcher';
import PublicFetcher from '../fetchers/PublicFetcher';
import SelectionField from '../common/SelectionField';
import DeleteConfirmBtn from '../common/DeleteConfirmBtn';

const sortList = data => data.sort((a, b) => a.name.localeCompare(b.name));
const addUserTooltip = <Tooltip id="addUser_tooltip">Save to my collaboration</Tooltip>;
const removeAffTooltip = <Tooltip id="rmAff_tooltip">Remove this affiliation</Tooltip>;
const addAffTooltip = <Tooltip id="addAff_tooltip">Add new affiliation</Tooltip>;

const lineAff = (g, aff, onDeleteAff, handleInputChange) => {

  let removeBtn = '';
  if (g.type === 'Collaborator') {
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
    <tr>
      <td width="30%">{aff.department}</td>
      <td width="30%">{aff.organization}</td>
      <td width="30%">{aff.country}</td>
      <td width="10%">
        { removeBtn }
      </td>
    </tr>
  );
}

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
    this.handleAddUser = this.handleAddUser.bind(this);
    this.handleHide = this.handleHide.bind(this);
    this.onAddAff = this.onAddAff.bind(this);
    this.onDeleteAff = this.onDeleteAff.bind(this);
  }

  componentDidMount() {
    UsersFetcher.fetchMyCollaborations()
      .then((result) => {
        if (result.authors && result.authors.length > 0) {
          this.setState({ authors: sortList(result.authors) });
        } else {
          this.setState({ authors: [], users: [], fields: {}, showNewUser: false });
        }
      });
    PublicFetcher.affiliations('countries').then((result) => {
      const affOption = result.affiliations.map(a => ({ label: a, value: a })).filter(a => a.value && a.value.length > 1);
      this.setState({ countries: affOption });
    });
    PublicFetcher.affiliations('organizations').then((result) => {
      const affOption = result.affiliations.map(a => ({ label: a, value: a })).filter(a => a.value && a.value.length > 1);
      this.setState({ organizations: affOption });
    });
    PublicFetcher.affiliations('departments').then((result) => {
      const affOption = result.affiliations.map(a => ({ label: a, value: a })).filter(a => a.value && a.value.length > 1);
      this.setState({ departments: affOption });
    });
  }

  componentDidUpdate() {
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
      case 'abbr':
        fields.abbr = ev.currentTarget.value;
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
    if ((!fields.firstName || fields.firstName.trim() === '') && (!fields.lastName || fields.lastName.trim() === '')) {
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
            authors: sortList(authors), users: [], fields: {}
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

  onAddAff(g) {
    const { authors, fields } = this.state;
    const department = fields[`${g.id}@line_department`];
    const organization = fields[`${g.id}@line_organization`];
    const country = fields[`${g.id}@line_country`];
    const params = { id: g.id, department, organization, country };


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

  render() {
    const { authors, users, showNewUser } = this.state;

    const modalStyle = {
      overflowY: 'auto',
    };

    let tbody = '';

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
          <td>{g.affiliations && g.affiliations.length > 0 ? g.affiliations[0].department : ''}</td>
          <td>{g.affiliations && g.affiliations.length > 0 ? g.affiliations[0].organization : ''}</td>
          <td>{g.affiliations && g.affiliations.length > 0 ? g.affiliations[0].country : ''}</td>
        </tr>
      </tbody>
    ));

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
            <td>
              <Table style={{ backgroundColor: 'unset', margin: 'unset' }}>
                <tbody>
                  {
                    g.affiliations && g.affiliations.length > 0 ?
                      g.affiliations.map(a =>
                      lineAff(g, a, this.onDeleteAff, this.handleInputChange)) : ' '
                  }
                  {
                    g.type === 'Collaborator' ?
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
                          <td width="30%">
                            <SelectionField
                              options={this.state.organizations}
                              value={(this.state.fields && this.state.fields[`${g.id}@line_organization`]) || ''}
                              field={`${g.id}@line_organization`}
                              placeholder="e.g. Karlsruhe Institute of Technology"
                              onChange={this.handleInputChange}
                              isCreatable
                            />
                          </td>
                          <td width="30%">
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
                      ) : ' '
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
          <SelectionField
            label="Country"
            options={this.state.countries}
            value={this.state.fields.country || ''}
            field="country"
            placeholder="e.g. Germany"
            onChange={this.handleInputChange}
          />
          <SelectionField
            label="Organization"
            options={this.state.organizations}
            value={this.state.fields.organization || ''}
            field="organization"
            placeholder="e.g. Karlsruhe Institute of Technology"
            onChange={this.handleInputChange}
            isCreatable
          />
          <SelectionField
            label="Department"
            options={this.state.departments}
            value={this.state.fields.department || ''}
            field="department"
            placeholder="e.g. Institute of Organic Chemistry"
            onChange={this.handleInputChange}
            isCreatable
          />
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
            Add new collaborator
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <Col md={4}>
            <Form>
              <FormGroup controlId="formInlineName">
                <ControlLabel>First Name</ControlLabel>
                <FormControl
                  type="text"
                  placeholder="eg: AK"
                  value={this.state.fields.firstName || ''}
                  onChange={e => this.handleInputChange('firstName', e)}
                />
              </FormGroup>
              <FormGroup controlId="formInlineName">
                <ControlLabel>Last Name</ControlLabel>
                <FormControl
                  type="text"
                  placeholder="J. Moriarty"
                  value={this.state.fields.lastName || ''}
                  onChange={e => this.handleInputChange('lastName', e)}
                />
              </FormGroup>
              <FormGroup controlId="formInlineNameAbbr">
                <Button bsSize="small" bsStyle="success" onClick={() => this.findUsers()}>
                  <i className="fa fa-search" aria-hidden="true" />&nbsp;
                  Find
                </Button>
              </FormGroup>
            </Form>
          </Col>
          <Col md={8}>
            {newAff}
          </Col>
        </Panel.Body>
      </Panel>
    );

    return (
      <Modal
        show={this.props.show}
        dialogClassName="importChemDrawModal"
        onHide={this.handleHide}
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
                      <th width="20%">Name</th>
                      <th width="20%">Department</th>
                      <th width="20%">Organization</th>
                      <th width="20%">Country</th>
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
                      <th width="20%">Name</th>
                      <th width="75%">
                        <Table style={{ backgroundColor: 'unset', margin: 'unset' }}>
                          <tbody>
                            <td width="30%">Department</td>
                            <td width="30%">Organization</td>
                            <td width="30%">Country</td>
                            <td width="10%">&nbsp;</td>
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
