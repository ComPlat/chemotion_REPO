import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';
import {
  Panel,
  PanelGroup,
  Button,
  Modal,
  Table,
  OverlayTrigger, FormGroup,
  Checkbox, Tooltip, ListGroup, ListGroupItem, Row, Col,
  Form,
  Grid,
  ControlLabel
} from 'react-bootstrap';
import { head, filter, findIndex, flatten, sortedUniq } from 'lodash';
import Select from 'react-select';
import Immutable from 'immutable';
import uuid from 'uuid';
import { validateYield } from 'src/components/chemrepo/PublishCommon';
import Reaction from 'src/models/Reaction';
import UserStore from 'src/stores/alt/stores/UserStore';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import RepositoryActions from 'src/stores/alt/repo/actions/RepositoryActions';
import {
  ReactionInfo,
  ReactionSchemeOnlyInfo,
  PublishAnalysesTag,
  EmbargoCom,
  isNmrPass,
  isDatasetPass,
  PublishTypeAs,
  OrcidIcon,
} from 'src/repoHome/RepoCommon';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { groupByCitation, Citation } from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import EmbargoFetcher from 'src/repo/fetchers/EmbargoFetcher';
import { CitationTypeMap, CitationTypeEOL } from 'src/components/CitationType';
import SubmissionCheck from 'src/components/chemrepo/SubmissionCheck';
import { doStValidation } from 'src/components/chemrepo/publication-utils';

const AnalysisIdstoPublish = element => (
  element.analysisArray().filter(a => a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true')).map(x => x.id)
);

function AnalysisHeaderSample({ sampleSvgFile }) {
  const svgPath = `/images/samples/${sampleSvgFile}`;
  return (
    <div className="svg-container">
      <Row>
        <Col sm={8} md={8} lg={8}>
          <SVG key={svgPath} src={svgPath} className="sample-details" />
        </Col>
        <Col sm={4} md={4} lg={4}>
          <h5>
            <i className="icon-sample" style={{ fontSize: '1.5em' }} />{' '}
            <b>Product</b>
          </h5>
        </Col>
      </Row>
    </div>
  );
}

AnalysisHeaderSample.propTypes = { sampleSvgFile: PropTypes.string.isRequired };

const skimAnalysis = (sample) => {
  const analyses = sample.analysisArray();
  const publishedAnalyses = analyses.filter(a =>
    (a.extended_metadata &&
      (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true'))));
  return publishedAnalyses.filter(a =>
    (a.extended_metadata &&
      (((a.extended_metadata.kind || '') !== '') && // fail if analysis-type is empty
        ((a.extended_metadata.status || '') === 'Confirmed') && // fail if status is not set to Confirmed
        (isNmrPass(a, sample)) && // fail if NMR check fail
        (isDatasetPass(a))))); // fail if Dataset check fail
};

const publishOptions = { f: 'full', s: 'scheme-only' };

export default class PublishReactionModal extends Component {
  constructor(props) {
    super(props);
    const { currentUser } = UserStore.getState();
    const { reaction } = props;
    this.state = {
      reaction,
      selectedUsers: [],
      selectedReviewers: [],
      showSelectionReviewer: false,
      collaborations: [],
      showPreview: false,
      showScheme: false,
      currentUser,
      showRinchi: false,
      showProp: false,
      showTlc: false,
      selectedRefs: [],
      literatures: new Immutable.Map(),
      sortedIds: [],
      selectedEmbargo: '-1',
      selectedLicense: 'CC BY',
      cc0Consent: { consent1: false, consent2: false },
      bundles: [],
      noSolvent: false,
      noAmountYield: false,
      noEmbargo: false,
      schemeDesc: true,
      addMeAsAuthor: true,
      addGroupLeadAsAuthor: true,
      publishType: { options: Object.values(publishOptions), selected: publishOptions.f },
    };

    props.reaction.convertDurationDisplay();

    this.onUserChange = this.onUserChange.bind(this);
    this.handlePublishReaction = this.handlePublishReaction.bind(this);
    this.handleReserveDois = this.handleReserveDois.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.handleSelectReviewer = this.handleSelectReviewer.bind(this);
    this.loadUserByName = this.loadUserByName.bind(this);
    this.handleAnalysesChecked = this.handleAnalysesChecked.bind(this);
    this.toggleScheme = this.toggleScheme.bind(this);
    this.toggleRinchi = this.toggleRinchi.bind(this);
    this.toggleProp = this.toggleProp.bind(this);
    this.toggleTlc = this.toggleTlc.bind(this);
    this.loadReferences = this.loadReferences.bind(this);
    this.loadBundles = this.loadBundles.bind(this);
    this.selectReferences = this.selectReferences.bind(this);
    this.handleRefCheck = this.handleRefCheck.bind(this);
    this.handleEmbargoChange = this.handleEmbargoChange.bind(this);
    this.handleLicenseChange = this.handleLicenseChange.bind(this);
    this.handleNoSolventCheck = this.handleNoSolventCheck.bind(this);
    this.handleNoAmountYieldCheck = this.handleNoAmountYieldCheck.bind(this);
    this.handleCC0ConsentChange = this.handleCC0ConsentChange.bind(this);
    this.handlePublishTypeChange = this.handlePublishTypeChange.bind(this);
    this.handleYieldChange = this.handleYieldChange.bind(this);
    this.handlePropertiesChange = this.handlePropertiesChange.bind(this);
    this.handleUnitChange = this.handleUnitChange.bind(this);
    this.toggleAddMeAsAuthor = this.toggleAddMeAsAuthor.bind(this);
    this.toggleAddGroupLeadAsAuthor = this.toggleAddGroupLeadAsAuthor.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);
    this.loadBundles();
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (!nextProps.reaction) { return; }
    nextProps.reaction.convertDurationDisplay();

    this.loadReferences();
    this.loadMyCollaborations();
    this.setState({
      reaction: nextProps.reaction,
    });
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
  }

  onUserChange(state) {
    this.setState(previousState => ({ ...previousState, users: state.users }));
  }

  handleSelectUser(val) {
    if (val) { this.setState({ selectedUsers: val }); }
  }

  handleInputChange(type, event) {
    const { reaction } = this.state;
    switch (type) {
      case 'temperature':
        reaction.temperature.userText = event.target.value;
        break;
      case 'temperatureUnit':
        reaction.temperature = reaction.convertTemperature(event);
        break;
      case 'duration':
        reaction.durationDisplay = { nextValue: event.target.value };
        break;
      case 'durationUnit':
        reaction.durationDisplay = { nextUnit: true };
        break;
      default:
        break;
    }
    this.setState({ reaction });
  }

  handleYieldChange(p, event) {
    const { value } = event.target;
    if (!isNaN(value)) {
      const { reaction } = this.state;
      const { products } = reaction;
      const product = products.find(e => e.id === p.id);
      if (typeof product !== 'undefined') {
        product.equivalent = (value / 100);
        products.splice(products.findIndex(e => e.id === p.id), 1, product);
        reaction.products = products;
        this.setState({ reaction });
      }
    }
  }

  handlePropertiesChange(type, event) {
    if (type === 'temperature') {
      this.handleInputChange(type, event);
    }
    if (type === 'duration') {
      const { value } = event.target;
      if (!isNaN(value)) {
        this.handleInputChange(type, event);
      }
    }
    if (type === 'schemeDesc') {
      this.setState({ schemeDesc: !this.state.schemeDesc });
    }
  }

  handleUnitChange(type, event) {
    let index;
    let unit;
    switch (type) {
      case 'temperatureUnit':
        index = Reaction.temperature_unit.indexOf(event);
        unit = Reaction.temperature_unit[(index + 1) % 3];
        this.handleInputChange('temperatureUnit', unit);
        break;
      case 'durationUnit':
        this.handleInputChange('durationUnit', event);
        break;
      default:
        break;
    }
  }

  toggleScheme() {
    const { showScheme } = this.state;
    this.setState({ showScheme: !showScheme });
  }

  toggleRinchi() {
    const { showRinchi } = this.state;
    this.setState({ showRinchi: !showRinchi });
  }

  toggleProp() {
    const { showProp } = this.state;
    this.setState({ showProp: !showProp });
  }

  toggleTlc() {
    const { showTlc } = this.state;
    this.setState({ showTlc: !showTlc });
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

  handleNoSolventCheck() {
    this.setState({ noSolvent: !this.state.noSolvent });
  }

  handleNoEmbargoCheck() {
    this.setState({ noEmbargo: !this.state.noEmbargo });
  }

  handleNoAmountYieldCheck() {
    this.setState({ noAmountYield: !this.state.noAmountYield });
  }

  loadBundles() {
    EmbargoFetcher.fetchEmbargoCollections(true).then((result) => {
      const cols = result.repository || [];
      this.setState({ bundles: cols });
    });
  }

  toggleAddMeAsAuthor() {
    this.setState(prevState => ({ addMeAsAuthor: !prevState.addMeAsAuthor }));
  }

  toggleAddGroupLeadAsAuthor() {
    this.setState(prevState => ({ addGroupLeadAsAuthor: !prevState.addGroupLeadAsAuthor }));
  }

  loadReferences() {
    let { selectedRefs } = this.state;
    LiteraturesFetcher.fetchElementReferences(this.state.reaction, true).then((literatures) => {
      const sortedIds = groupByCitation(literatures);
      selectedRefs = selectedRefs.filter(item => sortedIds.includes(item));
      this.setState({ selectedRefs, literatures, sortedIds });
    });
  }

  loadMyCollaborations() {
    CollaboratorFetcher.fetchMyCollaborations()
      .then((result) => {
        const collaborations = result.authors || [];

        // Find collaborators that are group leads
        const groupLeads = collaborations.filter(c => c.is_group_lead);

        // Pre-select group leads in the reviewers dropdown
        const selectedReviewers = groupLeads.map(lead => ({
          label: lead.name,
          value: lead.id
        }));

        this.setState({
          collaborations,
        selectedReviewers,
        });
      });
  }

  contributor() {
    const { currentUser } = this.state;
    const orcid = currentUser.orcid == null ? '' : <OrcidIcon orcid={currentUser.orcid} />;
    const aff = currentUser && currentUser.current_affiliations && Object.keys(currentUser.current_affiliations).map(k => (
      <div key={uuid.v4()}>  -{currentUser.current_affiliations[k]}</div>
    ));
    return (<div><h5><b>Contributor:</b></h5>{orcid}{currentUser.name} <br /> {aff} </div>);
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

  handleAnalysesChecked(analysis, elementType) {
    const { reaction } = this.state;

    reaction.changed = true;
    if (elementType === 'Reaction') {
      const elements = head(filter(reaction.container.children, o => o.container_type === 'analyses')).children;
      // Find the index of the element and then replace
      const index = findIndex(elements, { id: analysis.id });
      if (index !== -1) {
        elements.splice(index, 1, analysis);
        this.setState(prevState => ({ ...prevState, reaction }));
      }
    }
    if (elementType === 'Product') {
      const analysesReactionProducts = reaction.products;
      analysesReactionProducts.forEach((product) => {
        const elements = head(filter(product.container.children, o => o.container_type === 'analyses')).children;
        // Find the index of the element and then replace
        const index = findIndex(elements, { id: analysis.id });
        if (index !== -1) {
          elements.splice(index, 1, analysis);
          this.setState(prevState => ({ ...prevState, reaction }));
        }
      });
    }
    this.props.onHandleAnalysesCheck(this.state.reaction);
  }

  validateAnalyses() {
    let pas = this.state.reaction.products.reduce(
      (acc, s) => acc.concat(AnalysisIdstoPublish(s)),
      AnalysisIdstoPublish(this.state.reaction)
    );
    if (pas.length === 0) {
      return false;
    }

    pas = AnalysisIdstoPublish(this.state.reaction);
    if (pas.length > 0) {
      return true;
    }

    const { reaction } = this.state;
    const { products } = reaction;
    for (let i = 0; i < products.length; i += 1) {
      const pa = skimAnalysis(products[i]);
      if (pa.length > 0) { return true; }
    }

    return false;
  }

  handlePublishReaction() {
    const {
      selectedLicense, cc0Consent, publishType, selectedUsers
    } = this.state;
    const authorCount = selectedUsers && selectedUsers.length;

    if (selectedLicense === 'CC0' && (!cc0Consent.consent1 || !cc0Consent.consent2)) {
      alert('Please check the license section before sending your data.');
      return true;
    }

    if (authorCount > 0 && !this.refBehalfAsAuthor.checked) {
      alert(`Please confirm you are contributing on behalf of the author${authorCount > 0 ? 's' : ''}.'`);
      return true;
    }

    const isFullyPublish = publishType.selected === publishOptions.f;

    if (authorCount < 1 && !this.refMeAsAuthor.checked && isFullyPublish) {
      alert("Please add an author or check 'add me as author'.");
      return true;
    }

    const { reaction } = this.state;
    if (isFullyPublish) {
      const { samples } = reaction;
      for (let i = 0; i < samples.length; i += 1) {
        reaction.samples[i].container.children.find(c => (c && c.container_type === 'analyses')).children = skimAnalysis(samples[i]);
      }
    }

    LoadingActions.start();
    RepositoryActions.publishReaction({
      isFullyPublish,
      reaction: this.state.reaction,
      coauthors: this.state.selectedUsers.map(u => u.value),
      reviewers: this.state.selectedReviewers.map(u => u.value),
      refs: this.state.selectedRefs,
      embargo: this.state.selectedEmbargo,
      license: this.state.selectedLicense,
      schemeDesc: this.state.schemeDesc,
      addMe: this.refMeAsAuthor.checked,
      addGroupLead: this.refGroupLeadAsAuthor.checked
    }, true);
    this.props.onHide(false);
  }

  handleReserveDois() {
    LoadingActions.start();
    RepositoryActions.publishReactionReserveDois({
      reaction: this.state.reaction,
      coauthors: this.state.selectedUsers.map(u => u.value)
    });
    ReactionsFetcher.fetchById(this.state.reaction.id)
      .then((reaction) => {
        this.props.onPublishRefreshClose(reaction, true);
        LoadingActions.stop();
      }).catch((errorMessage) => {
        console.log(errorMessage);
        LoadingActions.stop();
      });
    return true;
  }

  selectUsers() {
    const { selectedUsers, collaborations, addMeAsAuthor, addGroupLeadAsAuthor } = this.state;
    const options = collaborations.map(c => (
      { label: c.name, value: c.id }
    ));
    const authorCount = selectedUsers && selectedUsers.length;
    const authorInfo = selectedUsers && selectedUsers.map((a) => {
      const us = collaborations.filter(c => c.id === a.value);
      const u = us && us.length > 0 ? us[0] : {};
      const orcid = u.orcid == null ? '' : <OrcidIcon orcid={u.orcid} />;
      const aff = u && u.current_affiliations && u.current_affiliations.map(af => (
        <div>  -{af.department}, {af.organization}, {af.country}</div>
      ));
      return (<div key={uuid.v4()}>{orcid}{a.label}<br/>{aff}<br/></div>);
    });

    return (
      <div >
        <Checkbox checked={addMeAsAuthor} onChange={() => this.toggleAddMeAsAuthor()} inputRef={(ref) => { this.refMeAsAuthor = ref; }}>add me as author</Checkbox>
        <Checkbox checked={addGroupLeadAsAuthor} onChange={() => this.toggleAddGroupLeadAsAuthor()} inputRef={(ref) => { this.refGroupLeadAsAuthor = ref; }}>add group leads as authors</Checkbox>
        <Checkbox inputRef={(ref) => { this.refBehalfAsAuthor = ref; }}>
          I am contributing on behalf of the author{authorCount > 0 ? 's' : '' }
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
        <div>
          {reviewerInfo}
        </div>
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
                <td className="padding-right" style={{ display: 'inline-flex' }}>
                  <i className={`icon-${citation.element_type.toLowerCase()}`} style={{ fontSize: '1.5em' }} />&nbsp;&nbsp;
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
      <div>
        <ListGroup fill="true">
          <ListGroupItem>
            {this.citationTable(literatures, sortedIds, selectedRefs)}
          </ListGroupItem>
        </ListGroup>
      </div>
    );
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

  handlePublishTypeChange(e) {
    const { publishType } = this.state;
    publishType.selected = e;
    this.setState({ publishType });
  }

  validatePub(isFullyPublish = true) {
    const { reaction, noEmbargo, selectedEmbargo } = this.state;
    let validates = [];
    if (isFullyPublish) {
      validates.push({ name: 'embargo', value: selectedEmbargo !== '-1' || (selectedEmbargo === '-1' && noEmbargo), message: 'No embargo bundle' });
      validates.push({ name: 'reaction type', value: !!(reaction.rxno && reaction.rxno.length > 0), message: reaction.rxno ? '' : 'Reaction type is missing' });
      const hasSt = reaction.starting_materials?.length > 0;
      validates.push({ name: 'start_material', value: !!hasSt, message: hasSt ? '' : 'Start material is missing' });
      const hasSv =
        this.state.noSolvent === true || (reaction.solvents && reaction.solvents.length > 0);
      validates.push({ name: 'solvent', value: !!hasSv, message: hasSv ? '' : 'Solvent is missing' });
      const hasProduct = reaction.products && reaction.products.length > 0;
      validates.push({ name: 'product', value: !!hasProduct, message: hasProduct ? '' : 'Product is missing' });

      const stValidation = doStValidation(reaction);
      if (stValidation) {
        (reaction.starting_materials || []).forEach((st) => {
          if (!st.amount || !st.amount.value) {
            validates.push({ name: 'starting_materials-amount', value: false, message: `[Starting material] ${st.molecule_iupac_name}: amount is 0` });
          }
        });
      }
      if (!this.state.noAmountYield) {
        (reaction.products || []).forEach((prod) => {
          if (!prod.amount || !prod.amount.value) {
            validates.push({ name: 'product-amount', value: false, message: `[Product] ${prod.molecule_iupac_name}: amount is 0` });
          }
        });
      }
    }
    validates = this.state.noAmountYield ? validates : validates.concat(validateYield(reaction));
    return validates;
  }

  render() {
    const { show } = this.props;
    const {
      reaction, selectedUsers, selectedReviewers, selectedRefs, publishType, bundles
    } = this.state;

    const isFullyPublish = publishType.selected === publishOptions.f;
    const canPublish = isFullyPublish ? this.validateAnalyses() : true;
    const validateInfo = this.validatePub(isFullyPublish);
    const validateObjs = validateInfo && validateInfo.filter(v => v.value === false);
    const validated = !!(validateObjs && validateObjs.length === 0);

    let selectedAnalysesCount = (this.state.reaction.analyses || [])
      .filter(a => (a.extended_metadata && (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true'))
      && a.extended_metadata.kind)).length;

    const productDOI = product => (
      <tr key={`doi-product-row-${product.id}`}>
        <td>
          Product {product.name}
        </td>
        <td>
          {product.tag.taggable_data.reserved_doi ? `DOI: ${product.tag.taggable_data.reserved_doi}` : ''}
        </td>
      </tr>
    );

    const productAnalysesDOI = analysis => (
      <tr key={`doi-product-analysis-row-${analysis.id}`}>
        <td>
          {analysis.name} - {(analysis.extended_metadata.kind || '').split('|').pop().trim()}
        </td>
        <td>
          {analysis.extended_metadata.reserved_doi ? `DOI: ${analysis.extended_metadata.reserved_doi}` : ''}
        </td>
      </tr>
    );

    if (show) {
      const analysesView = [];
      const analysesReaction = head(filter(reaction?.container?.children, o => o.container_type === 'analyses')).children;

      selectedAnalysesCount = (analysesReaction || []).filter(a =>
        (a.extended_metadata && (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true')) && a.extended_metadata.kind)).length;

      const analysesViewReaction = analysesReaction.map(analysis => (
        <PublishAnalysesTag
          reaction={reaction}
          analysis={analysis}
          key={`reaction_${analysis.id}`}
          analysesType="Reaction"
          handleAnalysesChecked={this.handleAnalysesChecked}
        />
      ));
      analysesView.push(analysesViewReaction);

      const analysesReactionProductsDOIs = [];
      const analysesReactionProducts = reaction.products;

      analysesReactionProducts.forEach((product) => {
        const arrP = [];
        arrP.push(product);
        const tmpProduct = arrP.map(p => (
          <AnalysisHeaderSample
            sampleSvgFile={p.sample_svg_file}
            key={`reaction_analysis_${p.id}`}
          />
        ));
        analysesView.push(tmpProduct);

        const tmp = head(filter(product.container.children, o => o.container_type === 'analyses')).children;
        const tmpTag = tmp.map(analysis => (
          <PublishAnalysesTag
            reaction={reaction}
            analysis={analysis}
            key={`reaction_product_${analysis.id}`}
            analysesType="Product"
            handleAnalysesChecked={this.handleAnalysesChecked}
            product={product}
          />
        ));
        analysesView.push(tmpTag);
        analysesReactionProductsDOIs.push(productDOI(product));
        analysesReactionProductsDOIs.push(tmp.map(a => productAnalysesDOI(a)));
        selectedAnalysesCount += (tmp || []).filter(a =>
          (a.extended_metadata && (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true')) && a.extended_metadata.kind
            && ((a.extended_metadata.status || '') === 'Confirmed')
            && (isNmrPass(a, product))
            && (isDatasetPass(a))
          )).length;
      });

      const {
        selectedEmbargo, selectedLicense, cc0Consent, noEmbargo
      } = this.state;

      const publishTypeAs = {
        ...publishType,
        onChange: this.handlePublishTypeChange
      };


      const opts = [];
      bundles.forEach((col) => {
        const tag = col.taggable_data || {};
        opts.push({ value: col.element_id, name: tag.label, label: tag.label });
      });

      const awareEmbargo = selectedEmbargo === '-1' ? (
        <Checkbox
          onChange={() => { this.handleNoEmbargoCheck(); }}
          checked={noEmbargo}
          className={`display-${isFullyPublish}`}
        >
          <span>
            I know that the data that is submitted without the selection of an embargo
            bundle will be published immediately after a successful review.
          </span>
        </Checkbox>
      ) : <div />;

      return (
        <div>
          <Modal dialogClassName="structure-viewer-modal" animation show={show} bsSize="large" onHide={() => this.props.onHide(false)}>
            <Modal.Header closeButton style={{ paddingBottom: '2px', paddingTop: '10px' }}>
              <Grid style={{ width: '100%' }}>
                <Col sm={6} lg={6}>
                  <Form inline>
                    <FormGroup controlId="frmCtrlPublishType">
                      <ControlLabel>
                        Publish Reaction as
                      </ControlLabel>{' '}
                      <PublishTypeAs {...publishTypeAs} />
                    </FormGroup>
                  </Form>
                </Col>
                <Col sm={6} lg={6}>
                  {' '}
                </Col>
              </Grid>
            </Modal.Header>
            <Modal.Body style={{
              paddingBottom: 'unset', height: 'calc(100vh - 210px)', maxHeight: 'calc(100vh - 210px)', overflowY: 'auto'
            }}
            >
              <EmbargoCom
                opts={opts}
                selectedValue={selectedEmbargo}
                onEmbargoChange={this.handleEmbargoChange}
                selectedLicense={selectedLicense}
                onLicenseChange={this.handleLicenseChange}
                onCC0ConsentChange={this.handleCC0ConsentChange}
                cc0Deed={cc0Consent}
              />
              <div className={`display-${isFullyPublish}`}>
                <ReactionInfo
                  reaction={reaction}
                  toggleScheme={this.toggleScheme}
                  showScheme={this.state.showScheme}
                  isPublic={false}
                  toggleRinchi={this.toggleRinchi}
                  showRinchi={this.state.showRinchi}
                  toggleProp={this.toggleProp}
                  showProp={this.state.showProp}
                  toggleTlc={this.toggleTlc}
                  showTlc={this.state.showTlc}
                />
              </div>
              <div className={`display-${!isFullyPublish}`}>
                <ReactionSchemeOnlyInfo
                  reaction={reaction}
                  isPublic={false}
                  schemeDesc={this.state.schemeDesc}
                  onYieldChange={this.handleYieldChange}
                  onPropertiesChange={this.handlePropertiesChange}
                  onUnitChange={this.handleUnitChange}
                />
              </div>
              <div style={{ margin: '5px 0px' }}>
                <SubmissionCheck validates={validateInfo} />
              </div>
              {awareEmbargo}
              <Checkbox
                onChange={() => { this.handleNoSolventCheck(); }}
                checked={this.state.noSolvent}
                className={`display-${isFullyPublish}`}
              >
                <span>This reaction has no solvents</span>
              </Checkbox>
              <Checkbox
                onChange={() => { this.handleNoAmountYieldCheck(); }}
                checked={this.state.noAmountYield}
                className={`display-${isFullyPublish}`}
              >
                <span>Skip amount and yield validation (the product has no amount and yield)</span>
              </Checkbox>
              <PanelGroup accordion id={`panelgroup_${reaction.id}`} defaultActiveKey={0}>
                <Panel
                  eventKey="2"
                  className={`display-${isFullyPublish}`}
                >
                  <Panel.Heading style={{ paddingBottom: '1px', paddingTop: '1px' }}>
                    <Panel.Title toggle><h4>Select Analyses ({selectedAnalysesCount})</h4>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Body collapsible>
                    <div>
                      <Row>
                        <Col md={12}>
                          <h5>
                            <b>Datasets: </b>
                            <br />
                          </h5>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={12}>
                          <PanelGroup
                            accordion
                            id={`panelgroup_ds_${reaction.id}`}
                            defaultActiveKey={0}
                          >
                            {flatten(analysesView)}
                          </PanelGroup>
                        </Col>
                      </Row>
                    </div>
                  </Panel.Body>
                </Panel>
                <Panel
                  eventKey="3"
                >
                  <Panel.Heading style={{ paddingBottom: '1px', paddingTop: '1px' }}>
                    <Panel.Title toggle><h4> Select Authors ({selectedUsers.length})</h4>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Body collapsible>
                    {this.contributor()}
                    {this.selectUsers()}
                  </Panel.Body>
                </Panel>
                <Panel
                  eventKey="5"
                  className={`display-${isFullyPublish}`}
                >
                  <Panel.Heading style={{ paddingBottom: '1px', paddingTop: '1px' }}>
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
                      <h4> Group Lead / Additional Reviewers ({selectedReviewers.length})</h4>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Body collapsible>
                    {this.addReviewers()}
                  </Panel.Body>
                </Panel>
              </PanelGroup>
            </Modal.Body>
            <Modal.Footer style={{ padding: '6px' }}>
              <Button onClick={() => this.props.onHide(false)}>Close</Button>
              <Button bsStyle="primary" disabled={!canPublish || !validated} onClick={this.handlePublishReaction}>
                Publish Reaction
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
    return <div />;
  }
}

PublishReactionModal.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onPublishRefreshClose: PropTypes.func.isRequired,
  onHandleAnalysesCheck: PropTypes.func.isRequired,
};
