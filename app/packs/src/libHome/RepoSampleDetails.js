import React, { Component } from 'react';
import { Panel } from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  ClosePanel,
  MoleculeInfo,
} from './RepoCommon';
import LoadingActions from '../components/actions/LoadingActions';
import ReviewActions from '../components/actions/ReviewActions';
import RepoReviewButtonBar from './RepoReviewButtonBar';
import RepoSample from './RepoSample';

export default class RepoSampleDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showReviewModal: false,
      showCommentModal: false,
      commentField: '',
      originInfo: '',
    };
    this.handleReviewBtn = this.handleReviewBtn.bind(this);
    this.handleCommentBtn = this.handleCommentBtn.bind(this);
    this.handleSubmitReview = this.handleSubmitReview.bind(this);
    // this.handleSubmitComment = this.handleSubmitComment.bind(this);
  }

  handleReviewBtn(showReviewModal, btnAction) {
    ReviewActions.handleReviewModal(showReviewModal, btnAction);
  }

//  this.handleCommentBtn(this.state.showCommentModal, this.state.commentField, this.state.originInfo)}

  handleCommentBtn(showCommentModal, commentField, originInfo) {
    ReviewActions.handleCommentModal(showCommentModal, 'Comment', commentField, originInfo);
  }
  handleSubmitReview(elementId, comment, action, checklist, reviewComments) {
    LoadingActions.start();
    ReviewActions.reviewPublish(elementId, 'sample', comment, action, checklist, reviewComments);
  }


  render() {
    const {
      element,
      isPublished,
      canComment,
      review_info,
      showComment,
      review,
      canClose,
    } = this.props;

    let { buttons } = this.props;

    const history = review?.history || [];
    if (typeof (element) === 'undefined' || !element) {
      return <div />;
    }
    if (review_info?.groupleader === true && review_info?.preapproved !== true) {
      buttons = ['Comments', 'Review', 'Approve'];
    }

    const {
      molecule, isLogin, isReviewer, xvialCom, labels
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

    tagData = (pubData?.taggable_data) || {};
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
        decoupled: s.decoupled,
        sid: s.sid,
        short_label: s.short_label || '',
        comp_num: s.comp_num || '',
        xvial: s.xvial,
        embargo: s.embargo,
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
        analyses: s.analyses || element.analyses || [],
        segments: s.segments || [],
        boiling_point: s.boiling_point || '',
        melting_point: s.melting_point || '',
        labels: (isPublished ? s.labels : labels) || [],
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
                review_info={review_info}
                showComment={showComment}
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
          {/* {
            canComment ?
              <div>
                <RepoCommentModal
                  show={this.state.showCommentModal}
                  elementId={sample.id}
                  elementType="Sample"
                  field={this.state.commentField}
                  orgInfo={this.state.originInfo}
                  review_info={review_info}
                  review={review || {}}
                  onUpdate={this.handleSubmitComment}
                  onHide={() => this.setState({ showCommentModal: false })}
                />
              </div> : ''
          } */}

        </Panel.Body>
      </Panel>
    );
  }
}

RepoSampleDetails.propTypes = {
  element: PropTypes.object.isRequired,
  isPublished: PropTypes.bool,
  canComment: PropTypes.bool,
  btnAction: PropTypes.string,
  review_info: PropTypes.object,
  showComment: PropTypes.bool,
  review: PropTypes.object,
  canClose: PropTypes.bool,
  buttons: PropTypes.arrayOf(PropTypes.string),
  onReviewUpdate: PropTypes.func,
};

RepoSampleDetails.defaultProps = {
  isPublished: false,
  canComment: false,
  btnAction: '',
  review_info: {},
  showComment: true,
  review: {},
  canClose: true,
  buttons: ['Decline', 'Comments', 'Review', 'Submit', 'Accept'],
  onReviewUpdate: () => {},
};
