import React, { Component } from 'react';
import { Panel } from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  ClosePanel,
  MoleculeInfo,
} from './RepoCommon';
import LoadingActions from '../components/actions/LoadingActions';
import PublicActions from '../components/actions/PublicActions';
import RepoReviewButtonBar from './RepoReviewButtonBar';
import RepoCommentModal from '../components/common/RepoCommentModal';
import RepoReviewModal from '../components/common/RepoReviewModal';
import RepoSample from './RepoSample';

export default class RepoSampleDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showReviewModal: false,
      btnAction: '',
      showCommentModal: false,
      commentField: '',
      originInfo: '',
    };
    this.handleReviewBtn = this.handleReviewBtn.bind(this);
    this.handleSubmitReview = this.handleSubmitReview.bind(this);
    this.handleCommentBtn = this.handleCommentBtn.bind(this);
    this.handleSubmitComment = this.handleSubmitComment.bind(this);
  }

  handleReviewBtn(showReviewModal, btnAction) {
    this.setState({ showReviewModal, btnAction });
  }

  handleSubmitReview(elementId, comment, action) {
    LoadingActions.start();
    PublicActions.reviewPublish(elementId, 'sample', comment, action);
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
    cinfo[field].comment = comment;
    cinfo[field].origInfo = origInfo;
    PublicActions.updateComment(elementId, elementType, cinfo);
    this.setState({ showCommentModal: false });
  }

  render() {
    const {
      element,
      isPublished,
      canComment,
      reviewLevel,
      isSubmitter,
      history,
      canClose,
      buttons
    } = this.props;

    if (typeof (element) === 'undefined' || !element) {
      return <div />;
    }

    const {
      molecule, isLogin, isReviewer, xvialCom
    } = element;

    const idyLogin = typeof isLogin === 'undefined' ? true : isLogin;
    const idyReview = typeof isReviewer === 'undefined' ? false : isReviewer;
    let samples = [];
    let pubData = {};
    let tagData = {};
    let { sample } = element;
    let hasXvial = false;
    if (isPublished) {
      samples = element.published_samples;
      sample = samples.find(x => x !== undefined) || {};
      sample.id = sample.sample_id;
      hasXvial = samples.filter(s => s !== undefined && s.xvial && s.xvial !== '').length > 0;
    } else {
      samples.push(element.sample);
      pubData = element.publication;
    }

    tagData = (pubData.taggable_data) || {};
    const details = (samples || []).map((s) => {
      if (isPublished) {
        pubData = {
          id: s.pub_id
        };
        tagData = {
          published_at: s.published_at,
          doi_reg_at: s.doi_reg_at
        };
      }
      const el = {
        id: s.id || s.sample_id,
        sid: s.sid,
        short_label: s.short_label || '',
        xvial: s.xvial,
        pub_info: s.pub_info,
        ana_infos: s.ana_infos,
        affiliation_ids: s.affiliation_ids || tagData.affiliation_ids,
        affiliations: s.affiliations || tagData.affiliations,
        literatures: s.literatures || element.literatures,
        license: s.license || tagData.license || 'CC BY-SA',
        author_ids: s.author_ids || tagData.author_ids || [],
        contributors: s.contributors || tagData.contributors,
        creators: s.creators || tagData.creators,
        doi: s.doi || element.doi,
        reaction_ids: s.reaction_ids || [],
        showed_name: s.showed_name,
        molecule_iupac: molecule.iupac_name || [],
        molecule_id: molecule.id,
        analyses: s.analyses || element.analyses || []
      };

      return (
        <RepoSample
          key={el.id}
          sample={el}
          pubData={pubData}
          tagData={tagData}
          handleCommentBtn={this.handleCommentBtn}
          isLogin={idyLogin}
          isReviewer={idyReview}
          {...this.props}
        />
      );
    });

    return (
      <Panel style={{ border: 'none' }} >
        <Panel.Body>
          {
            canComment ?
              <RepoReviewButtonBar
                element={{ id: sample.id, elementType: 'Sample' }}
                buttonFunc={this.handleReviewBtn}
                reviewLevel={reviewLevel}
                isSubmitter={isSubmitter}
                currComment={(history && history.slice(-1).pop()) || {}}
                buttons={buttons}
                taggData={tagData}
              /> : ''
          }
          {canClose ? <ClosePanel element={sample} /> : ''}
          <MoleculeInfo molecule={molecule} sample_svg_file={sample.sample_svg_file} hasXvial={hasXvial} xvialCom={xvialCom} />
          <div>
            {details}
          </div>
          {
            canComment ?
              <div>
                <RepoCommentModal
                  show={this.state.showCommentModal}
                  elementId={sample.id}
                  elementType="Sample"
                  field={this.state.commentField}
                  orgInfo={this.state.originInfo}
                  reviewLevel={reviewLevel}
                  history={history}
                  onUpdate={this.handleSubmitComment}
                  onHide={() => this.setState({ showCommentModal: false })}
                />
                <RepoReviewModal
                  show={this.state.showReviewModal}
                  elementId={sample.id}
                  action={this.state.btnAction}
                  reviewLevel={reviewLevel}
                  history={history}
                  onSubmit={this.handleSubmitReview}
                  onHide={() => this.setState({ showReviewModal: false })}
                />
              </div> : ''
          }

        </Panel.Body>
      </Panel>
    );
  }
}

RepoSampleDetails.propTypes = {
  element: PropTypes.object.isRequired,
  isPublished: PropTypes.bool,
  canComment: PropTypes.bool,
  reviewLevel: PropTypes.number,
  isSubmitter: PropTypes.bool,
  history: PropTypes.array,
  canClose: PropTypes.bool,
  buttons: PropTypes.arrayOf(PropTypes.string),
};

RepoSampleDetails.defaultProps = {
  isPublished: false,
  canComment: false,
  reviewLevel: 0,
  isSubmitter: false,
  history: [],
  canClose: true,
  buttons: ['Decline', 'Comments', 'Review', 'Submit', 'Accept'],
};
