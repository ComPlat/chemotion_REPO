import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel, PanelGroup, Modal, Table,
  ListGroupItem, ListGroup, Button, Checkbox,
  OverlayTrigger, Tooltip
} from 'react-bootstrap';
import Select from 'react-select';
import Immutable from 'immutable';
import { get, isUndefined, sortedUniq } from 'lodash';

import Sample from './models/Sample';
import SampleDetailsContainers from './SampleDetailsContainers';
import UserStore from './stores/UserStore';
import UsersFetcher from './fetchers/UsersFetcher';
import RepositoryActions from './actions/RepositoryActions';
import { groupByCitation, Citation } from '../components/LiteratureCommon';
import { MoleculeInfo, EmbargoCom, isNmrPass, isDatasetPass, OrcidIcon } from '../libHome/RepoCommon';
import LoadingActions from './actions/LoadingActions';
import SamplesFetcher from './fetchers/SamplesFetcher';
import CollaboratorFetcher from './fetchers/CollaboratorFetcher';
import LiteraturesFetcher from './fetchers/LiteraturesFetcher';
import EmbargoFetcher from './fetchers/EmbargoFetcher';
import { CitationTypeMap, CitationTypeEOL } from './CitationType';

export default class PublishSampleModal extends Component {
  constructor(props) {
    super(props);
    const { currentUser } = UserStore.getState();
    const { sample } = props;
    this.state = {
      sample,
      selectedUsers: [],
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
      selectedLicense: 'CC BY',
      disableLicense: false,
      cc0Consent: { consent1: false, consent2: false },
      bundles: [],
      noEmbargo: false
    };
    this.onUserChange = this.onUserChange.bind(this);
    this.handleSampleChanged = this.handleSampleChanged.bind(this);
    this.handlePublishSample = this.handlePublishSample.bind(this);
    this.handleReserveDois = this.handleReserveDois.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.handleSelectReviewer = this.handleSelectReviewer.bind(this);
    this.promptTextCreator = this.promptTextCreator.bind(this);
    this.loadUserByName = this.loadUserByName.bind(this);
    this.loadReferences = this.loadReferences.bind(this);
    this.loadBundles = this.loadBundles.bind(this);
    this.selectReferences = this.selectReferences.bind(this);
    this.handleRefCheck = this.handleRefCheck.bind(this);
    this.handleEmbargoChange = this.handleEmbargoChange.bind(this);
    this.handleLicenseChange = this.handleLicenseChange.bind(this);
    this.handleCC0ConsentChange = this.handleCC0ConsentChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);
    this.loadBundles();
  }

  componentWillReceiveProps(nextProps) {
    const { currentUser } = UserStore.getState();

    const newVersion = !isUndefined(get(nextProps.sample, 'tag.taggable_data.previous_version'));

    const previousLicense = get(nextProps.sample, 'tag.taggable_data.previous_version.license');
    const previousUsers = get(nextProps.sample, 'tag.taggable_data.previous_version.users', []);

    let meAsAuthor = false
    let behalfAsAuthor = false
    const selectedUsers = []
    previousUsers.forEach((user) => {
      if (user.id == currentUser.id) {
        meAsAuthor = true
      } else {
        behalfAsAuthor = true
        selectedUsers.push({
          label: user.name,
          value: user.id
        })
      }
    })

    this.loadReferences();
    this.loadMyCollaborations();
    this.setState({
      sample: nextProps.sample,
      selectedLicense: isUndefined(previousLicense) ? 'CC BY' : previousLicense,
      disableLicense: !isUndefined(previousLicense),
      meAsAuthor,
      behalfAsAuthor,
      selectedUsers,
      newVersion
    });
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
  }

  onUserChange(state) {
    this.setState(previousState => ({ ...previousState, users: state.users }));
  }

  handleRefCheck(id) {
    let { selectedRefs } = this.state;

    if (selectedRefs.includes(id)) {
      selectedRefs = selectedRefs.filter(item => item !== id);
    } else {
      selectedRefs.push(id);
    }
    this.setState({ selectedRefs });
  }

  loadBundles() {
    EmbargoFetcher.fetchEmbargoCollections(true).then((result) => {
      const cols = result.repository || [];
      this.setState({ bundles: cols });
    });
  }

  loadMyCollaborations() {
    CollaboratorFetcher.fetchMyCollaborations()
    .then((result) => {
      this.setState({
        collaborations: result.authors
      });
    });
  }

  loadReferences() {
    let { selectedRefs, newVersion } = this.state;
    LiteraturesFetcher.fetchElementReferences(this.state.sample).then((literatures) => {
      const sortedIds = groupByCitation(literatures);
      selectedRefs = selectedRefs.filter(item => sortedIds.includes(item));

      // pre-select all refs when submitting a new version
      if (newVersion) {
        literatures.forEach(literature => {
          if (!selectedRefs.includes(literature.literal_id)) {
            selectedRefs.push(literature.literal_id)
          }
        });
      }

      this.setState({ selectedRefs, literatures, sortedIds });
    });
  }

  handleSelectUser(val) {
    if (val) { this.setState({ selectedUsers: val }); }
  }

  handleSelectReviewer(val) {
    if (val) { this.setState({ selectedReviewers: val }); }
  }

  loadUserByName(input) {
    if (!input) {
      return Promise.resolve({ options: [] });
    }

    return UsersFetcher.fetchUsersByName(input)
      .then((res) => {
        const usersEntries = res.users.filter(u => u.id !== this.state.currentUser.id)
          .map(u => ({
            value: u.id,
            name: u.name,
            label: `${u.name} (${u.abb})`
          }));
        return { options: usersEntries };
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  promptTextCreator(label) {
    return ("Share with \"" + label + "\"");
  }

  handleSampleChanged(sample) {
    this.setState(prevState => ({ ...prevState, sample }));
  }

  validateAnalyses() {
    const publishedAnalyses = this.state.sample.analysisArray().filter(a => (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true')))
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

    let publishedAnalyses = analyses.filter(a =>
      (a.extended_metadata &&
        (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true'))));

    publishedAnalyses = publishedAnalyses.filter(a =>
      (a.extended_metadata &&
        (((a.extended_metadata.kind || '') !== '') && // fail if analysis-type is empty
        ((a.extended_metadata.status || '') === 'Confirmed') && // fail if status is not set to Confirmed
        (isNmrPass(a, sample)) && // fail if NMR check fail
        (isDatasetPass(a))))); // fail if Dataset check fail
    if (publishedAnalyses.length === 0) {
      return false;
    }
    return true;
  }

  handlePublishSample() {
    const { selectedLicense, disableLicense, cc0Consent } = this.state;
    const authorCount = this.state.selectedUsers && this.state.selectedUsers.length;
    // const reviewerCount = this.state.selectedReviewers && this.state.selectedReviewers.length;
    const plural = authorCount > 0 ? 's' : '';

    if (selectedLicense === 'CC0' && !disableLicense && (!cc0Consent.consent1 || !cc0Consent.consent2)) {
      alert('Please check the license section before sending your data.');
      return true;
    }

    if (!this.validateSubmission()) {
      alert('Submission Check fail. Please review your data and re-submit.');
      return true;
    }

    if (authorCount > 0 && !this.refBehalfAsAuthor.checked) {
      alert(`Please confirm you are contributing on behalf of the author${plural}`);
      return true;
    }

    if (authorCount < 1 && !this.refMeAsAuthor.checked) {
      alert("Please add an author or check 'add me as author.'");
      return true;
    }

    const analyses = this.state.sample.analysisArray();
    let publishedAnalyses = analyses.filter(a =>
      (a.extended_metadata &&
        (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true'))));

    publishedAnalyses = publishedAnalyses.filter(a =>
      (a.extended_metadata &&
        (((a.extended_metadata.kind || '') !== '') && // fail if analysis-type is empty
          ((a.extended_metadata.status || '') === 'Confirmed') && // fail if status is not set to Confirmed
          (isNmrPass(a, this.state.sample)) && // fail if NMR check fail
          (isDatasetPass(a))))); // fail if Dataset check fail

    const { sample } = this.state;
    sample.container.children.find(c => (c && c.container_type === 'analyses')).children = publishedAnalyses;

    LoadingActions.start();
    RepositoryActions.publishSample({
      // sample: this.state.sample,
      sample,
      coauthors: this.state.selectedUsers.map(u => u.value),
      reviewers: this.state.selectedReviewers.map(u => u.value),
      refs: this.state.selectedRefs,
      embargo: this.state.selectedEmbargo,
      license: this.state.selectedLicense,
      addMe: this.refMeAsAuthor.checked
    });
    this.props.onHide();
    SamplesFetcher.fetchById(this.state.sample.id)
      .then((reSample) => {
        this.props.onPublishRefreshClose(reSample, false);
        LoadingActions.stop();
      }).catch((errorMessage) => {
        console.log(errorMessage);
        LoadingActions.stop();
      });
    return true;
  }

  handleReserveDois() {
    LoadingActions.start();
    RepositoryActions.publishSampleReserveDois({
      sample: this.state.sample,
      coauthors: this.state.selectedUsers.map(u => u.value)
    });
    SamplesFetcher.fetchById(this.state.sample.id)
      .then((sample) => {
        this.props.onPublishRefreshClose(sample, true);
        LoadingActions.stop();
      }).catch((errorMessage) => {
        console.log(errorMessage);
        LoadingActions.stop();
      });
    return true;
  }

  contributor() {
    const { currentUser } = this.state;
    const orcid = currentUser.orcid == null ? '' : <OrcidIcon orcid={currentUser.orcid} />;
    const aff = currentUser && currentUser.current_affiliations && Object.keys(currentUser.current_affiliations).map(k => (
      <div>  -{currentUser.current_affiliations[k]}</div>
    ));
    return (<div><h5><b>Contributor:</b></h5>{orcid}{currentUser.name} <br/> {aff} </div>)
  }

  selectUsers() {
    const { selectedUsers, collaborations, meAsAuthor, behalfAsAuthor } = this.state;
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
        <Checkbox defaultChecked={meAsAuthor} inputRef={(ref) => { this.refMeAsAuthor = ref; }}>add me as author</Checkbox>
        <Checkbox defaultChecked={behalfAsAuthor} inputRef={(ref) => { this.refBehalfAsAuthor = ref; }}>
          I am contributing on behalf of the author{authorCount > 0 ? 's' : ''}
        </Checkbox>
        <h5><b>Authors:</b></h5>
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
        <div>
          {authorInfo}
        </div>
      </div>
    );
  }

  addReviewers() {
    const { selectedReviewers, collaborations } = this.state;
    const options = collaborations.map(c => (
      { label: c.name, value: c.id }
    ));

    const reviewerInfo = selectedReviewers && selectedReviewers.map((a) => {
      const us = collaborations.filter(c => c.id === a.value);
      const u = us && us.length > 0 ? us[0] : {};
      const orcid = u.orcid == null ? '' : <OrcidIcon orcid={u.orcid} />;
      const aff = u && u.current_affiliations && u.current_affiliations.map(af => (
        <div>  -{af.department}, {af.organization}, {af.country}</div>
      ));
      return (<div>{orcid}{a.label}<br/>{aff}<br/></div>)
    });


    return (
      <div >
        <h5><b>Additional Reviewers:</b></h5>
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
        <div>
          {reviewerInfo}
        </div>
      </div>
    );
  }

  citationTable(rows, sortedIds, selectedRefs) {
    const sids = sortedUniq(sortedIds);
    return (
      <Table>
        <thead>
          <tr>
            <th width="60%" />
            <th width="40%" />
          </tr>
        </thead>
        <tbody>
          {sids.map((id) => {
            const citation = rows.get(id);
            let { litype } = citation;
            if (typeof litype === 'undefined' || CitationTypeEOL.includes(litype)) {
              litype = 'uncategorized';
            }
            const chkDisabled = litype === 'uncategorized';
            const chkDesc = chkDisabled ? 'citation type is uncategorized, cannot publish this reference' : 'publish this reference';
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
                        onChange={() => { this.handleRefCheck(id); }}
                      >
                        <span>Add to publication</span><br />
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
      <div >
        <ListGroup fill="true">
          <ListGroupItem>
            {this.citationTable(literatures, sortedIds, selectedRefs)}
          </ListGroupItem>
        </ListGroup>
      </div>
    );
  }

  toggleDiv(key) {
    if (key) {
      this.setState((previousState) => {
        const newState = previousState;
        newState[key] = !previousState[key];
        return { ...newState };
      }, this.forceUpdate());
    }
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
        cc0Consent: { consent1: false, consent2: false }
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

  handleNoEmbargoCheck() {
    this.setState({ noEmbargo: !this.state.noEmbargo });
  }

  render() {
    const { show, onHide, sample } = this.props;
    const { bundles, newVersion } = this.state;
    const canPublish = this.validateSubmission(); // this.validateAnalyses();
    const {
      showPreview,
      selectedUsers,
      selectedReviewers,
      selectedRefs
    } = this.state;
    const analyses = sample.analysisArray();
    const selectedAnalysesCount = analyses.filter(
      a => (a.extended_metadata && (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true')) && a.extended_metadata.kind && a.extended_metadata.status === 'Confirmed' && isNmrPass(a, sample) && isDatasetPass(a))).length;

    const { molecule } = sample;

    const {
      selectedEmbargo, selectedLicense, disableLicense, cc0Consent, noEmbargo
    } = this.state;

    const awareEmbargo = selectedEmbargo === '-1' && !newVersion ? (
      <Checkbox
        onChange={() => { this.handleNoEmbargoCheck(); }}
        checked={noEmbargo}
      >
        <span>
          I know that the data that is submitted without the selection of an embargo
          bundle will be published immediately after a successful review.
        </span>
      </Checkbox>
    ) : <div />;

    if (show) {
      const opts = [];
      bundles.forEach((col) => {
        const tag = col.taggable_data || {};
        opts.push({ value: col.element_id, name: tag.label, label: tag.label });
      });
      return (
        <div>
          <Modal dialogClassName="publishReactionModal" animation show={show} bsSize="large" onHide={() => onHide()}>
            <Modal.Header closeButton>
              <Modal.Title>
                Publish Sample
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ paddingBottom: 'unset', maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
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
                  <MoleculeInfo molecule={molecule} sample_svg_file={sample.sample_svg_file} />
                </Panel.Body>
              </Panel>
              {awareEmbargo}
              <PanelGroup accordion id="publish-sample-config">
                <Panel
                  eventKey="2"
                >
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
                  <Panel.Body collapsible>
                    {this.selectReferences()}
                  </Panel.Body>
                </Panel>
                <Panel eventKey="6">
                  <Panel.Heading>
                    <Panel.Title toggle>
                      <h4> Additional Reviewers ({selectedReviewers.length})</h4>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Body collapsible>
                    {this.addReviewers()}
                  </Panel.Body>
                </Panel>
              </PanelGroup>
              {showPreview ? null : null}
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={() => onHide()}>Close</Button>
              <Button bsStyle="primary" disabled={!canPublish} onClick={this.handlePublishSample}>
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
