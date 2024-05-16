import React, { Component } from 'react';
import { Panel, Row, Col, Button, Jumbotron } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { head, filter } from 'lodash';
import ArrayUtils from 'src/utilities/ArrayUtils';
import {
  AuthorList,
  AffiliationList,
  CalcDuration,
  ChemotionId,
  ClosePanel,
  CommentBtn,
  ContributorInfo,
  ClipboardCopyBtn,
  Doi,
  ReactionTable,
  ReactionRinChiKey,
  RenderAnalysisHeader,
  RenderPublishAnalysesPanel,
  IconToMyDB,
  AnalysesTypeJoinLabel,
  SchemeWord,
  resizableSvg,
} from 'src/repoHome/RepoCommon';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';
import DateInfo from 'src/components/chemrepo/DateInfo';
import LicenseIcon from 'src/components/chemrepo/LicenseIcon';
import PublicAnchor from 'src/components/chemrepo/PublicAnchor';
import PublicCommentModal from 'src/components/chemrepo/PublicCommentModal';
import PublicReactionTlc from 'src/components/chemrepo/PublicReactionTlc';
import PublicReactionProperties from 'src/components/chemrepo/PublicReactionProperties';
import UserCommentModal from 'src/components/chemrepo/UserCommentModal';
import QuillViewer from 'src/components/QuillViewer';
import {
  Citation,
  literatureContent,
  RefByUserInfo,
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import RepoReactionSchemeInfo from 'src/repoHome/RepoReactionSchemeInfo';
import RepoReviewButtonBar from 'src/repoHome/RepoReviewButtonBar';
import Sample from 'src/models/Sample';
import RepoSegment from 'src/repoHome/RepoSegment';
import { getAuthorLabel } from 'src/components/chemrepo/publication-utils';

export default class RepoReactionDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showScheme: true,
      showRinchi: false,
      showProp: true,
      showTlc: true,
      showSA: true,
      showRA: {},
      // showReviewModal: false,
      // btnAction: '',
      // showCommentModal: false,
      commentField: '',
      originInfo: '',
    };

    this.toggleScheme = this.toggleScheme.bind(this);
    this.toggleRinchi = this.toggleRinchi.bind(this);
    this.toggleProp = this.toggleProp.bind(this);
    this.toggleTlc = this.toggleTlc.bind(this);
    this.toggleSA = this.toggleSA.bind(this);
    this.toggleRA = this.toggleRA.bind(this);
    this.handleToggle = this.handleToggle.bind(this);
    this.handleReviewBtn = this.handleReviewBtn.bind(this);
    this.handleCommentBtn = this.handleCommentBtn.bind(this);
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

  toggleSA() {
    const { showSA } = this.state;
    this.setState({ showSA: !showSA });
  }

  toggleRA(idx = -1) {
    const { showRA } = this.state;
    if (idx in showRA && showRA[idx] === false) {
      showRA[idx] = true;
    } else {
      showRA[idx] = false;
    }
    this.setState({ showRA });
  }

  handleToggle(type) {
    switch (type) {
      case 'Scheme':
        this.toggleScheme();
        break;
      case 'Rinchi':
        this.toggleRinchi();
        break;
      case 'Prop':
        this.toggleProp();
        break;
      default:
        break;
    }
  }

  handleReviewBtn(showReviewModal, btnAction) {
    ReviewActions.handleReviewModal(showReviewModal, btnAction);
  }
  handleCommentBtn(showCommentModal, commentField, originInfo) {
    ReviewActions.handleCommentModal(showCommentModal, 'Comment', commentField, originInfo);
  }

  updateRepoXvial() {
    PublicActions.displayReaction(this.props.reaction.id);
    PublicActions.refreshPubElements('Reactions');
  }

  reactionInfo(reaction) {
    const { showScheme, showRinchi, showProp, showTlc } = this.state;
    const { canComment, review_info, review, isPublished } = this.props;

    const svgPath = `/images/reactions/${reaction.reaction_svg_file}`;
    const content = reaction.description;
    const additionInfo = reaction.observation;

    const descContent =
      content && content.ops && content.ops.length > 0 && content.ops[0].insert
        ? content.ops[0].insert.trim()
        : '';
    let descQV = (
      <span>
        <b>Description:</b>
        <QuillViewer value={content} preview />
      </span>
    );
    if (descContent === '') {
      if (isPublished) descQV = '';
      else descQV = <span><b>Description:</b><br /><br /></span>;
    }

    const addinfoContent =
      additionInfo &&
      additionInfo.ops &&
      additionInfo.ops.length > 0 &&
      additionInfo.ops[0].insert
        ? additionInfo.ops[0].insert.trim()
        : '';
    let addQV = (
      <span>
        <b>Additional information for publication and purification details:</b>
        <QuillViewer value={additionInfo} preview />
      </span>
    );
    if (addinfoContent === '') {
      if (isPublished) addQV = '';
      else addQV = <span><b>Additional information for publication and purification details:</b><br /><br /></span>;
    }

    const temperature = reaction.temperature
      ? `${reaction.temperature.userText} ${reaction.temperature.valueUnit}`
      : '';
    const duration = CalcDuration(reaction);
    const properties = `Status:[${reaction.status}]; Temperature:[${temperature}]; Duration: [${duration}]`;
    const tlc = `Solvents (parts):[${reaction.tlc_solvents || ''}]; Rf-Value:[${
      reaction.rf_value || ''
    }]; TLC-Description: [${reaction.tlc_description || ''}]`;

    const bodyAttrs = {
      style: {
        fontSize: '90%',
        paddingBottom: 'unset',
      },
    };
    const schemeOnly =
      (reaction &&
        reaction.publication &&
        reaction.publication.taggable_data &&
        reaction.publication.taggable_data.scheme_only === true) ||
      false;
    if (schemeOnly) {
      if (canComment) {
        return (
          <RepoReactionSchemeInfo
            reaction={reaction}
            svgPath={svgPath}
            showScheme={showScheme}
            showRinchi={showRinchi}
            showProp={showProp}
            bodyAttrs={bodyAttrs}
            onToggle={this.handleToggle}
            review_info={review_info}
            onComment={this.handleCommentBtn}
            propInfo={properties}
            canComment={canComment}
          />
        );
      }
      return (
        <RepoReactionSchemeInfo
          reaction={reaction}
          svgPath={svgPath}
          showScheme={showScheme}
          showRinchi={showRinchi}
          showProp={showProp}
          bodyAttrs={bodyAttrs}
          onToggle={this.handleToggle}
          canComment={canComment}
        />
      );
    }
    return (
      <Panel style={{ marginBottom: '4px' }}>
        <Panel.Body style={{ paddingBottom: '1px' }}>
          <Row>
            <Col sm={12} md={12} lg={12}>
              {resizableSvg(svgPath)}
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12} lg={12}>
              <CommentBtn
                {...this.props}
                field="Reaction Table"
                orgInfo="<Reaction Table>"
                onShow={this.handleCommentBtn}
              />
              <ReactionTable
                reaction={reaction}
                toggle={this.toggleScheme}
                show={showScheme}
                isPublic
                isReview={this.props.isReview}
                bodyAttrs={bodyAttrs}
                canComment={canComment}
              />
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12} lg={12}>
              <div className="desc small-p">
                <CommentBtn
                  {...this.props}
                  field="Description"
                  orgInfo={descContent}
                  onShow={this.handleCommentBtn}
                />
                {descQV}
              </div>
              <div className="desc small-p">
                <CommentBtn
                  {...this.props}
                  field="Additional information"
                  orgInfo={addinfoContent}
                  onShow={this.handleCommentBtn}
                />
                {addQV}
              </div>
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12} lg={12}>
              <ReactionRinChiKey
                reaction={reaction}
                toggle={this.toggleRinchi}
                show={showRinchi}
                bodyAttrs={bodyAttrs}
              />
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12} lg={12}>
              <CommentBtn
                {...this.props}
                field="Properties"
                orgInfo={properties}
                onShow={this.handleCommentBtn}
              />
              <PublicReactionProperties
                reaction={reaction}
                toggle={this.toggleProp}
                show={showProp}
                isPublished={isPublished}
              />
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12} lg={12}>
              <CommentBtn
                {...this.props}
                field="TLC-Control"
                orgInfo={tlc}
                onShow={this.handleCommentBtn}
              />
              <PublicReactionTlc
                reaction={reaction}
                toggle={this.toggleTlc}
                show={showTlc}
                isPublished={isPublished}
              />
            </Col>
          </Row>
        </Panel.Body>
      </Panel>
    );
  }

  renderAnalysisView(
    container,
    type,
    product = null,
    idx = -1,
    isLogin = false,
    isReviewer = false,
    references = []
  ) {
    if (typeof container === 'undefined' || !container) return <span />;

    const analyses = ArrayUtils.sortArrByIndex(
      head(filter(container.children, (o) => o.container_type === 'analyses'))
        .children
    );
    const show = this.state.showRA[idx] || true;
    if (typeof analyses === 'undefined' || !analyses || analyses.length === 0) {
      return <div />;
    }
    const pdInfos =
      (this.props.reaction.infos &&
        this.props.reaction.infos.pd_infos &&
        this.props.reaction.infos.pd_infos[product && product.id]) ||
      '';
    const productHeader =
      typeof product !== 'undefined' && product ? (
        <RenderAnalysisHeader
          key={`reaction-product-header-${product.id}`}
          reactionId={this.props.reaction.id}
          element={product}
          isPublic={this.props.isPublished}
          isLogin={isLogin}
          isReviewer={isReviewer}
          userInfo={pdInfos}
          updateRepoXvial={() => this.updateRepoXvial()}
          xvialCom={product.xvialCom}
          literatures={references}
        />
      ) : (
        <span />
      );
    const specSample =
      type === 'Sample' && typeof product !== 'undefined' && product
        ? new Sample(product)
        : null;
    const analysesView = analyses.map((analysis) => {
      const kind =
        analysis.extended_metadata &&
        analysis.extended_metadata.kind &&
        analysis.extended_metadata['kind'].split('|').pop().trim();
      const anaInfo =
        (this.props.reaction.infos &&
          this.props.reaction.infos.ana_infos &&
          this.props.reaction.infos.ana_infos[analysis.id]) ||
        '';
      return (
        <span key={`analysis_${analysis.id}`}>
          <CommentBtn
            {...this.props}
            field={`Analysis_${analysis.id}`}
            orgInfo={kind}
            onShow={this.handleCommentBtn}
          />
          <RenderPublishAnalysesPanel
            key={`${type}_${analysis.id}`}
            userInfo={anaInfo}
            analysis={analysis}
            type="Container"
            pageType="reactions"
            pageId={this.props.reaction.id}
            isPublic={this.props.isPublished}
            isLogin={isLogin}
            isReviewer={isReviewer}
            element={specSample}
          />
        </span>
      );
    });

    return (
      <div>
        <span
          role="presentation"
          className="label label-default"
          style={{
            backgroundColor: '#777777',
            color: 'white',
            fontSize: 'smaller',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
          onClick={() => this.toggleRA(idx)}
        >
          Analyses &nbsp;
          <i className={`glyphicon ${show}`} />
          <i className={`fa fa-caret-${show ? 'down' : 'right'}`} />
        </span>
        <span
          className="label"
          style={{ color: 'black', fontSize: 'smaller', fontWeight: 'bold' }}
        >
          {AnalysesTypeJoinLabel(analyses, type)}
        </span>
        <Panel
          style={{ border: 'none' }}
          id={`collapsible_${type}_analyses`}
          expanded={show}
          defaultExpanded
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
              {productHeader}
              {analysesView}
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    );
  }

  renderProductAnalysisView(
    products,
    isLogin = false,
    isReviewer = false,
    references = []
  ) {
    if (typeof products === 'undefined' || !products || products.length === 0) {
      return <span />;
    }
    const prdReferences = (_sid, _references) =>
      _references
        ? _references.filter(
            (r) => r.element_type === 'Sample' && r.element_id === _sid
          )
        : [];
    return products.map((product, idx) => (
      <div key={`product-${product.id}`}>
        {this.renderAnalysisView(
          product.container,
          'Sample',
          product,
          idx,
          isLogin,
          isReviewer,
          prdReferences(product.id, references)
        )}
      </div>
    ));
  }

  render() {
    const {
      reaction,
      isPublished,
      canComment,
      review_info,
      showComment,
      review,
      canClose,
    } = this.props;
    let { buttons } = this.props;
    if (typeof reaction === 'undefined' || !reaction) {
      return <div />;
    }

    const taggData =
      (reaction &&
        reaction.publication &&
        reaction.publication.taggable_data) ||
      {};
    const pubData = (reaction && reaction.publication) || {};
    const doi = (reaction && reaction.doi) || {};

    const aId = [].concat.apply([], taggData.affiliation_ids);
    const affiliationMap = {};
    const { literatures } = reaction;
    const references = literatures
      ? literatures.map((lit) => (
          <li key={`product_${lit.id}`} style={{ display: 'flex' }}>
            <RefByUserInfo info={lit.ref_added_by} litype={lit.litype} />
            &nbsp;
            <i className={`icon-${lit.element_type.toLowerCase()}`} />
            &nbsp;
            <Citation key={lit.id} literature={lit} />
          </li>
        ))
      : [];
    const refArray = [];
    let referencesText = '';
    if (literatures) {
      literatures.forEach((lit) => {
        const content = literatureContent(lit, true);
        refArray.push(content);
      });
      referencesText = refArray.join('');
    }

    let aCount = 0;
    aId.map((e) => {
      if (!affiliationMap[e]) {
        aCount += 1;
        affiliationMap[e] = aCount;
      }
    });
    const license = taggData.license || 'CC BY-SA';

    const schemeOnly =
      (reaction &&
        reaction.publication &&
        reaction.publication.taggable_data &&
        reaction.publication.taggable_data.scheme_only === true) ||
      false;

    let showDOI = (
      <Doi
        type="reaction"
        id={reaction.id}
        doi={isPublished ? taggData.doi : doi}
        isPublished={isPublished}
      />
    );
    if (schemeOnly) {
      buttons = ['Decline', 'Comments', 'Review', 'Submit', 'Accept'];
      showDOI = '';
    }

    if (
      review_info?.groupleader === true &&
      review_info?.preapproved !== true
    ) {
      buttons = ['Comments', 'Review', 'Approve'];
    }

    const idyLogin =
      typeof reaction.isLogin === 'undefined' ? true : reaction.isLogin;
    const idyReview =
      typeof reaction.isReviewer === 'undefined' ? false : reaction.isReviewer;
    const userInfo = (reaction.infos && reaction.infos.pub_info) || '';

    let embargo = <span />;
    const colDoiPrefix = isPublished
      ? taggData.doi?.split('/')[0]
      : doi?.full_doi?.split('/')[0];
    if (reaction.embargo) {
      const embargoLink = isPublished
        ? `/inchikey/collection/${reaction.embargo}`
        : `/embargo/reaction/${reaction.id}`;
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
            &nbsp;&nbsp;{reaction.embargo}
          </Button>
          <ClipboardCopyBtn
            text={`https://dx.doi.org/${colDoiPrefix}/collection/${reaction.embargo}`}
            tooltip="retrieve and copy collection DOI"
          />
        </span>
      );
    }
    return (
      <div style={{ border: 'none' }}>
        <div>
          <Jumbotron key={`reaction-${reaction.id}`}>
            <PublicAnchor doi={isPublished ? taggData.doi : doi?.full_doi} isPublished={isPublished} />
            {canComment ? (
              <RepoReviewButtonBar
                element={{ id: reaction.id, elementType: 'Reaction' }}
                buttons={buttons}
                buttonFunc={this.handleReviewBtn}
                review_info={review_info}
                showComment={showComment}
                taggData={taggData}
                schemeOnly={schemeOnly}
                currComment={
                  (review?.history &&
                    review?.history.length > 0 &&
                    review?.history.slice(-1).pop()) ||
                  {}
                }
              />
            ) : (
              ''
            )}
            {canClose ? <ClosePanel element={reaction} /> : ''}
            <h4>
              <IconToMyDB
                isLogin={idyLogin}
                isPublished={isPublished}
                id={reaction.id}
                type="reaction"
              />
              {schemeOnly ? <SchemeWord /> : ''}&nbsp;
              <DateInfo
                isPublished={isPublished}
                preText="Reaction"
                pubData={pubData}
                tagData={taggData}
              />
              &nbsp;
              <LicenseIcon
                license={license}
                hasCoAuthors={
                  taggData.author_ids && taggData.author_ids.length > 1
                }
              />
              <PublicCommentModal
                isReviewer={idyReview}
                id={reaction.id}
                type="Reaction"
                title={`Reaction, CRR-${pubData.id}`}
                userInfo={userInfo}
              />
              &nbsp;
              <UserCommentModal
                isPublished={isPublished}
                isLogin={idyLogin}
                id={reaction.id}
                type="Reaction"
                title={`Reaction, CRR-${pubData.id}`}
              />
            </h4>
            <br />
            <ContributorInfo
              contributor={taggData.contributors}
              showHelp={schemeOnly}
            />
            <h5>
              <b>{getAuthorLabel(taggData.author_ids)} </b>
              <AuthorList
                creators={taggData.creators}
                affiliationMap={affiliationMap}
              />
            </h5>
            <AffiliationList
              affiliations={taggData.affiliations}
              affiliationMap={affiliationMap}
            />
            {showDOI}
            <ChemotionId id={pubData.id} type="reaction" />
            {embargo}
            <h5>
              <CommentBtn
                {...this.props}
                field="Reference"
                orgInfo={referencesText}
                onShow={this.handleCommentBtn}
              />
              <b>
                Reference{references.length > 1 ? 's' : null} in the Literature:{' '}
              </b>
              <ul style={{ listStyle: 'none' }}>{references}</ul>
            </h5>
            <br />
            <h5>{this.reactionInfo(reaction)}</h5>
            <RepoSegment segments={reaction.segments} isPublic={isPublished} />
            {schemeOnly
              ? ''
              : this.renderAnalysisView(
                  reaction.container,
                  'Reaction',
                  null,
                  -1,
                  idyLogin,
                  idyReview
                )}
            {schemeOnly
              ? ''
              : this.renderProductAnalysisView(
                  reaction.products,
                  idyLogin,
                  idyReview,
                  literatures
                )}
          </Jumbotron>
        </div>
      </div>
    );
  }
}

RepoReactionDetails.propTypes = {
  reaction: PropTypes.object.isRequired,
  isPublished: PropTypes.bool,
  canComment: PropTypes.bool,
  btnAction: PropTypes.string,
  review_info: PropTypes.object,
  showComment: PropTypes.bool,
  isReview: PropTypes.bool,
  review: PropTypes.object,
  canClose: PropTypes.bool,
  buttons: PropTypes.arrayOf(PropTypes.string),
  onReviewUpdate: PropTypes.func,
};

RepoReactionDetails.defaultProps = {
  isPublished: false,
  canComment: false,
  review_info: {},
  showComment: true,
  btnAction: '',
  isReview: false,
  review: {},
  canClose: true,
  buttons: ['Decline', 'Comments', 'Review', 'Submit', 'Accept'],
  onReviewUpdate: () => {},
};
