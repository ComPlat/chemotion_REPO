import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import {
  Panel,
  Row,
  Col,
  Jumbotron,
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import { head, filter } from 'lodash';
import ArrayUtils from '../components/utils/ArrayUtils';
import {
  AuthorList,
  AuthorTitle,
  AffiliationList,
  CalcDuration,
  ChemotionId,
  ClosePanel,
  CommentBtn,
  ContributorInfo,
  DateInfo,
  Doi,
  ReactionTable,
  ReactionRinChiKey,
  ReactionProperties,
  ReactionTlc,
  RenderAnalysisHeader,
  RenderPublishAnalysesPanel,
  IconLicense,
  IconToMyDB,
  AnalysesTypeJoinLabel,
  SchemeWord,
} from './RepoCommon';
import LoadingActions from '../components/actions/LoadingActions';
import PublicActions from '../components/actions/PublicActions';
import QuillViewer from '../components/QuillViewer';
import { Citation, literatureContent, RefByUserInfo } from '../components/LiteratureCommon';
import RepoReactionSchemeInfo from './RepoReactionSchemeInfo';
import RepoReviewButtonBar from './RepoReviewButtonBar';
import RepoCommentModal from '../components/common/RepoCommentModal';
import RepoReviewModal from '../components/common/RepoReviewModal';

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
      showReviewModal: false,
      btnAction: '',
      showCommentModal: false,
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
    this.handleSubmitReview = this.handleSubmitReview.bind(this);
    this.handleCommentBtn = this.handleCommentBtn.bind(this);
    this.handleSubmitComment = this.handleSubmitComment.bind(this);
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
    this.setState({ showReviewModal, btnAction });
  }

  handleSubmitReview(elementId, comments, summary, feedback, action) {
    LoadingActions.start();
    PublicActions.reviewPublish(elementId, 'reaction', comments, summary, feedback, action);
    this.setState({ showReviewModal: false });
  }

  handleCommentBtn(show, field, orgInfo) {
    this.setState({
      showCommentModal: show,
      commentField: field,
      originInfo: orgInfo
    });
  }

  handleSubmitComment(elementId, elementType, field, comment, origInfo) {
    LoadingActions.start();
    const cinfo = {};
    if (typeof (cinfo[field]) === 'undefined') {
      cinfo[field] = {};
    }
    const today = new Date();
    const d = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()} `;
    const t = `${today.getHours()}:${today.getMinutes() + 1}:${today.getSeconds()} `;
    const dt = `${d} ${t}`;
    if (this.props.reviewLevel === 2) {
      cinfo[field].feedback = comment;
      cinfo[field].origInfo = origInfo;
      cinfo[field].feedback_time = dt;
    } else {
      cinfo[field].comment = comment;
      cinfo[field].origInfo = origInfo;
      cinfo[field].comment_time = dt;
    }

    PublicActions.updateComment(elementId, elementType, cinfo);
    this.setState({ showCommentModal: false });
  }

  reactionInfo(reaction) {
    const {
      showScheme, showRinchi, showProp, showTlc
    } = this.state;
    const {
      canComment,
      reviewLevel,
      submitter,
      pubState,
      comments,
    } = this.props;

    const svgPath = `/images/reactions/${reaction.reaction_svg_file}`;
    const content = reaction.description;
    const additionInfo = reaction.observation;

    const descContent = (content && content.ops && content.ops.length > 0
      && content.ops[0].insert) ? content.ops[0].insert.trim() : '';
    let descQV = (
      <span><b>Description:</b><QuillViewer value={content} preview />
      </span>);
    if (descContent === '') descQV = '';

    const addinfoContent = (additionInfo && additionInfo.ops && additionInfo.ops.length > 0 &&
      additionInfo.ops[0].insert) ? additionInfo.ops[0].insert.trim() : '';
    let addQV = (
      <span><b>Additional information for publication and purification details:</b>
        <QuillViewer value={additionInfo} preview />
      </span>);
    if (addinfoContent === '') addQV = '';

    const temperature = reaction.temperature ? `${reaction.temperature.userText} ${reaction.temperature.valueUnit}` : '';
    const duration = CalcDuration(reaction);
    const properties = `Status:[${reaction.status}]; Temperature:[${temperature}]; Duration: [${duration}]`;
    const tlc = `Solvents (parts):[${reaction.tlc_solvents || ''}]; Rf-Value:[${reaction.rf_value || ''}]; TLC-Description: [${reaction.tlc_description || ''}]`;

    const bodyAttrs = {
      style: {
        fontSize: '90%',
        paddingBottom: 'unset'
      }
    };
    const schemeOnly = (reaction && reaction.publication && reaction.publication.taggable_data &&
      reaction.publication.taggable_data.scheme_only === true) || false;
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
            comments={comments}
            reviewLevel={reviewLevel}
            pubState={pubState}
            submitter={submitter}
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
              <SVG key={svgPath} src={svgPath} className="reaction-details" />
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12} lg={12}>
              <CommentBtn {...this.props} field="Reaction Table" orgInfo="<Reaction Table>" onShow={this.handleCommentBtn} />
              <ReactionTable
                reaction={reaction}
                toggle={this.toggleScheme}
                show={showScheme}
                isPublic
                bodyAttrs={bodyAttrs}
              />
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12} lg={12}>
              <div className="desc small-p">
                <CommentBtn {...this.props} field="Description" orgInfo={descContent} onShow={this.handleCommentBtn} />
                {descQV}
              </div>
              <div className="desc small-p">
                <CommentBtn {...this.props} field="Additional information" orgInfo={addinfoContent} onShow={this.handleCommentBtn} />
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
              <CommentBtn {...this.props} field="Properties" orgInfo={properties} onShow={this.handleCommentBtn} />
              <ReactionProperties
                reaction={reaction}
                toggle={this.toggleProp}
                show={showProp}
                bodyAttrs={bodyAttrs}
              />
            </Col>
          </Row>
          <Row>
            <Col sm={12} md={12} lg={12}>
              <CommentBtn {...this.props} field="TLC-Control" orgInfo={tlc} onShow={this.handleCommentBtn} />
              <ReactionTlc
                reaction={reaction}
                toggle={this.toggleTlc}
                show={showTlc}
                bodyAttrs={bodyAttrs}
              />
            </Col>
          </Row>
        </Panel.Body>
      </Panel>
    );
  }

  renderAnalysisView(container, type, product = null, idx = -1, isLogin = false) {
    if (typeof (container) === 'undefined' || !container) {
      return <span />;
    }

    const analyses = ArrayUtils.sortArrByIndex(head(filter(container.children, o => o.container_type === 'analyses')).children);
    const show = this.state.showRA[idx];
    if (typeof (analyses) === 'undefined' || !analyses || analyses.length === 0) {
      return <div />;
    }

    const productHeader = (typeof (product) !== 'undefined' && product) ? <RenderAnalysisHeader key={`reaction-product-header-${product.id}`} element={product} isPublic={this.props.isPublished} isLogin={isLogin} /> : <span />;

    const analysesView = analyses.map((analysis) => {
      const kind = analysis.extended_metadata && analysis.extended_metadata.kind && analysis.extended_metadata['kind'].split('|').pop().trim();
      return (
        <span key={`analysis_${analysis.id}`}>
          <CommentBtn {...this.props} field={`Analysis_${analysis.id}`} orgInfo={kind} onShow={this.handleCommentBtn} />
          <RenderPublishAnalysesPanel
            key={`${type}_${analysis.id}`}
            analysis={analysis}
            elementType={type}
            isPublic={this.props.isPublished}
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
            cursor: 'pointer'
          }}
          onClick={() => this.toggleRA(idx)}
        >
          Analyses &nbsp;
          <i className={`glyphicon ${show}`} />
        </span>
        <span className="label" style={{ color: 'black', fontSize: 'smaller', fontWeight: 'bold' }}>
          {AnalysesTypeJoinLabel(analyses, type)}
        </span>
        <Panel style={{ border: 'none' }} id={`collapsible_${type}_analyses`} expanded={show} defaultExpanded onToggle={() => { }}>
          <Panel.Collapse>
            <Panel.Body style={{ fontSize: '90%', backgroundColor: '#f5f5f5', padding: '4' }}>
              {productHeader}
              {analysesView}
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    );
  }

  renderProductAnalysisView(products, isLogin = false) {
    if (typeof (products) === 'undefined' || !products || products.length === 0) {
      return <span />;
    }
    return products.map((product, idx) => (
      <div key={`product-${product.id}`}>
        {this.renderAnalysisView(product.container, 'Sample', product, idx, isLogin)}
      </div>
    ));
  }

  render() {
    const {
      reaction,
      isPublished,
      canComment,
      reviewLevel,
      submitter,
      pubState,
      comments,
      summary,
      feedback,
      canClose,
    } = this.props;
    let { buttons } = this.props;

    if (typeof (reaction) === 'undefined' || !reaction) {
      return <div />;
    }

    const taggData = (reaction && reaction.publication && reaction.publication.taggable_data) || {};
    const pubData = (reaction && reaction.publication) || {};
    const doi = (reaction && reaction.doi) || {};

    const aId = [].concat.apply([], taggData.affiliation_ids);
    const affiliationMap = {};
    const { literatures } = reaction;
    const references = literatures ? literatures.map(lit => (
      <li key={`product_${lit.id}`} style={{ display: 'flex' }}>
        <RefByUserInfo info={lit.ref_added_by} />&nbsp;
        <i className={`icon-${lit.element_type.toLowerCase()}`} />&nbsp;
        <Citation key={lit.id} literature={lit} />
      </li>
    )) : [];
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

    const schemeOnly = (reaction && reaction.publication && reaction.publication.taggable_data &&
      reaction.publication.taggable_data.scheme_only === true) || false;

    let showDOI = <Doi type="reaction" id={reaction.id} doi={isPublished ? taggData.doi : doi} isPublished={isPublished} />;
    if (schemeOnly) {
      buttons = ['Decline', 'Comments', 'Accept'];
      showDOI = '';
    }

    const idyLogin = typeof reaction.isLogin === 'undefined' ? true : reaction.isLogin;

    return (
      <div style={{ border: 'none' }}>
        <div >
          <Jumbotron key={`reaction-${reaction.id}`}>
            {
              canComment ?
                <RepoReviewButtonBar
                  element={{ id: reaction.id, elementType: 'Reaction' }}
                  buttons={buttons}
                  buttonFunc={this.handleReviewBtn}
                  reviewLevel={reviewLevel}
                  pubState={pubState}
                  comments={comments}
                  summary={summary}
                  feedback={feedback}
                /> : ''
            }
            {canClose ? <ClosePanel element={reaction} /> : ''}
            <h4>
              <IconToMyDB isLogin={idyLogin} id={reaction.id} type="reaction" />{schemeOnly ? <SchemeWord /> : ''}&nbsp;
              <DateInfo pubData={pubData} tagData={taggData} isPublished={isPublished} />&nbsp;
              {IconLicense(license, (taggData.author_ids && (taggData.author_ids.length > 1)))}
            </h4>
            <br />
            <ContributorInfo contributor={taggData.contributors} />
            <h5>
              <b>{AuthorTitle(taggData.author_ids)} </b>
              <AuthorList creators={taggData.creators} affiliationMap={affiliationMap} />
            </h5>
            <AffiliationList
              affiliations={taggData.affiliations}
              affiliationMap={affiliationMap}
            />
            {showDOI}
            <ChemotionId id={pubData.id} type="reaction" />
            <h5>
              <CommentBtn {...this.props} field="Reference" orgInfo={referencesText} onShow={this.handleCommentBtn} />
              <b>Reference{references.length > 1 ? 's' : null}: </b>
              <ul style={{ listStyle: 'none' }}>{references}</ul>
            </h5>
            <br />
            <h5>
              {this.reactionInfo(reaction)}
            </h5>
            {schemeOnly ? '' : this.renderAnalysisView(reaction.container, 'Reaction')}
            {schemeOnly ? '' : this.renderProductAnalysisView(reaction.products, idyLogin)}
          </Jumbotron>
        </div>
        {
          canComment ? (
            <div>
              <RepoCommentModal
                show={this.state.showCommentModal}
                elementId={reaction.id}
                elementType="reaction"
                field={this.state.commentField}
                orgInfo={this.state.originInfo}
                state={pubState}
                reviewLevel={reviewLevel}
                submitter={submitter}
                commentObj={comments[this.state.commentField]}
                onUpdate={this.handleSubmitComment}
                onHide={() => this.setState({ showCommentModal: false })}
              />
              <RepoReviewModal
                show={this.state.showReviewModal}
                elementId={reaction.id}
                action={this.state.btnAction}
                state={pubState}
                reviewLevel={reviewLevel}
                submitter={submitter}
                comments={comments}
                summary={summary}
                feedback={feedback}
                onSubmit={this.handleSubmitReview}
                onHide={() => this.setState({ showReviewModal: false })}
              />
            </div>
          ) : ''
        }
      </div>);
  }
}

RepoReactionDetails.propTypes = {
  reaction: PropTypes.object.isRequired,
  isPublished: PropTypes.bool,
  canComment: PropTypes.bool,
  reviewLevel: PropTypes.number,
  submitter: PropTypes.string,
  pubState: PropTypes.string,
  comments: PropTypes.object,
  summary: PropTypes.string,
  feedback: PropTypes.string,
  canClose: PropTypes.bool,
  buttons: PropTypes.arrayOf(PropTypes.string),
};

RepoReactionDetails.defaultProps = {
  isPublished: false,
  canComment: false,
  reviewLevel: 0,
  submitter: '',
  pubState: '',
  comments: {},
  summary: '',
  feedback: '',
  canClose: true,
  buttons: ['Decline', 'Comments', 'Review', 'Submit', 'Accept'],
};
