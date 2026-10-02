import React, { Component } from 'react';
import { RepoReviewModal, RepoCommentModal } from 'repo-review-ui';
import UIStore from 'src/stores/alt/stores/UIStore';
import ReviewActions from 'src/repo/actions/ReviewActions';
import ReviewStore from 'src/repo/stores/ReviewStore';

/**
 * RepoReviewManager - Manages repository review and comment modals
 * This component encapsulates all repository review-related functionality
 */
class RepoReviewManager extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showReviewModal: false,
      showCommentModal: false,
      review_info: null,
      review: null,
      currentElement: null,
      elementType: null,
      btnAction: null,
      field: null,
      orgInfo: null,
    };

    this.handleReviewStoreChange = this.handleReviewStoreChange.bind(this);
    this.handleSubmitReview = this.handleSubmitReview.bind(this);
    this.handleCommentUpdate = this.handleCommentUpdate.bind(this);
    this.handleReviewUpdate = this.handleReviewUpdate.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.handleReviewStoreChange);
    ReviewStore.listen(this.handleReviewStoreChange);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleReviewStoreChange);
    ReviewStore.unlisten(this.handleReviewStoreChange);
  }

  handleReviewStoreChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleSubmitReview(elementId, elementType, comment, btnAction, checklist, reviewComments) {
    ReviewActions.reviewPublish(elementId, elementType, comment, btnAction, checklist, reviewComments);
    this.setState({ showReviewModal: false });
  }

  handleCommentUpdate(elementId, elementType, field, commentInput, origInfo) {
    const cinfo = {};
    if (typeof (cinfo[field]) === 'undefined') {
      cinfo[field] = {};
    }
    cinfo[field].comment = commentInput;
    cinfo[field].origInfo = origInfo;
    ReviewActions.updateComment(elementId, elementType, cinfo);
  }

  handleReviewUpdate(e, col, rr) {
    const { review } = this.state;
    const checklist = rr.checklist || {};
    if (typeof (checklist[col]) === 'undefined') checklist[col] = {};
    checklist[col].status = e.target.checked;
    review.checklist = checklist;
    ReviewActions.updateReview(review);
  }

  renderReviewModal() {
    const { showReviewModal, review_info, review, currentElement, elementType, btnAction } = this.state;
    const obj = {};
    obj.review_info = review_info;
    obj.review = review;
    obj.btnAction = btnAction;
    obj.elementType = elementType;
    obj.elementId = elementType === 'sample' ? currentElement?.sample?.id : currentElement?.reaction?.id;

    const { sttEnabled } = UIStore.getState();

    return (
      <RepoReviewModal
        show={showReviewModal}
        data={obj}
        onSubmit={this.handleSubmitReview}
        onUpdate={this.handleReviewUpdate}
        onHide={() => this.setState({ showReviewModal: false })}
        sttEnabled={sttEnabled || false}
      />
    );
  }

  renderCommentModal() {
    const { showCommentModal, review_info, review, currentElement, elementType, btnAction, field, orgInfo } = this.state;
    const obj = {};
    obj['review_info'] = review_info;
    obj['field'] = field;
    obj['orgInfo'] = orgInfo;
    obj['review'] = review;
    obj['btnAction'] = btnAction;
    obj['elementType'] = elementType;
    if (elementType === 'sample') {
      obj['elementId'] = currentElement?.sample?.id;
    } else {
      obj['elementId'] = currentElement?.reaction?.id;
    }
    const { sttEnabled } = UIStore.getState();

    return (
      <RepoCommentModal
        show={showCommentModal}
        data={obj}
        onUpdate={this.handleCommentUpdate}
        onHide={() => this.setState({ showCommentModal: false })}
        sttEnabled={sttEnabled || false}
      />
    );
  }

  render() {
    return (
      <>
        {this.renderReviewModal()}
        {this.renderCommentModal()}
      </>
    );
  }
}

export default RepoReviewManager;
