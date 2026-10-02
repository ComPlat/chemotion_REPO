/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  OverlayTrigger,
  Tooltip,
  Form,
  Card,
  ListGroup,
  Badge,
} from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import { findIndex, filter, uniq, flattenDeep, cloneDeep } from 'lodash';
import { OrcidIcon, RorLink } from 'src/repo/repoHome/RepoCommon';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import SelectionField from 'src/repo/others/SelectionField';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import ReviewActions from 'src/repo/actions/ReviewActions';
import DeleteConfirmBtn from 'src/repo/others/DeleteConfirmBtn';
import EmbargoActions from 'src/repo/actions/EmbargoActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import RepoConst from 'src/repo/chemrepo/common/RepoConst';

const orcidBadge = (orcid) => {
  if (orcid == null) return null;
  return (
    <Badge bg="light" className="border text-secondary p-1 px-2 d-flex align-items-center">
      <span className="me-2"><OrcidIcon orcid={orcid} /></span>
      {orcid}
    </Badge>
  );
};

// Add CSS styles to ensure minimum field widths
const affFieldStyles = `
  .author-modal-dialog {
    max-width: 90vw !important;
    width: 90vw !important;
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
    <OverlayTrigger placement="top" overlay={removeAffTooltip}>
      <Button
        size="sm"
        variant="danger"
        className="px-2 py-1"
        onClick={() => onDeleteAff(creator, aid)}
      >
        <i className="fa fa-trash-o" />
      </Button>
    </OverlayTrigger>
  );
  return (
    <div key={uuid.v4()} className="d-flex align-items-center justify-content-between p-1 mb-1 bg-light border rounded">
      <div className="d-flex align-items-center flex-grow-1 mr-3 text-break">
        <span className="font-weight-bold" style={{ fontSize: '0.9em' }}>{affs[aid]}</span>
        {rors && rors[aid] && <span className="ml-2"><RorLink rorId={rors[aid]} /></span>}
      </div>
      <div className="ml-2">
        {removeBtn}
      </div>
    </div>
  );
};

const secAff = (fields, g, countries, organizations, departments, onAddAff, onDeleteAff, onInputChange, prefix = '') => {
  const orgKey = `${prefix}${g.id}@line_organization`;
  const deptKey = `${prefix}${g.id}@line_department`;
  const countryKey = `${prefix}${g.id}@line_country`;

  const selectedOrg = fields[orgKey] || '';

  // Filter departments by the selected organization
  const filteredDepartments = selectedOrg
    ? departments.filter(dept => dept.organization === selectedOrg || !dept.organization)
    : departments;

  // Check if fields meet minimum length requirements
  const orgValue = fields[orgKey] || '';
  const deptValue = fields[deptKey] || '';
  const countryValue = fields[countryKey] || '';

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

  return (
    <div className="d-flex flex-wrap align-items-start bg-white p-2 border rounded shadow-sm mt-1" style={{ gap: '0.5rem' }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div className="small font-weight-bold mb-1 text-secondary">Organization</div>
        <SelectionField
          options={organizations}
          value={orgValue}
          field={orgKey}
          placeholder="e.g. Karlsruhe Institute of Technology"
          onChange={onInputChange}
          isCreatable
        />
        {!isOrgValid && <small className="text-danger mt-1 d-block">Min 3 chars required</small>}
      </div>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div className="small font-weight-bold mb-1 text-secondary">Department</div>
        <SelectionField
          options={filteredDepartments}
          value={deptValue}
          field={deptKey}
          placeholder="e.g. Institute of Organic Chemistry"
          onChange={onInputChange}
          isCreatable
        />
        {!isDeptValid && <small className="text-danger mt-1 d-block">Min 3 chars required</small>}
      </div>
      <div style={{ flex: 1, minWidth: '150px' }}>
        <div className="small font-weight-bold mb-1 text-secondary">Country</div>
        <SelectionField
          options={countries}
          value={countryValue}
          field={countryKey}
          onChange={onInputChange}
          placeholder="e.g. Germany"
        />
        {!isCountryValid && <small className="text-danger mt-1 d-block">Min 3 chars required</small>}
      </div>
      <div className="d-flex align-items-end mb-1" style={{ height: '62px' }}>
        <OverlayTrigger placement="top" overlay={addAffTooltip}>
          <Button
            variant="success"
            className="rounded px-2 py-1 shadow-sm"
            onClick={() => onAddAff(g)}
            disabled={!isAddButtonEnabled}
          >
            <i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </div>
    </div>
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
    <div className="w-100 mt-2">
      <div className="mb-2">
        {mainAff}
      </div>
      <div>
        {moreAff}
      </div>
    </div>
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
console.log(contributor)
  const mainAff = contributor.affiliationIds && contributor.affiliationIds.length > 0 ?
    contributor.affiliationIds.map(aid => lineAff(contributor, aid, affs, onDeleteContributorAff, rors)) : '';
  contributor.affiliations = contributor.affiliationIds.map(aid => affs[aid]);

  const moreAff = secAff(fields, contributor, countries, organizations, departments, onAddContributorAff, onDeleteContributorAff, onInputChange, 'contributor_') || '';

  return (
    <div className="w-100">
      <div className="mb-2">
        {mainAff}
      </div>
      <div>
        {moreAff}
      </div>
    </div>
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

  componentDidUpdate(prevProps, prevState) {
    if (this.state.modalShow && !prevState.modalShow) {
      console.log(this.props.taggData);
      this.setState({
        taggData: cloneDeep(this.props.taggData || {}),
        leaders: cloneDeep(this.props.leaders || []),
      });
    }
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
    const department = fields[`contributor_${contributor.id}@line_department`];
    const organization = fields[`contributor_${contributor.id}@line_organization`];
    const country = fields[`contributor_${contributor.id}@line_country`];
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
        fields[`contributor_${contributor.id}@line_department`] = '';
        fields[`contributor_${contributor.id}@line_organization`] = '';
        fields[`contributor_${contributor.id}@line_country`] = '';

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
        console.log(elementType, elementId)
        if (elementType === 'Reaction') {
          ReviewActions.displayReviewReaction(elementId);
        } else if (elementType === 'Sample') {
          ReviewActions.displayReviewSample(elementId);
        } else if (elementType === 'Collection') {
          EmbargoActions.getEmbargoElements(elementId);
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

    // Display contributor's existing affiliations with management table
    return (
      <div className="mb-2 border-0">
        <div className="border-bottom-0">
          <div className="d-flex align-items-center gap-2" style={{ minHeight: '32px' }}>
            <div className="d-flex align-items-baseline fw-bold gap-2">
              <span>Contributor:</span>
              <span className="fw-normal text-dark">{contributors.name}</span>
            </div>
            <div className="ml-3 d-flex align-items-center">
              {orcidBadge(contributors.ORCID)}
            </div>
          </div>
        </div>
        <div>
          <div className="p-2">
            <h6 className="fw-bold text-secondary mb-2" style={{ fontSize: '0.9rem' }}><i className="fa fa-building-o mr-1" /> Affiliations</h6>
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
          </div>
        </div>
      </div>
    );
  }

  selectUsers() {
    const { selectedAuthors, collaborations } = this.state;
    const { isEmbargo } = this.props;
    // eslint-disable-next-line react/destructuring-assignment
    const taggData = this.state.taggData || this.props.taggData || {};
    const authorIds = taggData?.author_ids || [];

    const filterCol = collaborations?.filter(
      ({ id }) => !(authorIds || []).includes(id)
    );

    const options = filterCol.map(c => ({
      name: c.name,
      label: c.name,
      value: c.id,
    }));

    const btnReviewer = isEmbargo ? (
      <span />
    ) : (
      <Button
        variant="info"
        onClick={() => this.onAddNewReviewer()}
        disabled={!selectedAuthors}
      >
        <i className="fa fa-plus" />
        Add to Reviewer List
      </Button>
    );

    return (
      <>
        <div className="d-flex align-items-center flex-wrap gap-2 p-3">
          <div className="font-weight-bold text-nowrap">My Collaborators:</div>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <Select
              searchable
              placeholder="Select an author from my collaboration"
              backspaceRemoves
              value={selectedAuthors}
              defaultValue={selectedAuthors}
              valueKey="value"
              labelKey="label"
              matchProp="name"
              options={options}
              onChange={this.handleSelectAuthors}
            />
          </div>
          <div className="d-flex">
            <Button
              variant="success"
              onClick={() => this.onAddNewAuthor()}
              disabled={!selectedAuthors}
              className="font-weight-bold shadow-sm py-1"
            >
              <i className="fa fa-plus mr-1" />
              Add Author
            </Button>
            {btnReviewer}
          </div>
        </div>
      </>
    );
  }

  renderBehalfAsAuthor() {
    const taggData = this.state.taggData || this.props.taggData || {};
    const creators = taggData?.creators || [];
    const authorCount = creators.length;

    return (
      <Form.Check
        ref={ref => {
          this.refBehalfAsAuthor = ref;
        }}
        type="checkbox"
        id="behalf-checkbox"
        className="font-weight-bold text-primary mb-0"
        label={`I am contributing on behalf of the author${authorCount > 0 ? 's' : ''}`}
      />
    );
  }

  renderLeaders() {
    const { isEmbargo } = this.props;
    const leaders = this.state.leaders || this.props.leaders;
    if (isEmbargo) {
      return '';
    }

    const listLeaders = leaders?.map(leader => (
      <ListGroup.Item key={`leader_${uuid.v1()}`} className="d-flex align-items-center border-left-0 border-right-0 py-1">
        <div style={{ marginRight: '15px' }}>
          <DeleteConfirmBtn
            label={leader.name}
            onClickYes={() => this.handleDeleteLeader(leader)}
          />
        </div>
        <div className="flex-grow-1 font-weight-bold">
          {leader.name}
        </div>
      </ListGroup.Item>
    ));

    return (
      <Card className="mb-2 shadow-sm border-0">
        <Card.Header className="bg-info text-white d-flex align-items-center py-2 gap-2">
          <div className="font-weight-bold"><i className="fa fa-gavel mr-2" /> Group Leads & Additional Reviewers</div>
          <Badge bg="light" className="text-primary rounded-pill">{leaders?.length || 0}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {leaders && leaders.length > 0 ? (
            <ListGroup variant="flush">
              {listLeaders}
            </ListGroup>
          ) : (
            <div className="p-3 text-center text-muted font-italic">
              No additional reviewers assigned
            </div>
          )}
        </Card.Body>
      </Card>
    );
  }

  renderAuthors() {
    const { countries, organizations, departments, fields } = this.state;
    // eslint-disable-next-line react/destructuring-assignment
    const taggData = this.state.taggData || this.props.taggData;
    const creators = taggData?.creators || [];

    const listAuthors = creators.map((creator, index) => (
      <ListGroup.Item key={`auth_${uuid.v1()}`} className="border-left-0 border-right-0 py-2 px-3" variant={index % 2 === 0 ? "light" : null}>
        <div className="d-flex align-items-start">
          <div className="pt-1" style={{ marginRight: '10px' }}>
            <DeleteConfirmBtn
              label={creator.name}
              onClickYes={() => this.handleDeleteAuthor(creator)}
            />
          </div>

          <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
            <div className="d-flex flex-wrap align-items-center mb-1" style={{ gap: '10px' }}>
              <h6 className="mb-0 font-weight-bold text-dark">{creator.name}</h6>
              {orcidBadge(creator.ORCID)}
            </div>

            <div className="w-100 pl-2 mt-1 border-start border-5 border-success">
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
            </div>
          </div>
        </div>
      </ListGroup.Item>
    ));

    return (
      <Card className="mb-2 shadow-sm border-0">
        <Card.Header className="bg-info text-white d-flex align-items-center py-2 gap-2">
            Author List <Badge bg="light" className="text-primary rounded-pill ml-2">{creators.length}</Badge>
          <Button variant="light" size="sm" className="font-weight-bold shadow-sm py-0 px-2" onClick={() => this.loadOrcid()}>
            <i className="fa fa-refresh mr-1" /> Refresh Author ORCID
          </Button>
        </Card.Header>
        <Card.Body className="p-0" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {this.selectUsers()}
          {creators.length > 0 ? (
            <ListGroup variant="flush">
              {listAuthors}
            </ListGroup>
          ) : (
            <div className="p-3 text-center text-muted font-italic">
              No authors added yet. Add an author using your collaborations above.
            </div>
          )}
        </Card.Body>
      </Card>
    );
  }

  renderButton() {
    const { disabled, isEmbargo, compact } = this.props;

    let btn = (
      <Button
        variant="light"
        size="xsm"
        onClick={() => this.setState({ modalShow: true })}
      >
        <i className="fa fa-users" />
        {!compact && <>&nbsp;Authors & Reviewers</>}
      </Button>
    );
    if (isEmbargo || disabled === true) {
      btn = (
        <Button
          disabled={disabled}
          size="sm"
          variant="light"
          onClick={() => this.setState({ modalShow: true })}
        >
          <i className="fa fa-users" aria-hidden="true" />
          {!compact && ' Authors & Reviewers'}
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
      <>
        <Button variant="secondary" onClick={() => this.handleClose()}>
          Close
        </Button>
        <Button variant="primary" onClick={() => this.onSave()}>
          Save Changes
        </Button>
      </>
    );
  }

  render() {
    const { modalShow } = this.state;
    const { schemeOnly } = this.props;
    if (schemeOnly === true) {
      return '';
    }

    const { currentUser } = UserStore.getState();
    if (currentUser?.type === RepoConst.U_TYPE.ANONYMOUS) {
      return '';
    }

    return (
      <>
        {/* Add global CSS styles for affiliation fields to ensure consistent width */}
        <style>{affFieldStyles}</style>
        {this.renderButton()}
        <Modal
          show={modalShow}
          onHide={this.handleClose}
          dialogClassName="author-modal-dialog"
          size="xl"
          centered
          backdrop="static"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fa fa-users" style={{ marginRight: '10px' }} /> Authors & Reviewers
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light pt-3" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="container-fluid p-0">
              {this.contributor()}
              {this.renderAuthors()}
              {this.renderLeaders()}
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-light py-1 justify-content-start">
            {this.renderButtons()}
            {this.renderBehalfAsAuthor()}
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

RepoReviewAuthorsModal.propTypes = {
  element: PropTypes.object,
  leaders: PropTypes.array,
  disabled: PropTypes.bool,
  isEmbargo: PropTypes.bool,
  schemeOnly: PropTypes.bool,
  taggData: PropTypes.object,
  compact: PropTypes.bool,
};

RepoReviewAuthorsModal.defaultProps = {
  element: {},
  taggData: {},
  leaders: [],
  schemeOnly: false,
  isEmbargo: false,
  disabled: false,
  compact: false,
};