import Aviator from 'aviator';
import alt from '../alt';
import ReviewActions from '../actions/ReviewActions';
import PublicActions from '../actions/PublicActions';
import EmbargoActions from '../actions/EmbargoActions';

class ReviewStore {
  constructor() {
    this.showReviewModal = false;
    this.reviewData = {};
    this.btnAction = '';
    //this.bundles = [];
    this.selectType;
    this.selectState;
    this.searchType;
    this.searchValue;
    this.currentElement = null;
    this.review = {};

    this.bindListeners({
      handleReviewModal: ReviewActions.handleReviewModal,
      handleDisplayReviewReaction: ReviewActions.displayReviewReaction,
      handleDisplayReviewSample: ReviewActions.displayReviewSample,
      handelReviewPublish: ReviewActions.reviewPublish,
      handleGetElements: ReviewActions.getElements,
      handelUpdateComment: ReviewActions.updateComment,
      handleUnitsSystem: ReviewActions.fetchUnitsSystem,
      handleReviewUpdate: ReviewActions.updateReview,
      handleFetchSample: ReviewActions.fetchSample,
      handleClose: PublicActions.close,
      handleRefreshEmbargoBundles: EmbargoActions.getEmbargoBundle,
      handleEmbargoAssign: EmbargoActions.assignEmbargo,
    });
  }

  handleClose({ deleteEl }) {
    this.setState({
      currentElement: null
    });
  }

  handleEmbargoAssign(result) {
    if (result.error) {
      alert(result.error);
    } else {
      alert(result.message);
      // refresh embargo list
      EmbargoActions.getEmbargoBundle();
      // refresh element list
      ReviewActions.getElements(
        this.selectType, this.selectState, this.searchType,
        this.searchValue, this.page, this.perPage
      );
    }
  }

  handleRefreshEmbargoBundles(result) {
    const cols = result.repository;
    const { current_user } = result;
    const bundles = [];
    if (cols && cols.length > 0) {
      cols.forEach((col) => {
        bundles.push(col);
      });
    }
    this.setState({ bundles, current_user });
  }

  handleUnitsSystem(result) {
    this.setState({ unitsSystem: result });
  }


  handleReviewUpdate(review) {
    this.setState({ review: review });
  }

  handleFetchSample(data) {
    if (data.sample && data.reviewLevel === 0) {
    } else {
      this.setState({
        currentElement: data || {},
        element: data || {},
        elementType: 'sample',
        reviewLevel: data?.reviewLevel || 0,
        isSubmitter: data?.isSubmitter || false,
        review: data?.publication?.review || {},
      });
    }
  }


  handleGetElements(results) {
    const {
      elements, page, perPage, pages, selectType, selectState, searchType, searchValue
    } = results;
    this.setState({
      elements, page, perPage, pages, selectType, selectState, searchType, searchValue, showReviewModal: false
    });
  }

  handleReviewModal(result) {
    this.setState({ showReviewModal: result.show, btnAction: result.action });
  }

  handelUpdateComment(result) {
    this.setState({ review: result.review, showReviewModal: false });
  }

  handelReviewPublish(results) {
    // const { history, checklist, reviewComments } = results.review;
    this.setState({ review: results.review, showReviewModal: false });
    ReviewActions.getElements(this.selectType || 'All', this.selectState || 'pending', this.searchType || 'All', this.searchValue || '', this.page, this.perPage);
  }

  handleDisplayReviewReaction(result) {
    const publication = (result.element && result.element.reaction && result.element.reaction.publication) || {};
    if (result.element && result.element.reviewLevel === 0) {
      Aviator.navigate('/home');
    } else {
      this.setState({
        guestPage: 'review',
        elementType: 'reaction',
        queryId: result?.id || 0,
        reaction: result?.element?.reaction || {},
        currentElement: result?.element || {},
        showReviewModal: false,
        review: publication?.review || {},
        reviewLevel: result?.element?.reviewLevel || 0,
        isSubmitter: result?.element?.isSubmitter || false
      });
      Aviator.navigate(`/review/review_reaction/${result.id}`, { silent: true });
    }
  }

  handleDisplayReviewSample(result) {
    const publication = (result.element && result.element.publication) || {};

    if (result.element && result.element.reviewLevel === 0) {
      Aviator.navigate('/home');
    } else {
      this.setState({
        guestPage: 'review',
        elementType: 'sample',
        queryId: result.id || 0,
        currentElement: result?.element || {},
        showReviewModal: false,
        review: publication?.review || {},
        isSubmitter: result?.element?.isSubmitter || false,
        reviewLevel: result?.element?.reviewLevel || 0,
      });
      Aviator.navigate(`/review/review_sample/${result.id}`, { silent: true });
    }
  }


};


export default alt.createStore(ReviewStore, 'ReviewStore');
