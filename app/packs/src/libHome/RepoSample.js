/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Jumbotron, Panel } from 'react-bootstrap';
import { AffiliationMap } from 'repo-review-ui';
import ArrayUtils from '../components/utils/ArrayUtils';
import {
  AffiliationList,
  AnalysesTypeJoinLabel,
  AuthorList,
  CommentBtn,
  ContributorInfo,
  ClipboardCopyBtn,
  IconToMyDB,
  RenderPublishAnalysesPanel,
  SidToPubChem,
  ToggleIndicator,
  ElStateLabel,
} from './RepoCommon';
import DateInfo from '../components/chemrepo/DateInfo';
import LicenseIcon from '../components/chemrepo/LicenseIcon';
import MAPanel from '../components/chemrepo/MoleculeArchive';
import PublicActions from '../components/actions/PublicActions';
import PublicAnchor from '../components/chemrepo/PublicAnchor';
import PublicSample from '../components/chemrepo/PublicSample';
import PublicCommentModal from '../components/chemrepo/PublicCommentModal';
import RepoSegment from './RepoSegment';
import Sample from '../components/models/Sample';
import UserCommentModal from '../components/chemrepo/UserCommentModal';
import PublicLabels from '../components/chemrepo/PublicLabels';

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
      expandSA: true,
      expandSG: '',
    };
    this.panelRef = React.createRef();
    this.materialRef = React.createRef();
    this.handleAnalysesLink = this.handleAnalysesLink.bind(this);
    this.handleMaterialLink = this.handleMaterialLink.bind(this);
    this.toggleSA = this.toggleSA.bind(this);
    this.renderAnalyses = this.renderAnalyses.bind(this);
  }

  componentDidMount() {
    scrollView();
  }

  componentDidUpdate() {
    scrollView();
  }

  handleAnalysesLink() {
    this.panelRef.current.scrollIntoView({ behavior: 'smooth' });
  }

  handleMaterialLink() {
    this.materialRef.current.scrollIntoView({ behavior: 'smooth' });
  }

  toggleSA() {
    const { expandSA } = this.state;
    this.setState({ expandSA: !expandSA });
  }

  updateRepoXvial(elementId) {
    const { listType } = this.props;
    PublicActions.displayMolecule(elementId, '', false, '', '', listType);
    PublicActions.refreshPubElements(`Molecules=${listType}`);
  }

  renderAnalyses(analyses) {
    const { sample } = this.props;
    const specSample = new Sample(sample);
    specSample.container = sample.analyses;
    const orderAnalyses = ArrayUtils.sortArrByIndex(analyses);
    return orderAnalyses.map((analysis) => {
      const userInfo =
        (sample.ana_infos && sample.ana_infos[analysis.id]) || '';
      const kind = (analysis.extended_metadata['kind'] || '')
        .split('|')
        .pop()
        .trim();
      return (
        <span key={`analysis_${analysis.id}`}>
          <CommentBtn
            {...this.props}
            field={`Analysis_${analysis.id}`}
            orgInfo={kind}
            onShow={this.props.handleCommentBtn}
          />
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
      sample,
      pubData,
      tagData,
      isPublished,
      isLogin,
      isReviewer,
      element,
    } = this.props;
    const { xvialCom } = element;
    const { expandSA } = this.state;
    const affiliationMap = AffiliationMap(sample.affiliation_ids);

    const iupacUserDefined =
      sample.showed_name == sample.molecule_iupac ||
      sample.showed_name == null ? (
        <span />
      ) : (
        <h5>
          <b>Name: </b> {sample.showed_name}{' '}
        </h5>
      );
    const userInfo = sample.pub_info || '';
    const analyses =
      (sample.analyses &&
        sample.analyses.children &&
        sample.analyses.children.length > 0 &&
        sample.analyses.children[0].children) ||
      [];
    let embargo = null;
    let colDoiPrefix = sample?.doi || '';
    colDoiPrefix =
      typeof colDoiPrefix === 'object' ? sample.doi?.full_doi : colDoiPrefix;
    colDoiPrefix = colDoiPrefix.split('/')[0];
    if (sample.embargo) {
      const embargoLink = isPublished
        ? `/inchikey/collection/${sample.embargo}`
        : `/embargo/sample/${sample.id}`;
      embargo = (
        <span>
          <b>Access to the DOI and metadata for the whole data collection: </b>{' '}
          &nbsp;
          <Button
            key="embargo-link-btn"
            bsStyle="link"
            href={embargoLink}
            target="_blank"
            style={{ padding: '0px 0px' }}
          >
            <i className="fa fa-database" />
            &nbsp;&nbsp;{sample.embargo}
          </Button>
          <ClipboardCopyBtn
            text={`https://dx.doi.org/${colDoiPrefix}/collection/${sample.embargo}`}
            tooltip="retrieve and copy collection DOI"
          />
        </span>
      );
    }

    return (
      <Jumbotron key={`sample-${sample.id}`}>
        <PublicAnchor doi={sample.doi} isPublished={isPublished} />
        <span className="repo-pub-sample-header">
          <span className="repo-pub-title">
            <IconToMyDB
              isLogin={isLogin}
              isPublished={isPublished}
              id={sample.id}
              type="sample"
            />
          </span>
          &nbsp;
          <span className="repo-pub-title">
            <DateInfo
              isPublished={isPublished}
              preText="Sample"
              pubData={pubData}
              tagData={tagData}
            />
          </span>
          &nbsp;
          <SidToPubChem sid={sample.sid} />
          &nbsp;
          <span className="repo-public-user-comment">
            {PublicLabels(sample.labels)}
            <PublicCommentModal
              isReviewer={isReviewer}
              id={sample.id}
              type="Sample"
              title={sample.showed_name}
              userInfo={userInfo}
              pageType="molecules"
              pageId={sample.molecule_id}
            />
            &nbsp;
            <UserCommentModal
              isPublished={isPublished}
              isLogin={isLogin}
              id={sample.id}
              type="Sample"
              title={sample.showed_name}
              pageType="molecules"
              pageId={sample.molecule_id}
            />
            &nbsp;
          </span>
          {ElStateLabel(sample.embargo)}
        </span>
        <br />
        {iupacUserDefined}
        <ContributorInfo contributor={sample.contributors} />
        <h5>
          <b>Author{sample.author_ids.length > 1 ? 's' : ''}: </b>
          <AuthorList
            creators={sample.creators}
            affiliationMap={affiliationMap}
          />
        </h5>
        <AffiliationList
          affiliations={sample.affiliations}
          affiliationMap={affiliationMap}
        />
        <br />
        <PublicSample
          {...this.props}
          embargo={embargo}
          handleAnalysesLink={this.handleAnalysesLink}
          handleMaterialLink={this.handleMaterialLink}
        />
        <br />
        <div ref={this.materialRef}>
          <MAPanel
            compNum={sample.comp_num}
            isEditable={isReviewer}
            isLogin={isLogin}
            allowRequest
            elementId={sample.id}
            data={sample.xvial}
            saveCallback={() => this.updateRepoXvial(sample.molecule_id)}
            xvialCom={xvialCom}
          />
          &nbsp;
        </div>
        <RepoSegment segments={sample.segments} />
        <span className="repo-pub-sample-header">
          <div ref={this.panelRef}>
            <ToggleIndicator
              onClick={this.toggleSA}
              name="Analyses"
              indicatorStyle={expandSA ? 'down' : 'right'}
            />
          </div>
          <span
            className="label"
            style={{ color: 'black', fontSize: 'smaller', fontWeight: 'bold' }}
          >
            {AnalysesTypeJoinLabel(
              ArrayUtils.sortArrByIndex(analyses),
              'Sample'
            )}
          </span>
          <LicenseIcon
            license={sample.license}
            hasCoAuthors={sample.author_ids.length > 1}
          />
        </span>
        <Panel
          style={{ border: 'none' }}
          id="collapsible-panel-sample-analyses"
          expanded={expandSA}
          defaultExpanded={expandSA}
          onToggle={() => {}}
        >
          <Panel.Collapse>
            <Panel.Body
              style={{
                fontSize: '90%',
                backgroundColor: '#f5f5f5',
                padding: '4',
              }}
            >
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
  isReviewer: PropTypes.bool,
};

RepoSample.defaultProps = {
  canComment: false,
  isLogin: false,
  isReviewer: false,
  handleCommentBtn: () => {},
};
