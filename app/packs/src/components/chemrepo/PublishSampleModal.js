/* eslint-disable react/no-array-index-key */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel,
  PanelGroup,
  Modal,
  Table,
  ListGroupItem,
  ListGroup,
  Button,
  Checkbox,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import Select from 'react-select';
import Immutable from 'immutable';
import { get, isUndefined, sortedUniq } from 'lodash';
import Sample from 'src/models/Sample';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';
import UserStore from 'src/stores/alt/stores/UserStore';
import RepositoryActions from 'src/stores/alt/repo/actions/RepositoryActions';
import {
  groupByCitation,
  Citation,
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import {
  MoleculeInfo,
  EmbargoCom,
  isNmrPass,
  isDatasetPass,
} from 'src/repoHome/RepoCommon';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import EmbargoFetcher from 'src/repo/fetchers/EmbargoFetcher';
import { CitationTypeMap, CitationTypeEOL } from 'src/components/CitationType';
import OrcidIcon from 'src/components/chemrepo/common/Orcid';
import SubmissionCheck from 'src/components/chemrepo/SubmissionCheck';
import UserAffInfo from 'src/components/chemrepo/publish-helper';
import VersionComment from 'src/components/chemrepo/VersionComment';
import {
  getTagDataByTag,
  hasVersion,
} from 'src/components/chemrepo/publication-utils';

export default class PublishSampleModal extends Component {
  constructor(props) {
    super(props);
    const { currentUser } = UserStore.getState();
    const { sample } = props;
    const previousUsers = get(
      sample,
      'tag.taggable_data.previous_version.users',
      []
    );
    const selectedUsers = previousUsers
      .filter((user) => user.id !== currentUser.id)
      .map((user) => ({
        label: user.name,
        value: user.id,
      }));
    this.state = {
      sample,
      selectedUsers,
      selectedReviewers: [],
      showSelectionUser: false,
      showSelectionAnalysis: false,
      showPreview: false,
      currentUser,
      selectedRefs: [],
      collaborations: [],
      showSelectionReviewer: false,
      literatures: new Immutable.Map(),
      sortedIds: [],
      selectedEmbargo: '-1',
      selectedLicense:
        getTagDataByTag(sample, 'previous_version')?.license || 'CC BY',
      disableLicense: Boolean(
        getTagDataByTag(sample, 'previous_version')?.license
      ),
      behalfAsAuthor: previousUsers.length > 0,
      cc0Consent: { consent1: false, consent2: false },
      bundles: [],
      noEmbargo: false,
      newVersion: hasVersion(sample),
      addMeAsAuthor: true,
      addGroupLeadAsAuthor: true
    };
    this.onUserChange = this.onUserChange.bind(this);
    this.handleSampleChanged = this.handleSampleChanged.bind(this);
    this.handlePublishSample = this.handlePublishSample.bind(this);
    this.handleReserveDois = this.handleReserveDois.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.handleSelectReviewer = this.handleSelectReviewer.bind(this);
    this.loadReferences = this.loadReferences.bind(this);
    this.loadMyCollaborations = this.loadMyCollaborations.bind(this);
    this.loadBundles = this.loadBundles.bind(this);
    this.selectReferences = this.selectReferences.bind(this);
    this.handleRefCheck = this.handleRefCheck.bind(this);
    this.handleEmbargoChange = this.handleEmbargoChange.bind(this);
    this.handleLicenseChange = this.handleLicenseChange.bind(this);
    this.handleCC0ConsentChange = this.handleCC0ConsentChange.bind(this);
    this.handleVersionComment = this.handleVersionComment.bind(this);
    this.toggleAddMeAsAuthor = this.toggleAddMeAsAuthor.bind(this);
    this.toggleAddGroupLeadAsAuthor = this.toggleAddGroupLeadAsAuthor.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);

    this.loadReferences();
    this.loadBundles();
    this.loadMyCollaborations();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { currentUser } = UserStore.getState();

    const newVersion = !isUndefined(
      get(nextProps.sample, 'tag.taggable_data.previous_version')
    );
    const previousLicense = get(
      nextProps.sample,
      'tag.taggable_data.previous_version.license'
    );
    const previousUsers = get(
      nextProps.sample,
      'tag.taggable_data.previous_version.users',
      []
    );

    let behalfAsAuthor = false;
    const selectedUsers = [];
    previousUsers.forEach((user) => {
      if (user.id !== currentUser.id) {
        behalfAsAuthor = true;
        selectedUsers.push({
          label: user.name,
          value: user.id,
        });
      }
    });

    this.setState({
      sample: nextProps.sample,
      selectedLicense: isUndefined(previousLicense) ? 'CC BY' : previousLicense,
      disableLicense: !isUndefined(previousLicense),
      behalfAsAuthor,
      selectedUsers,
      newVersion,
    });
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
  }

  handleRefCheck(id) {
    let { selectedRefs } = this.state;

    if (selectedRefs.includes(id)) {
      selectedRefs = selectedRefs.filter((item) => item !== id);
    } else {
      selectedRefs.push(id);
    }
    this.setState({ selectedRefs });
  }

  loadBundles() {
    EmbargoFetcher.fetchEmbargoCollections(true).then(result => {
      const cols = result.repository || [];
      this.setState({ bundles: cols });
    });
  }

  loadMyCollaborations() {
    CollaboratorFetcher.fetchMyCollaborations().then(result => {
      if (result) {
        const collaborations = result.authors || [];

        // Find collaborators that are group leads
        const groupLeads = collaborations.filter(c => c.is_group_lead);

        // Pre-select group leads as reviewers
        const selectedReviewers = groupLeads.map(lead => ({
          label: lead.name,
          value: lead.id
        }));

        this.setState({
          collaborations,
          selectedReviewers  // Auto-select group leads as reviewers
        });
      }
    });
  }

  handleSelectUser(val) {
    if (val) {
      this.setState({ selectedUsers: val });
    }
  }

  handleSelectReviewer(val) {
    if (val) {
      this.setState({ selectedReviewers: val });
    }
  }

  handleSampleChanged(sample) {
    this.setState((prevState) => ({ ...prevState, sample }));
  }

  handlePublishSample() {
    const { onHide } = this.props;
    const {
      selectedLicense,
      disableLicense,
      cc0Consent,
      selectedUsers,
      sample,
      selectedReviewers,
      selectedRefs,
      selectedEmbargo,
    } = this.state;
    const authorCount = selectedUsers && selectedUsers.length;
    // const reviewerCount = this.state.selectedReviewers && this.state.selectedReviewers.length;
    const plural = authorCount > 0 ? 's' : '';

    if (
      selectedLicense === 'CC0' &&
      !disableLicense &&
      (!cc0Consent.consent1 || !cc0Consent.consent2)
    ) {
      alert('Please check the license section before sending your data.');
      return true;
    }

    if (!this.validateSubmission()) {
      alert('Submission Check fail. Please review your data and re-submit.');
      return true;
    }

    if (authorCount > 0 && !this.refBehalfAsAuthor.checked) {
      alert(
        `Please confirm you are contributing on behalf of the author${plural}`
      );
      return true;
    }

    if (authorCount < 1 && !this.refMeAsAuthor.checked) {
      alert("Please add an author or check 'add me as author.'");
      return true;
    }

    const analyses = sample.analysisArray();
    let publishedAnalyses = analyses.filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true')
    );

    publishedAnalyses = publishedAnalyses.filter(
      (a) =>
        a.extended_metadata &&
        (a.extended_metadata.kind || '') !== '' && // fail if analysis-type is empty
        (a.extended_metadata.status || '') === 'Confirmed' && // fail if status is not set to Confirmed
        isNmrPass(a, sample) && // fail if NMR check fail
        isDatasetPass(a)
    ); // fail if Dataset check fail

    sample.container.children.find(
      (c) => c && c.container_type === 'analyses'
    ).children = publishedAnalyses;

    LoadingActions.start();
    RepositoryActions.publishSample({
      // sample: this.state.sample,
      sample,
      coauthors: this.state.selectedUsers.map(u => u.value),
      reviewers: this.state.selectedReviewers.map(u => u.value),
      refs: this.state.selectedRefs,
      embargo: this.state.selectedEmbargo,
      license: this.state.selectedLicense,
      addMe: this.refMeAsAuthor.checked,
      addGroupLead: this.refGroupLeadAsAuthor.checked
    }, true);
    this.props.onHide();
  }

  handleReserveDois() {
    const { onPublishRefreshClose } = this.props;
    const { sample, selectedUsers } = this.state;
    LoadingActions.start();
    RepositoryActions.publishSampleReserveDois({
      sample,
      coauthors: selectedUsers.map((u) => u.value),
    });
    SamplesFetcher.fetchById(sample.id)
      .then((s) => {
        onPublishRefreshClose(s, true);
        LoadingActions.stop();
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        LoadingActions.stop();
      });
    return true;
  }

  handleEmbargoChange(selectedValue) {
    if (selectedValue) {
      this.setState({ selectedEmbargo: selectedValue });
    }
  }

  handleLicenseChange(selectedValue) {
    if (selectedValue) {
      this.setState({
        selectedLicense: selectedValue,
        cc0Consent: { consent1: false, consent2: false },
      });
    }
  }

  handleCC0ConsentChange(selectedValue, selectedType) {
    const { cc0Consent } = this.state;
    if (selectedType === 'consent1') {
      cc0Consent.consent1 = selectedValue;
    }
    if (selectedType === 'consent2') {
      cc0Consent.consent2 = selectedValue;
    }
    this.setState({ cc0Consent });
  }

  handleVersionComment(value) {
    const { sample } = this.state;
    sample.versionComment = value;
    this.setState({ sample });
  }

  handleNoEmbargoCheck() {
    const { noEmbargo } = this.state;
    this.setState({ noEmbargo: !noEmbargo });
  }

  onUserChange(state) {
    this.setState((previousState) => ({
      ...previousState,
      users: state.users,
    }));
  }

  loadReferences() {
    let { selectedRefs } = this.state;
    const { sample, newVersion } = this.state;
    LiteraturesFetcher.fetchElementReferences(sample).then((literatures) => {
      const sortedIds = groupByCitation(literatures);
      selectedRefs = selectedRefs.filter((item) => sortedIds.includes(item));

      // pre-select all refs when submitting a new version
      if (newVersion) {
        literatures.forEach((literature) => {
          if (!selectedRefs.includes(literature.literal_id)) {
            selectedRefs.push(literature.literal_id);
          }
        });
      }

      this.setState({ selectedRefs, literatures, sortedIds });
    });
  }

  validateAnalyses() {
    const { sample } = this.state;
    const publishedAnalyses = sample
      .analysisArray()
      .filter(
        (a) =>
          a.extended_metadata.publish &&
          (a.extended_metadata.publish === true ||
            a.extended_metadata.publish === 'true')
      );
    if (publishedAnalyses.length === 0) {
      return false;
    }
    return true;
  }

  // molecule-submissions mandatory check (https://git.scc.kit.edu/ComPlat/chemotion_REPO/issues/236)
  validateSubmission() {
    const { sample, selectedEmbargo, noEmbargo, newVersion } = this.state;
    if (selectedEmbargo === '-1' && !noEmbargo && !newVersion) return false;
    const analyses = sample.analysisArray();
    if (!this.validateAnalyses()) {
      return false;
    }

    let publishedAnalyses = analyses.filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true')
    );

    publishedAnalyses = publishedAnalyses.filter(
      (a) =>
        a.extended_metadata &&
        (a.extended_metadata.kind || '') !== '' && // fail if analysis-type is empty
        (a.extended_metadata.status || '') === 'Confirmed' && // fail if status is not set to Confirmed
        isNmrPass(a, sample) && // fail if NMR check fail
        isDatasetPass(a)
    ); // fail if Dataset check fail
    if (publishedAnalyses.length === 0) {
      return false;
    }
    return true;
  }

  contributor() {
    const { currentUser } = this.state;
    const orcid = OrcidIcon({ orcid: currentUser.orcid });
    const aff =
      currentUser &&
      currentUser.current_affiliations &&
      Object.keys(currentUser.current_affiliations).map((k, i) => (
        <div key={`curr-${i}`}> -{currentUser.current_affiliations[k]}</div>
      ));
    return (
      <div>
        <h5>
          <b>Contributor:&nbsp;</b>
        </h5>
        {orcid}
        {currentUser.name} <br /> {aff}{' '}
      </div>
    );
  }

  selectUsers() {
    const { selectedUsers, collaborations, addMeAsAuthor, addGroupLeadAsAuthor } = this.state;
    const options = collaborations.map(c => (
      { label: c.name, value: c.id }
    ));

    const authorInfo = selectedUsers && selectedUsers.map((a) => {
      const us = collaborations.filter(c => c.id === a.value);
      const u = us && us.length > 0 ? us[0] : {};
      const orcid = u.orcid == null ? '' : <OrcidIcon orcid={u.orcid} />;
      const aff = u && u.current_affiliations && u.current_affiliations.map(af => (
        <div>  -{af.department}, {af.organization}, {af.country}</div>
      ));
      return (<div>{orcid}{a.label}<br/>{aff}<br/></div>)
    });

    const authorCount = selectedUsers && selectedUsers.length;

    return (
      <div >
        <Checkbox checked={addMeAsAuthor} onChange={() => this.toggleAddMeAsAuthor()} inputRef={(ref) => { this.refMeAsAuthor = ref; }}>add me as author</Checkbox>
        <Checkbox checked={addGroupLeadAsAuthor} onChange={() => this.toggleAddGroupLeadAsAuthor()} inputRef={(ref) => { this.refGroupLeadAsAuthor = ref; }}>add group leads as authors</Checkbox>
        <Checkbox inputRef={(ref) => { this.refBehalfAsAuthor = ref; }}>
          I am contributing on behalf of the author{authorCount > 0 ? 's' : ''}
        </Checkbox>
        <h5>
          <b>Authors:</b>
        </h5>
        <Select
          multi
          searchable
          placeholder="Select authors from my collaboration"
          backspaceRemoves
          value={selectedUsers}
          valueKey="value"
          labelKey="label"
          matchProp="name"
          options={options}
          onChange={this.handleSelectUser}
        />
        <div>{authorInfo}</div>
      </div>
    );
  }

  addReviewers() {
    const { selectedReviewers, collaborations } = this.state;
    const options = collaborations.map((c) => ({ label: c.name, value: c.id }));
    const reviewersInfo = UserAffInfo({
      users: selectedReviewers,
      collaborations,
      parentId: 'reviewer',
    });

    return (
      <div >
        <h5><b>Group Lead / Additional Reviewers:</b></h5>
        <Select
          multi
          searchable
          placeholder="Select reviewers from my collaboration"
          backspaceRemoves
          value={selectedReviewers}
          valueKey="value"
          labelKey="label"
          matchProp="name"
          options={options}
          onChange={this.handleSelectReviewer}
        />
        <div>{reviewersInfo}</div>
      </div>
    );
  }

  citationTable(rows, sortedIds, selectedRefs) {
    const sids = sortedUniq(sortedIds);
    return (
      <Table>
        <thead>
          <tr>
            <th width="60%">&nbsp;</th>
            <th width="40%">&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {sids.map((id) => {
            const citation = rows.get(id);
            let { litype } = citation;
            if (
              typeof litype === 'undefined' ||
              CitationTypeEOL.includes(litype)
            ) {
              litype = 'uncategorized';
            }
            const chkDisabled = litype === 'uncategorized';
            const chkDesc = chkDisabled
              ? 'citation type is uncategorized, cannot publish this reference'
              : 'publish this reference';
            return (
              <tr key={id}>
                <td className="padding-right">
                  <Citation literature={citation} />
                </td>
                <td>
                  <OverlayTrigger
                    placement="left"
                    overlay={<Tooltip id="checkAnalysis">{chkDesc}</Tooltip>}
                  >
                    <span>
                      <Checkbox
                        disabled={chkDisabled}
                        checked={selectedRefs.includes(id)}
                        onChange={() => {
                          this.handleRefCheck(id);
                        }}
                      >
                        <span>Add to publication</span>
                        <br />
                        <span>({CitationTypeMap[litype].def})</span>
                      </Checkbox>
                    </span>
                  </OverlayTrigger>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }

  selectReferences() {
    const { selectedRefs, literatures, sortedIds } = this.state;
    return (
      <div>
        <ListGroup fill="true">
          <ListGroupItem>
            {this.citationTable(literatures, sortedIds, selectedRefs)}
          </ListGroupItem>
        </ListGroup>
      </div>
    );
  }

  validatePub() {
    const { sample } = this.state;
    const validates = [];
    if (hasVersion(sample) && !!sample.versionComment) {
      validates.push({
        name: 'version-comment',
        value: !!sample.versionComment,
        message: 'New Version Details is missing',
      });
    }
    return validates;
  }

  handleCC0ConsentChange(selectedValue, selectedType) {
    const { cc0Consent } = this.state;
    if (selectedType === 'consent1') {
      cc0Consent.consent1 = selectedValue;
    }
    if (selectedType === 'consent2') {
      cc0Consent.consent2 = selectedValue;
    }
    this.setState({ cc0Consent });
  }

  toggleAddMeAsAuthor() {
    this.setState(prevState => ({ addMeAsAuthor: !prevState.addMeAsAuthor }));
  }

  toggleAddGroupLeadAsAuthor() {
    this.setState(prevState => ({ addGroupLeadAsAuthor: !prevState.addGroupLeadAsAuthor }));
  }

  handleNoEmbargoCheck() {
    const { noEmbargo } = this.state;
    this.setState({ noEmbargo: !noEmbargo });
  }

  onUserChange(state) {
    this.setState((previousState) => ({
      ...previousState,
      users: state.users,
    }));
  }

  loadBundles() {
    EmbargoFetcher.fetchEmbargoCollections(true).then((result) => {
      const cols = result.repository || [];
      this.setState({ bundles: cols });
    });
  }

  loadMyCollaborations() {
    CollaboratorFetcher.fetchMyCollaborations().then((result) => {
      if (result) {
        this.setState({
          collaborations: result.authors,
        });
      }
    });
  }

  loadReferences() {
    let { selectedRefs } = this.state;
    const { sample, newVersion } = this.state;
    LiteraturesFetcher.fetchElementReferences(sample).then((literatures) => {
      const sortedIds = groupByCitation(literatures);
      selectedRefs = selectedRefs.filter((item) => sortedIds.includes(item));

      // pre-select all refs when submitting a new version
      if (newVersion) {
        literatures.forEach((literature) => {
          if (!selectedRefs.includes(literature.literal_id)) {
            selectedRefs.push(literature.literal_id);
          }
        });
      }

      this.setState({ selectedRefs, literatures, sortedIds });
    });
  }

  validateAnalyses() {
    const { sample } = this.state;
    const publishedAnalyses = sample
      .analysisArray()
      .filter(
        (a) =>
          a.extended_metadata.publish &&
          (a.extended_metadata.publish === true ||
            a.extended_metadata.publish === 'true')
      );
    if (publishedAnalyses.length === 0) {
      return false;
    }
    return true;
  }

  // molecule-submissions mandatory check (https://git.scc.kit.edu/ComPlat/chemotion_REPO/issues/236)
  validateSubmission() {
    const { sample, selectedEmbargo, noEmbargo, newVersion } = this.state;
    if (selectedEmbargo === '-1' && !noEmbargo && !newVersion) return false;
    const analyses = sample.analysisArray();
    if (!this.validateAnalyses()) {
      return false;
    }

    let publishedAnalyses = analyses.filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true')
    );

    publishedAnalyses = publishedAnalyses.filter(
      (a) =>
        a.extended_metadata &&
        (a.extended_metadata.kind || '') !== '' && // fail if analysis-type is empty
        (a.extended_metadata.status || '') === 'Confirmed' && // fail if status is not set to Confirmed
        isNmrPass(a, sample) && // fail if NMR check fail
        isDatasetPass(a)
    ); // fail if Dataset check fail
    if (publishedAnalyses.length === 0) {
      return false;
    }
    return true;
  }

  contributor() {
    const { currentUser } = this.state;
    const orcid = OrcidIcon({ orcid: currentUser.orcid });
    const aff =
      currentUser &&
      currentUser.current_affiliations &&
      Object.keys(currentUser.current_affiliations).map((k, i) => (
        <div key={`curr-${i}`}> -{currentUser.current_affiliations[k]}</div>
      ));
    return (
      <div>
        <h5>
          <b>Contributor:&nbsp;</b>
        </h5>
        {orcid}
        {currentUser.name} <br /> {aff}{' '}
      </div>
    );
  }

  selectUsers() {
    const { selectedUsers, collaborations, meAsAuthor, behalfAsAuthor } =
      this.state;
    const options = collaborations.map((c) => ({ label: c.name, value: c.id }));
    const authorCount = selectedUsers && selectedUsers.length;
    const authorsInfo = UserAffInfo({
      users: selectedUsers,
      collaborations,
      parentId: 'author',
    });

    return (
      <div>
        <Checkbox
          defaultChecked={meAsAuthor}
          inputRef={(ref) => {
            this.refMeAsAuthor = ref;
          }}
        >
          add me as author
        </Checkbox>
        <Checkbox
          defaultChecked={behalfAsAuthor}
          inputRef={(ref) => {
            this.refBehalfAsAuthor = ref;
          }}
        >
          I am contributing on behalf of the author{authorCount > 0 ? 's' : ''}
        </Checkbox>
        <h5>
          <b>Authors:</b>
        </h5>
        <Select
          multi
          searchable
          placeholder="Select authors from my collaboration"
          backspaceRemoves
          value={selectedUsers}
          valueKey="value"
          labelKey="label"
          matchProp="name"
          options={options}
          onChange={this.handleSelectUser}
        />
        <div>{authorsInfo}</div>
      </div>
    );
  }

  addReviewers() {
    const { selectedReviewers, collaborations } = this.state;
    const options = collaborations.map((c) => ({ label: c.name, value: c.id }));
    const reviewersInfo = UserAffInfo({
      users: selectedReviewers,
      collaborations,
      parentId: 'reviewer',
    });

    return (
      <div>
        <h5>
          <b>Additional Reviewers:</b>
        </h5>
        <Select
          multi
          searchable
          placeholder="Select reviewers from my collaboration"
          backspaceRemoves
          value={selectedReviewers}
          valueKey="value"
          labelKey="label"
          matchProp="name"
          options={options}
          onChange={this.handleSelectReviewer}
        />
        <div>{reviewersInfo}</div>
      </div>
    );
  }

  citationTable(rows, sortedIds, selectedRefs) {
    const sids = sortedUniq(sortedIds);
    return (
      <Table>
        <thead>
          <tr>
            <th width="60%">&nbsp;</th>
            <th width="40%">&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {sids.map((id) => {
            const citation = rows.get(id);
            let { litype } = citation;
            if (
              typeof litype === 'undefined' ||
              CitationTypeEOL.includes(litype)
            ) {
              litype = 'uncategorized';
            }
            const chkDisabled = litype === 'uncategorized';
            const chkDesc = chkDisabled
              ? 'citation type is uncategorized, cannot publish this reference'
              : 'publish this reference';
            return (
              <tr key={id}>
                <td className="padding-right">
                  <Citation literature={citation} />
                </td>
                <td>
                  <OverlayTrigger
                    placement="left"
                    overlay={<Tooltip id="checkAnalysis">{chkDesc}</Tooltip>}
                  >
                    <span>
                      <Checkbox
                        disabled={chkDisabled}
                        checked={selectedRefs.includes(id)}
                        onChange={() => {
                          this.handleRefCheck(id);
                        }}
                      >
                        <span>Add to publication</span>
                        <br />
                        <span>({CitationTypeMap[litype].def})</span>
                      </Checkbox>
                    </span>
                  </OverlayTrigger>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }

  selectReferences() {
    const { selectedRefs, literatures, sortedIds } = this.state;
    return (
      <div>
        <ListGroup fill="true">
          <ListGroupItem>
            {this.citationTable(literatures, sortedIds, selectedRefs)}
          </ListGroupItem>
        </ListGroup>
      </div>
    );
  }

  render() {
    const { show, onHide, sample } = this.props;
    const { bundles, newVersion } = this.state;
    const canPublish = this.validateSubmission(); // this.validateAnalyses();
    const validateInfo = this.validatePub();
    const validateObjs =
      validateInfo && validateInfo.filter((v) => v.value === false);
    const validated = !!(validateObjs && validateObjs.length === 0);
    const { showPreview, selectedUsers, selectedReviewers, selectedRefs } =
      this.state;
    const analyses = sample.analysisArray();
    const selectedAnalysesCount = analyses.filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true') &&
        a.extended_metadata.kind &&
        a.extended_metadata.status === 'Confirmed' &&
        isNmrPass(a, sample) &&
        isDatasetPass(a)
    ).length;

    const { molecule } = sample;

    const {
      selectedEmbargo,
      selectedLicense,
      disableLicense,
      cc0Consent,
      noEmbargo,
    } = this.state;

    const awareEmbargo =
      selectedEmbargo === '-1' && !newVersion ? (
        <Checkbox
          onChange={() => {
            this.handleNoEmbargoCheck();
          }}
          checked={noEmbargo}
        >
          <span>
            I know that the data that is submitted without the selection of an
            embargo bundle will be published immediately after a successful
            review.
          </span>
        </Checkbox>
      ) : (
        <div />
      );

    if (show) {
      const opts = [];
      bundles.forEach((col) => {
        const tag = col.taggable_data || {};
        opts.push({ value: col.element_id, name: tag.label, label: tag.label });
      });
      return (
        <div>
          <Modal
            dialogClassName="publishReactionModal"
            animation
            show={show}
            bsSize="large"
            onHide={() => onHide()}
          >
            <Modal.Header closeButton>
              <Modal.Title>Publish Sample</Modal.Title>
            </Modal.Header>
            <Modal.Body
              style={{
                paddingBottom: 'unset',
                maxHeight: 'calc(100vh - 210px)',
                overflowY: 'auto',
              }}
            >
              <EmbargoCom
                opts={opts}
                selectedValue={selectedEmbargo}
                onEmbargoChange={this.handleEmbargoChange}
                selectedLicense={selectedLicense}
                disableLicense={disableLicense}
                onLicenseChange={this.handleLicenseChange}
                onCC0ConsentChange={this.handleCC0ConsentChange}
                cc0Deed={cc0Consent}
              />
              <Panel>
                <Panel.Body>
                  <MoleculeInfo
                    molecule={molecule}
                    sample_svg_file={sample.sample_svg_file}
                  />
                </Panel.Body>
              </Panel>
              <div style={{ margin: '5px 0px' }}>
                <SubmissionCheck validates={validateInfo} />
              </div>
              {hasVersion(sample) && (
                <VersionComment
                  element={sample}
                  onChange={this.handleVersionComment}
                />
              )}
              {awareEmbargo}
              <PanelGroup accordion id="publish-sample-config">
                <Panel eventKey="2">
                  <Panel.Heading>
                    <Panel.Title toggle>
                      <h4> Select Analyses ({selectedAnalysesCount})</h4>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Body collapsible>
                    <SampleDetailsContainers
                      readOnly
                      publish
                      sample={sample}
                      handleSampleChanged={this.handleSampleChanged}
                    />
                  </Panel.Body>
                </Panel>
                <Panel eventKey="3">
                  <Panel.Heading>
                    <Panel.Title toggle>
                      <h4> Select Authors ({selectedUsers.length})</h4>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Body collapsible>
                    {this.contributor()}
                    {this.selectUsers()}
                  </Panel.Body>
                </Panel>
                <Panel eventKey="5">
                  <Panel.Heading>
                    <Panel.Title toggle>
                      <h4> Select References ({selectedRefs.length})</h4>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Body collapsible>{this.selectReferences()}</Panel.Body>
                </Panel>
                <Panel eventKey="6">
                  <Panel.Heading>
                    <Panel.Title toggle>
                      <h4>
                        {' '}
                        Group Lead / Additional Reviewers ({selectedReviewers.length})
                      </h4>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Body collapsible>{this.addReviewers()}</Panel.Body>
                </Panel>
              </PanelGroup>
              {showPreview ? null : null}
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={() => onHide()}>Close</Button>
              <Button
                bsStyle="primary"
                disabled={!canPublish || !validated}
                onClick={this.handlePublishSample}
              >
                Publish Sample
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
    return <div />;
  }
}

PublishSampleModal.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onPublishRefreshClose: PropTypes.func.isRequired,
};
