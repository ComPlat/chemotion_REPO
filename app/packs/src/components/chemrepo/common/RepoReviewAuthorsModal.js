/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip,
  InputGroup,
  Checkbox,
  Table,
} from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import { findIndex, filter, uniq, flattenDeep } from 'lodash';
import { OrcidIcon, RorLink } from 'src/repoHome/RepoCommon';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import SelectionField from 'src/components/common/SelectionField';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';
import DeleteConfirmBtn from 'src/components/common/DeleteConfirmBtn';

// Add CSS styles to ensure minimum field widths
const affFieldStyles = `
  /* Target both author and contributor affiliation fields */
  .selection-field-container {
    min-width: 180px;
  }
  .selection-field-container > div {
    min-width: 180px;
  }
  .affiliation-table td, .contributor-affiliation-table td {
    min-width: 180px;
  }
  .react-select__control {
    min-width: 180px;
  }
  .react-select__value-container {
    min-width: 180px;
  }
  /* Additional specific selectors for contributor section */
  .contributor-affiliation-table .aff-line td > div,
  .contributor-affiliation-table .aff-line td .selection-field-container {
    min-width: 180px;
  }
  /* Force minimum width on Select components */
  .Select-control, .Select-input {
    min-width: 180px;
  }
  /* Force width on wrapper divs */
  .contributor-affiliation-table .aff-line td {
    min-width: 180px;
  }
  /* Ensure the fields don't collapse after state changes */
  div[class*="Select"] {
    min-width: 180px;
  }

`;

const addAffTooltip = (
  <Tooltip id="addAff_tooltip">Add affiliation for this Publication</Tooltip>
);
const removeAffTooltip = (
  <Tooltip id="rmAff_tooltip">
    Remove this affiliation from this Publication
  </Tooltip>
);

const lineAff = (creator, aid, affs, onDeleteAff, rors = {}) => {
  const removeBtn = (
    <OverlayTrigger placement="right" overlay={removeAffTooltip}>
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        onClick={() => onDeleteAff(creator, aid)}
      >
        <i className="fa fa-trash-o" />
      </Button>
    </OverlayTrigger>
  );
  return (
    <tr key={uuid.v4()} style={{ lineHeight: '2em' }}>
      <td colSpan="4" width="90%">
        {affs[aid]}
        {rors && rors[aid] && <RorLink rorId={rors[aid]} />}
      </td>
      <td align="right" width="10%">
        {removeBtn}
      </td>
    </tr>
  );
};

const secAff = (fields, g, countries, organizations, departments, onAddAff, onDeleteAff, onInputChange) => {
  const selectedOrg = fields[`${g.id}@line_organization`] || '';

  // Filter departments by the selected organization
  const filteredDepartments = selectedOrg
    ? departments.filter(dept => dept.organization === selectedOrg || !dept.organization)
    : departments;

  // Check if fields meet minimum length requirements
  const orgValue = fields[`${g.id}@line_organization`] || '';
  const deptValue = fields[`${g.id}@line_department`] || '';
  const countryValue = fields[`${g.id}@line_country`] || '';

  // Minimum length for each field (3 characters)
  const minLength = 3;
  const isOrgValid = orgValue.length >= minLength || orgValue.length === 0;
  const isDeptValid = deptValue.length >= minLength || deptValue.length === 0;
  const isCountryValid = countryValue.length >= minLength || countryValue.length === 0;

  // Determine if the add button should be enabled
  const isAddButtonEnabled =
    orgValue.length >= minLength &&
    deptValue.length >= minLength &&
    countryValue.length >= minLength;

  // Define minimum widths for SelectionField components to maintain consistent UI
  const selectionFieldStyle = {
    minWidth: '180px',  // Minimum width for all selection fields
  };

  // Combine styles for validation
  const orgStyle = !isOrgValid
    ? { ...selectionFieldStyle, borderColor: 'red' }
    : selectionFieldStyle;

  const deptStyle = !isDeptValid
    ? { ...selectionFieldStyle, borderColor: 'red' }
    : selectionFieldStyle;

  const countryStyle = !isCountryValid
    ? { ...selectionFieldStyle, borderColor: 'red' }
    : selectionFieldStyle;

  return (
    <tr className="aff-line" style={{ lineHeight: '2em' }}>
      <td width="40%">
        <SelectionField
          options={organizations}
          value={(fields[`${g.id}@line_organization`]) || ''}
          field={`${g.id}@line_organization`}
          placeholder="e.g. Karlsruhe Institute of Technology"
          onChange={onInputChange}
          isCreatable
          style={orgStyle}
        />
        {!isOrgValid && <small className="text-danger">Minimum 3 characters required</small>}
      </td>
      <td width="30%">
        <SelectionField
          options={filteredDepartments}
          value={(fields[`${g.id}@line_department`]) || ''}
          field={`${g.id}@line_department`}
          placeholder="e.g. Institute of Organic Chemistry"
          onChange={onInputChange}
          isCreatable
          style={deptStyle}
        />
        {!isDeptValid && <small className="text-danger">Minimum 3 characters required</small>}
      </td>
      <td width="20%">
        <SelectionField
          options={countries}
          value={(fields[`${g.id}@line_country`]) || ''}
          field={`${g.id}@line_country`}
          onChange={onInputChange}
          placeholder="e.g. Germany"
          style={countryStyle}
        />
        {!isCountryValid && <small className="text-danger">Minimum 3 characters required</small>}
      </td>
      <td width="10%" align="right">
        <OverlayTrigger placement="right" overlay={addAffTooltip}>
          <Button
            bsSize="xsmall"
            bsStyle="success"
            onClick={() => onAddAff(g)}
            disabled={!isAddButtonEnabled}
          >
            <i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </td>
    </tr>
  );
};

const affbody = (taggData, creator, fields, countries, organizations, departments, onAddAff, onDeleteAff, onInputChange) => {
  const affs = taggData.affiliations || {};
  const rors = taggData.rors || {};
  const mainAff = creator.affiliationIds && creator.affiliationIds.length > 0 ?
    creator.affiliationIds.map(aid => lineAff(creator, aid, affs, onDeleteAff, rors)) : '';
    creator.affiliations = creator.affiliationIds.map(aid => affs[aid]);
  const moreAff = secAff(fields, creator, countries, organizations, departments, onAddAff, onDeleteAff, onInputChange) || '';

  return (
    <span>
      {mainAff}
      {moreAff}
    </span>
  );
};

// Function for contributor affiliation management, similar to affbody but for contributors
const contributorAffBody = (taggData, contributor, fields, countries, organizations, departments, onAddContributorAff, onDeleteContributorAff, onInputChange) => {
  const affs = taggData.affiliations || {};
  const rors = taggData.rors || {};

  // Create affiliationIds if not exists
  if (!contributor.affiliationIds) {
    contributor.affiliationIds = [];
  }

  const mainAff = contributor.affiliationIds && contributor.affiliationIds.length > 0 ?
    contributor.affiliationIds.map(aid => lineAff(contributor, aid, affs, onDeleteContributorAff, rors)) : '';
  contributor.affiliations = contributor.affiliationIds.map(aid => affs[aid]);

  const moreAff = secAff(fields, contributor, countries, organizations, departments, onAddContributorAff, onDeleteContributorAff, onInputChange) || '';

  return (
    <span>
      {mainAff}
      {moreAff}
    </span>
  );
};

export default class RepoReviewAuthorsModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // eslint-disable-next-line react/destructuring-assignment
      taggData: null,
      leaders: null,
      modalShow: false,
      selectedAuthors: null,
      collaborations: [],
      countries: [],
      fields: {},
      organizations: [],
      departments: [],
    };

    this.handleSelectAuthors = this.handleSelectAuthors.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.onAddAff = this.onAddAff.bind(this);
    this.onDeleteAff = this.onDeleteAff.bind(this);
    this.onAddContributorAff = this.onAddContributorAff.bind(this);
    this.onDeleteContributorAff = this.onDeleteContributorAff.bind(this);
    this.onAddNewAuthor = this.onAddNewAuthor.bind(this);
    this.onAddNewReviewer = this.onAddNewReviewer.bind(this);
    this.onSave = this.onSave.bind(this);
    this.loadOrcid = this.loadOrcid.bind(this);
    this.handleDeleteAuthor = this.handleDeleteAuthor.bind(this);
    this.handleDeleteLeader = this.handleDeleteLeader.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  componentDidMount() {
    Promise.all([
      CollaboratorFetcher.fetchMyCollaborations(),
      PublicFetcher.fetchAllAffiliationData(),
    ]).then(
      ([
        collaborationsResult,
        affiliationData,
      ]) => {
        const collaborations = collaborationsResult?.authors || [];

        // Process countries from the hierarchical data structure
        const countries = affiliationData?.countries || [];
        const formattedCountries = countries
          .filter(country => country != null && country !== '')
          .map(country => ({ label: country, value: country }));

        // Process organizations from the hierarchical data structure
        const organizationData = affiliationData?.organizations || {};
        const organizations = Object.keys(organizationData)
          .filter(org => org != null && org !== '')
          .map(org => ({
            label: org,
            value: org,
            ror_id: organizationData[org].ror_id,
            country: organizationData[org].country
          }));

        // Process departments from the hierarchical data structure
        const departments = [];
        Object.keys(organizationData).forEach(org => {
          const orgDepartments = organizationData[org].departments || {};
          Object.keys(orgDepartments).forEach(dept => {
            if (dept && dept.length > 1) {
              departments.push({
                label: dept,
                value: dept,
                organization: org
              });
            }
          });
        });

        console.log('Processed affiliation data:', {
          countriesCount: formattedCountries.length,
          organizationsCount: organizations.length,
          departmentsCount: departments.length
        });

        this.setState({
          collaborations,
          countries: formattedCountries,
          organizations,
          departments,
        });
      }
    ).catch(error => {
      console.error('Error fetching affiliations data:', error);
      this.setState({
        collaborations: [],
        countries: [],
        organizations: [],
        departments: [
          { label: 'Institute of Organic Chemistry', value: 'Institute of Organic Chemistry' },
          { label: 'Department of Chemistry', value: 'Department of Chemistry' },
          { label: 'School of Science', value: 'School of Science' },
        ]
      });
    });
  }

  componentWillUnmount() {
    this.setState({
      taggData: null,
      leaders: null,
    });
  }

  handleInputChange(type, ev) {
    let { fields } = this.state;

    switch (type) {
      case 'country':
        fields.country = ev && ev.value;
        break;
      case 'organization':
        fields.organization = ev && ev.value;
        break;
      case 'department':
        fields.department = ev && ev.value;
        break;
      default:
        if (typeof fields === 'undefined') {
          fields = {};
        }

        // Handle organization change to reset the department if needed
        if (type.includes('@line_organization')) {
          const creatorId = type.split('@')[0];

          // Set the organization value first
          fields[type] = ev && ev.value;

          // Reset department when organization changes
          if (fields[`${creatorId}@line_department`]) {
            // Check if the department belongs to the selected organization
            const { departments } = this.state;
            const selectedOrg = ev && ev.value;
            const currentDept = fields[`${creatorId}@line_department`];

            const deptBelongsToOrg = departments.some(
              dept => dept.value === currentDept &&
                     (dept.organization === selectedOrg || !dept.organization)
            );

            if (!deptBelongsToOrg) {
              // Reset department if it doesn't belong to the selected organization
              fields[`${creatorId}@line_department`] = '';

              // Force a complete state update to ensure proper re-render with styles
              this.setState({ fields }, () => {
                // Use forceUpdate to ensure styles are re-applied
                this.forceUpdate();
              });

              // Return early to prevent the normal setState at the end
              return;
            }
          }
        } else {
          // For non-organization fields, just set the value
          fields[type] = ev && ev.value;
        }
    }

    // Normal setState for most cases
    this.setState({ fields });
  }

  handleSelectAuthors(val) {
    if (val) {
      this.setState({ selectedAuthors: val });
    }
  }

  handleDeleteLeader(leader) {
    const leaders = this.state.leaders || this.props.leaders;
    const newLeaders = filter(leaders, o => o.id !== leader.id);
    this.setState({ leaders: newLeaders });
  }

  handleDeleteAuthor(author) {
    const taggData = this.state.taggData || this.props.taggData;
    const { creators, author_ids } = taggData;
    taggData.creators = filter(creators, o => o.id !== author.id);
    taggData.author_ids = filter(author_ids, o => o !== author.id);
    this.setState({
      taggData,
    });
  }

  handleClose() {
    this.setState({ taggData: null, leaders: null, modalShow: false });
  }

  onAddNewAuthor() {
    const { selectedAuthors, collaborations } = this.state;
    const taggData = this.state.taggData || this.props.taggData;
    const { affiliations, creators, affiliation_ids, author_ids } = taggData;

    const coidx = findIndex(
      collaborations,
      o => o.id === selectedAuthors.value
    );
    const selCol = collaborations[coidx];
    const affIds = selCol.current_affiliations.map(ca => ca.id);

    // eslint-disable-next-line array-callback-return
    selCol.current_affiliations.map(ca => {
      affiliations[ca.id] = [ca.department, ca.organization, ca.country].join(
        ', '
      );
    });

    const newAuthor = {
      id: selCol.id,
      familyName: selCol.last_name,
      givenName: selCol.first_name,
      name: selCol.name,
      ORCID: selCol.orcid,
      affiliationIds: affIds,
    };

    creators.push(newAuthor);

    taggData.creators = creators;
    taggData.affiliation_ids = uniq(
      flattenDeep(affiliation_ids.concat(affIds))
    );
    author_ids.push(newAuthor.id);
    taggData.author_ids = author_ids;
    taggData.affiliations = affiliations;
    this.setState({ taggData, selectedAuthors: null });
  }

  onAddNewReviewer() {
    const { selectedAuthors, collaborations } = this.state;
    const leaders = this.state.leaders || this.props.leaders;

    const coidx = findIndex(
      collaborations,
      o => o.id === selectedAuthors.value
    );
    const selCol = collaborations[coidx];

    const newLeader = {
      id: selCol.id,
      name: selCol.name,
    };

    leaders.push(newLeader);
    this.setState({ leaders, selectedAuthors: null });
  }

  onAddContributorAff(contributor) {
    const { fields } = this.state;
    const taggData = this.state.taggData || this.props.taggData;
    const department = fields[`${contributor.id}@line_department`];
    const organization = fields[`${contributor.id}@line_organization`];
    const country = fields[`${contributor.id}@line_country`];
    const { affiliations, affiliation_ids } = taggData;

    // Ensure contributor has affiliationIds array
    if (!contributor.affiliationIds) {
      contributor.affiliationIds = [];
    }

    const params = {
      department,
      organization,
      country,
    };

    UsersFetcher.findAndCreateAff(params).then(result => {
      if (result.error) {
        alert(result.error);
      } else {
        affiliations[result.id] = result.aff_output;
        contributor.affiliationIds.push(result.id);

        // Clear fields after adding
        fields[`${contributor.id}@line_department`] = '';
        fields[`${contributor.id}@line_organization`] = '';
        fields[`${contributor.id}@line_country`] = '';

        taggData.affiliations = affiliations;
        affiliation_ids.push(result.id);
        taggData.affiliation_ids = uniq(flattenDeep(affiliation_ids));
        taggData.contributors = contributor;

        this.setState({ taggData, fields });
      }
    });
  }

  onDeleteContributorAff(contributor, aid) {
    const taggData = this.state.taggData || this.props.taggData;

    if (!contributor.affiliationIds) {
      contributor.affiliationIds = [];
    }

    contributor.affiliationIds = contributor.affiliationIds.filter(id => id !== aid);
    taggData.contributors = contributor;

    this.setState({ taggData });
  }

  onAddAff(g) {
    const { fields } = this.state;
    const taggData = this.state.taggData || this.props.taggData;
    const department = fields[`${g.id}@line_department`];
    const organization = fields[`${g.id}@line_organization`];
    const country = fields[`${g.id}@line_country`];
    const { affiliations, creators, affiliation_ids } = taggData;

    const params = {
      department,
      organization,
      country,
    };

    UsersFetcher.findAndCreateAff(params).then(result => {
      if (result.error) {
        alert(result.error);
      } else {
        affiliations[result.id] = result.aff_output;
        g.affiliationIds.push(result.id);
        const idx = findIndex(creators, o => o.id === g.id);
        // authors.splice(idx, 1, result.user);
        fields[`${g.id}@line_department`] = '';
        fields[`${g.id}@line_organization`] = '';
        fields[`${g.id}@line_country`] = '';
        taggData.affiliations = affiliations;
        // eslint-disable-next-line camelcase
        affiliation_ids.push(result.id);
        taggData.affiliation_ids = uniq(flattenDeep(affiliation_ids));
        taggData.creators[idx] = g;

        this.setState({ taggData, fields });
      }
    });
  }

  onDeleteAff(g, aid) {
    // eslint-disable-next-line react/destructuring-assignment
    const taggData = this.state.taggData || this.props.taggData;
    const { creators } = taggData;

    g.affiliationIds = g.affiliationIds.filter(id => id !== aid);
    const cx = findIndex(creators, o => o.id === g.id);
    taggData.creators[cx] = g;
    this.setState({ taggData });
  }

  onSave() {
    const { taggData, leaders, collaborations } = this.state;
    const { element } = this.props;
    const elementId = element.element_id || element.id;
    const elementType = element.element_type || element.elementType;

    if (taggData == null && leaders == null) {
      alert('no changes!');
      return true;
    }

    if (taggData != null) {
      const { creators } = taggData;
      const authorCount = (creators || []).length;

      if (authorCount > 0 && !this.refBehalfAsAuthor.checked) {
        alert(
          `Please confirm you are contributing on behalf of the author${
            authorCount > 0 ? 's' : ''
          }.'`
        );
        return true;
      }
    }

    if (leaders != null) {
      const filterAcc = collaborations.filter(
        ({ id, type }) =>
          leaders.some(leader => leader.id === id) && type === 'Collaborator'
      );
      if (filterAcc.length > 0) {
        alert(
          'The selected collaborator does not have an account and cannot be a group lead reviewer.'
        );
        return true;
      }
    }
    RepositoryFetcher.saveRepoAuthors({
      taggData,
      leaders,
      elementId,
      elementType,
    }).then(result => {
      if (result.error) {
        // eslint-disable-next-line no-alert
        alert(result.error);
      } else {
        if (elementType === 'Reaction') {
          ReviewActions.displayReviewReaction(elementId);
        } else if (elementType === 'Sample') {
          ReviewActions.displayReviewSample(elementId);
        }
        this.setState({ taggData: null, modalShow: false });
      }
    });
    return true;
  }

  loadOrcid() {
    const taggData = this.state.taggData || this.props.taggData;
    const { creators, contributors, author_ids } = taggData;
    let ids = [];
    ids.push(contributors.id);
    ids = ids.concat(author_ids);
    CollaboratorFetcher.loadOrcidByUserId({ ids }).then(result => {
      const orcids = result.orcids || [];
      const cx = findIndex(orcids, o => o.id === contributors.id);
      if (cx > -1) {
        contributors.ORCID = orcids[cx].orcid;
      }

      creators.forEach((creator, idx) => {
        const cix = findIndex(orcids, o => o.id === creator.id);
        if (cix > -1) {
          creators[idx].ORCID = orcids[cix].orcid;
        }
      });
      taggData.creators = creators;
      taggData.contributors = contributors;
      this.setState({ taggData });
    });
  }

  contributor() {
    const { countries, organizations, departments, fields } = this.state;
    const taggData = this.state.taggData || this.props.taggData;
    const contributors = taggData?.contributors || {};

    const orcid =
      contributors.ORCID == null ? (
        ''
      ) : (
        <OrcidIcon orcid={contributors.ORCID} />
      );

    // Display contributor's existing affiliations with management table
    return (
      <div>
        <h5>
          <b>Contributor:</b>
        </h5>
        {orcid}
        {contributors.name}
        <br />
        <Table responsive condensed hover className="contributor-affiliation-table" style={{ marginTop: '10px', minWidth: '500px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th colSpan="5">Contributor Affiliations</th>
            </tr>
          </thead>
          <tbody>
            {contributorAffBody(
              taggData,
              contributors,
              fields,
              countries,
              organizations,
              departments,
              this.onAddContributorAff,
              this.onDeleteContributorAff,
              this.handleInputChange
            )}
          </tbody>
        </Table>
      </div>
    );
  }

  selectUsers() {
    const { selectedAuthors, collaborations } = this.state;
    const { isEmbargo } = this.props;
    // eslint-disable-next-line react/destructuring-assignment
    const taggData = this.state.taggData || this.props.taggData || {};
    const creators = taggData?.creators || [];
    const authorIds = taggData?.author_ids || [];

    const filterCol = collaborations?.filter(
      ({ id }) => !(authorIds || []).includes(id)
    );

    const options = filterCol.map(c => ({
      name: c.name,
      label: c.name,
      value: c.id,
    }));

    const authorCount = (creators || []).length;

    const btnReviewer = isEmbargo ? (
      <span />
    ) : (
      <Button
        bsStyle="info"
        onClick={() => this.onAddNewReviewer()}
        disabled={!selectedAuthors}
      >
        <i className="fa fa-plus" />
        Add to Reviewer List
      </Button>
    );

    return (
      <div>
        <Checkbox
          inputRef={ref => {
            this.refBehalfAsAuthor = ref;
          }}
        >
          I am contributing on behalf of the author{authorCount > 0 ? 's' : ''}
        </Checkbox>
        <InputGroup>
          <InputGroup.Addon>My Collaboration(s)</InputGroup.Addon>
          <Select
            searchable
            placeholder="Select authors from my collaboration"
            backspaceRemoves
            value={selectedAuthors}
            defaultValue={selectedAuthors}
            valueKey="value"
            labelKey="label"
            matchProp="name"
            options={options}
            onChange={this.handleSelectAuthors}
          />
          <InputGroup.Button>
            <Button
              bsStyle="success"
              onClick={() => this.onAddNewAuthor()}
              disabled={!selectedAuthors}
            >
              <i className="fa fa-plus" />
              Add to Author List
            </Button>
            {btnReviewer}
          </InputGroup.Button>
        </InputGroup>
      </div>
    );
  }

  renderLeaders() {
    const { disabled, isEmbargo } = this.props;
    const leaders = this.state.leaders || this.props.leaders;
    if (isEmbargo) {
      return '';
    }

    const tbodyLeaders = leaders?.map(leader => (
      <tbody key={`tbody_${uuid.v1()}`}>
        <tr key={`tbody_${uuid.v1()}`}>
          <td>
            <DeleteConfirmBtn
              label={leader.name}
              onClickYes={() => this.handleDeleteLeader(leader)}
            />
            &nbsp;
          </td>
          <td>{leader.name}</td>
        </tr>
      </tbody>
    ));

    return (
      <div>
        <h4>Group Lead / Additional Reviewer List</h4>
        <Table responsive condensed hover>
          <thead>
            <tr style={{ backgroundColor: '#ddd' }}>
              <th width="5%">Action</th>
              <th width="95%">Name</th>
            </tr>
          </thead>
          {tbodyLeaders || ''}
        </Table>
      </div>
    );
  }

  renderAuthors() {
    const { countries, organizations, departments, fields } = this.state;
    // eslint-disable-next-line react/destructuring-assignment
    const taggData = this.state.taggData || this.props.taggData;
    const creators = taggData?.creators || [];

    const tbodyAuthors = creators.map(creator => (
      <tbody key={`tbody_${uuid.v1()}`}>
        <tr key={`tbody_${uuid.v1()}`}>
          <td>
            <DeleteConfirmBtn
              label={creator.name}
              onClickYes={() => this.handleDeleteAuthor(creator)}
            />
            &nbsp;
          </td>
          <td>{creator.name}</td>
          <td>
            <OrcidIcon orcid={creator.ORCID} />
            {creator.ORCID}
          </td>
          <td>
            {affbody(
              taggData,
              creator,
              fields,
              countries,
              organizations,
              departments,
              this.onAddAff,
              this.onDeleteAff,
              this.handleInputChange
            )}
          </td>
        </tr>
      </tbody>
    ));

    return (
      <div>
        <h4>Author List</h4>
        <Table responsive condensed hover style={{ height: '260px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ddd' }}>
              <th width="5%">Action</th>
              <th width="10%">Name</th>
              <th width="15%">ORCID iD</th>
              <th width="70%">
                <Table style={{ backgroundColor: 'unset', margin: 'unset' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: 'unset' }} width="90%">
                        Affiliation
                      </td>
                      <td style={{ padding: 'unset' }} width="10%">
                        &nbsp;
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </th>
            </tr>
          </thead>
          {tbodyAuthors || ''}
        </Table>
      </div>
    );
  }

  renderButton() {
    const { disabled, isEmbargo } = this.props;
    let btn = (
      <Button
        style={{ marginLeft: '5px' }}
        onClick={() => this.setState({ modalShow: true })}
      >
        <i className="fa fa-users" />
        &nbsp;Authors & Reviewers
      </Button>
    );
    if (isEmbargo || disabled === true) {
      btn = (
        <Button
          disabled={disabled}
          onClick={() => this.setState({ modalShow: true })}
        >
          <i className="fa fa-plus" />
        </Button>
      );
    }
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="tt_metadata">Add/Remove Authors & Reviewers</Tooltip>
        }
      >
        {btn}
      </OverlayTrigger>
    );
  }

  renderButtons() {
    return (
      <ButtonToolbar>
        <Button bsStyle="warning" onClick={() => this.handleClose()}>
          Close
        </Button>
        <Button bsStyle="info" onClick={() => this.loadOrcid()}>
          get ORCID iD
        </Button>
        <Button bsStyle="success" onClick={() => this.onSave()}>
          Save
        </Button>
      </ButtonToolbar>
    );
  }

  render() {
    const { modalShow } = this.state;
    const { schemeOnly } = this.props;
    if (schemeOnly === true) {
      return '';
    }

    return (
      <span>
        {/* Add global CSS styles for affiliation fields to ensure consistent width */}
        <style>{affFieldStyles}</style>
        {this.renderButton()}
        <Modal
          show={modalShow}
          onHide={this.handleClose}
          dialogClassName="author-modal-dialog"
        >
          <Modal.Body style={{ overflow: 'auto' }}>
            <div>
              {this.contributor()}
              {this.selectUsers()}
            </div>
            <br />
            <div>{this.renderAuthors()}</div>
            <div>{this.renderLeaders()}</div>
            {this.renderButtons()}
          </Modal.Body>
        </Modal>
      </span>
    );
  }
}

RepoReviewAuthorsModal.propTypes = {
  element: PropTypes.object.isRequired,
  leaders: PropTypes.array,
  disabled: PropTypes.bool,
  isEmbargo: PropTypes.bool,
  schemeOnly: PropTypes.bool,
  taggData: PropTypes.object,
};

RepoReviewAuthorsModal.defaultProps = {
  taggData: {},
  leaders: [],
  schemeOnly: false,
  isEmbargo: false,
  disabled: false,
};
