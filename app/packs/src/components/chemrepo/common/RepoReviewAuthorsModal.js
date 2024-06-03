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
import { OrcidIcon } from 'src/repoHome/RepoCommon';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import SelectionField from 'src/components/common/SelectionField';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';
import DeleteConfirmBtn from 'src/components/common/DeleteConfirmBtn';

const addAffTooltip = (
  <Tooltip id="addAff_tooltip">Add affiliation for this Publication</Tooltip>
);
const removeAffTooltip = (
  <Tooltip id="rmAff_tooltip">
    Remove this affiliation from this Publication
  </Tooltip>
);

const lineAff = (creator, aid, affs, onDeleteAff) => {
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
      </td>
      <td align="right" width="10%">
        {removeBtn}
      </td>
    </tr>
  );
};

const secAff = (fields, g, countries, organizations, departments, onAddAff, onDeleteAff, onInputChange) => {
  return (
    <tr className="aff-line" style={{ lineHeight: '2em' }}>
      <td width="30%">
        <SelectionField
          options={departments}
          value={(fields[`${g.id}@line_department`]) || ''}
          field={`${g.id}@line_department`}
          placeholder="e.g. Institute of Organic Chemistry"
          onChange={onInputChange}
          isCreatable
        />
      </td>
      <td width="40%">
        <SelectionField
          options={organizations}
          value={(fields[`${g.id}@line_organization`]) || ''}
          field={`${g.id}@line_organization`}
          placeholder="e.g. Karlsruhe Institute of Technology"
          onChange={onInputChange}
          isCreatable
        />
      </td>
      <td width="20%">
        <SelectionField
          options={countries}
          value={(fields[`${g.id}@line_country`]) || ''}
          field={`${g.id}@line_country`}
          onChange={onInputChange}
          placeholder="e.g. Germany"
        />
      </td>
      <td width="10%" align="right">
        <OverlayTrigger placement="right" overlay={addAffTooltip}>
          <Button bsSize="xsmall" bsStyle="success" onClick={() => onAddAff(g)}>
            <i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </td>
    </tr>
  );
};

const affbody = (taggData, creator, fields, countries, organizations, departments, onAddAff, onDeleteAff, onInputChange) => {
  const affs = taggData.affiliations || {};
  const mainAff = creator.affiliationIds && creator.affiliationIds.length > 0 ?
    creator.affiliationIds.map(aid => lineAff(creator, aid, affs, onDeleteAff)) : '';
  const moreAff = secAff(fields, creator, countries, organizations, departments, onAddAff, onDeleteAff, onInputChange) || '';

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
      PublicFetcher.affiliations('countries'),
      PublicFetcher.affiliations('organizations'),
      PublicFetcher.affiliations('departments'),
    ]).then(
      ([
        collaborationsResult,
        countriesResult,
        organizationsResult,
        departmentsResult,
      ]) => {
        const collaborations = collaborationsResult?.authors || [];

        const formatAffiliations = result =>
          result?.affiliations
            ?.map(a => ({ label: a, value: a }))
            .filter(a => a.value && a.value.length > 1);
        const countries = formatAffiliations(countriesResult);
        const organizations = formatAffiliations(organizationsResult);
        const departments = formatAffiliations(departmentsResult);
        this.setState({
          collaborations,
          countries,
          organizations,
          departments,
        });
      }
    );
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
        fields[type] = ev && ev.value;
    }
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

    const ax = findIndex(g.affiliationIds, o => o.id === aid);
    g.affiliationIds.splice(ax, 1);
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
    const taggData = this.state.taggData || this.props.taggData;
    const contributors = taggData?.contributors || {};

    const orcid =
      contributors.ORCID == null ? (
        ''
      ) : (
        <OrcidIcon orcid={contributors.ORCID} />
      );
    const aff =
      contributors.affiliations &&
      Object.keys(contributors.affiliations).map(k => (
        <div key={uuid.v4()}> -{contributors.affiliations[k]}</div>
      ));
    return (
      <div>
        <h5>
          <b>Contributor:</b>
        </h5>
        {orcid}
        {contributors.name} <br /> {aff}{' '}
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
        <h4>Additional Reviewer List</h4>
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
        <Table responsive condensed hover>
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
