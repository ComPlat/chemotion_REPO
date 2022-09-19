/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Jumbotron, Panel } from 'react-bootstrap';
import ArrayUtils from '../components/utils/ArrayUtils';
import {
  AffiliationList,
  AnalysesTypeJoinLabel,
  AuthorList,
  ChemotionId,
  CommentBtn,
  ContributorInfo,
  ClipboardCopyBtn,
  DateInfo,
  Doi,
  IconLicense,
  IconToMyDB,
  RenderPublishAnalysesPanel,
  SidToPubChem,
  ToggleIndicator,
  ElStateLabel
} from './RepoCommon';
import { AffiliationMap } from './RepoReviewCommon';
import { Citation, literatureContent, RefByUserInfo } from '../components/LiteratureCommon';
import RepoUserComment from '../components/common/RepoUserComment';
import RepoPublicComment from '../components/common/RepoPublicComment';
import RepoXvialButton from '../components/common/RepoXvialButton';
import PublicActions from '../components/actions/PublicActions';
import Sample from '../components/models/Sample';
import RepoSegment from './RepoSegment';

const scrollView = () => {
  const anchor = window.location.hash.split('#')[1];
  if (anchor) {
    const anchorElement = document.getElementById(anchor);
    if (anchorElement) {
      anchorElement.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
};
export default class RepoSample extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expandSA: true, expandSG: ''
    };
    this.toggleSA = this.toggleSA.bind(this);
    this.toggleSG = this.toggleSG.bind(this);
    this.renderAnalyses = this.renderAnalyses.bind(this);
  }

  componentDidMount() { scrollView(); }

  componentDidUpdate() { scrollView(); }

  toggleSA() {
    const { expandSA } = this.state;
    this.setState({ expandSA: !expandSA });
  }

  toggleSG(sg) {
    this.setState({ expandSG: sg.uuid });
  }

  updateRepoXvial(elementId) {
    PublicActions.displayMolecule(elementId);
    PublicActions.refreshPubElements('Molecules');
  }

  renderAnalyses(analyses) {
    const { sample } = this.props;
    const specSample = new Sample(sample);
    specSample.container = sample.analyses;
    const orderAnalyses = ArrayUtils.sortArrByIndex(analyses);
    return orderAnalyses.map((analysis) => {
      const userInfo = (sample.ana_infos && sample.ana_infos[analysis.id]) || '';
      const kind = (analysis.extended_metadata['kind'] || '').split('|').pop().trim();
      return (
        <span key={`analysis_${analysis.id}`}>
          <CommentBtn {...this.props} field={`Analysis_${analysis.id}`} orgInfo={kind} onShow={this.props.handleCommentBtn} />
          <RenderPublishAnalysesPanel
            key={analysis.id}
            userInfo={userInfo}
            analysis={analysis}
            isPublic={this.props.isPublished}
            isLogin={this.props.isLogin}
            isReviewer={this.props.isReviewer}
            type="Container"
            pageType="molecules"
            pageId={sample.molecule_id}
            element={specSample}
          />
        </span>
      );
    });
  }

  render() {
    const {
      sample, pubData, tagData, isPublished,
      canComment, handleCommentBtn, isLogin, isReviewer, element
    } = this.props;
    const { xvialCom } = element;
    const { expandSA, expandSG } = this.state;

    const affiliationMap = AffiliationMap(sample.affiliation_ids);
    const references = sample.literatures ? sample.literatures.map(lit => (
      <li key={`li_${lit.id}`} style={{ display: 'flex' }}>
        <RefByUserInfo info={lit.ref_added_by} litype={lit.litype} />&nbsp;
        <Citation key={lit.id} literature={lit} />
      </li>
    )) : [];

    const refArray = [];
    let referencesText = '';
    if (canComment && sample.literatures) {
      sample.literatures.forEach((lit) => {
        const content = literatureContent(lit, true);
        refArray.push(content);
      });
      referencesText = refArray.join('');
    }

    const iupacUserDefined = ((sample.showed_name == sample.molecule_iupac) || sample.showed_name == null)
      ? <span />
      : <h5><b>Name: </b> {sample.showed_name} </h5>;
    const userInfo = sample.pub_info || '';
    const analyses = (sample.analyses && sample.analyses.children && sample.analyses.children.length > 0 && sample.analyses.children[0].children) || [];
    let embargo = (<span />);
    if (sample.embargo) {
      embargo = (
        <span>
          <b>Access to the DOI and metadata for the whole data collection: </b> &nbsp;
          <Button key="embargo-link-btn" bsStyle="link" href={`/inchikey/collection/${sample.embargo}`} target="_blank" style={{ padding: '0px 0px' }}>
            <i className="fa fa-database" />&nbsp;&nbsp;{sample.embargo}
          </Button>
          <ClipboardCopyBtn text={sample.embargo} />
        </span>
      );
    }

    return (
      <Jumbotron key={`sample-${sample.id}`}>
        <span className="repo-pub-sample-header">
          <span className="repo-pub-title"><IconToMyDB isLogin={isLogin} isPublished={isPublished} id={sample.id} type="sample" /></span>&nbsp;
          <span className="repo-pub-title"><DateInfo pubData={pubData} tagData={tagData} isPublished={isPublished} /></span>&nbsp;
          <SidToPubChem sid={sample.sid} />&nbsp;
          <RepoXvialButton isEditable={isReviewer} isLogin={isLogin} allowRequest elementId={sample.id} data={sample.xvial} saveCallback={() => this.updateRepoXvial(sample.molecule_id)} xvialCom={xvialCom} />
          {IconLicense((isPublished ? sample.doi : sample.doi?.full_doi), sample.license, (sample.author_ids.length > 1))}
          <RepoPublicComment isReviewer={isReviewer} id={sample.id} type="Sample" title={sample.showed_name} userInfo={userInfo} pageType="molecules" pageId={sample.molecule_id} />&nbsp;
          <RepoUserComment isLogin={isLogin} id={sample.id} type="Sample" title={sample.showed_name} pageType="molecules" pageId={sample.molecule_id} />&nbsp;
          {ElStateLabel(sample.embargo)}
        </span>
        <br />
        {iupacUserDefined}
        <ContributorInfo contributor={sample.contributors} />
        <h5>
          <b>Author{sample.author_ids.length > 1 ? 's' : ''}: </b>
          <AuthorList creators={sample.creators} affiliationMap={affiliationMap} />
        </h5>
        <AffiliationList
          affiliations={sample.affiliations}
          affiliationMap={affiliationMap}
        />
        <Doi type="sample" id={sample.id} doi={sample.doi} isPublished={isPublished} />
        <ChemotionId id={pubData.id} type="sample" />
        <h5>
          {sample.reaction_ids.map(rid => (
            <Button key={`reaction-link-btn-${rid}`} bsStyle="link" style={{ padding: '0px 0px' }} onClick={() => { window.location = `/home/publications/reactions/${rid}`; }}>
              <i className="icon-reaction" style={{ fontSize: '1.5em' }} />{'Product of reaction'}
            </Button>
          ))}
        </h5>
        {embargo}
        <h5>
          <CommentBtn {...this.props} field="Reference" orgInfo={referencesText} onShow={handleCommentBtn} />
          <b>Reference{references.length > 1 ? 's' : null}: </b>
          <ul style={{ listStyle: 'none' }}>{references}</ul>
        </h5>
        <RepoSegment segments={sample.segments} />
        <ToggleIndicator onClick={this.toggleSA} name="Analyses" indicatorStyle={expandSA ? 'down' : 'right'} />
        <span className="label" style={{ color: 'black', fontSize: 'smaller', fontWeight: 'bold' }}>
          {AnalysesTypeJoinLabel(ArrayUtils.sortArrByIndex(analyses), 'Sample')}
        </span>
        <Panel style={{ border: 'none' }} id="collapsible-panel-sample-analyses" expanded={expandSA} defaultExpanded={expandSA} onToggle={() => { }}>
          <Panel.Collapse>
            <Panel.Body style={{ fontSize: '90%', backgroundColor: '#f5f5f5', padding: '4' }}>
              {this.renderAnalyses(analyses)}
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </Jumbotron>
    );
  }
}

RepoSample.propTypes = {
  sample: PropTypes.object.isRequired,
  pubData: PropTypes.object.isRequired,
  tagData: PropTypes.object.isRequired,
  isPublished: PropTypes.bool.isRequired,
  canComment: PropTypes.bool,
  handleCommentBtn: PropTypes.func,
  isLogin: PropTypes.bool,
  isReviewer: PropTypes.bool
};

RepoSample.defaultProps = {
  canComment: false,
  isLogin: false,
  isReviewer: false,
  handleCommentBtn: () => { },
};
