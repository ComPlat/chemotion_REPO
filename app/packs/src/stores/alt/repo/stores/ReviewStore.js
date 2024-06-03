import Aviator from 'aviator';
import alt from 'src/stores/alt/alt';
import UserStore from 'src/stores/alt/stores/UserStore';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';
import EmbargoActions from 'src/stores/alt/repo/actions/EmbargoActions';
import RepoConst from 'src/components/chemrepo/common/RepoConst';

class ReviewStore {
  constructor() {
    this.showReviewModal = false;
    this.showCommendModal = false;
    this.reviewData = {};
    this.btnAction = '';
    this.field = '';
    this.orgInfo = '';
    //this.bundles = [];
    this.selectType;
    this.selectState;
    this.selectLabel;
    this.searchType;
    this.searchValue;
    this.currentElement = null;
    this.review = {};
    this.review_info = {}

    this.bindListeners({
      handleReviewModal: ReviewActions.handleReviewModal,
      handleCommentModal: ReviewActions.handleCommentModal,
      handleDisplayReviewReaction: ReviewActions.displayReviewReaction,
      handleDisplayReviewSample: ReviewActions.displayReviewSample,
      handelReviewPublish: ReviewActions.reviewPublish,
      handleGetElements: ReviewActions.getElements,
      handelUpdateComment: ReviewActions.updateComment,
      handleReviewUpdate: ReviewActions.updateReview,
      handleFetchSample: ReviewActions.fetchSample,
      handleClose: PublicActions.close,
      handleRefreshEmbargoBundles: EmbargoActions.getEmbargoBundle,
      handleEmbargoAssign: EmbargoActions.assignEmbargo,
      handleSetUserLabel: ReviewActions.setUserLabel,
      handleSaveReviewLabel: ReviewActions.saveReviewLabel,
    });
  }

  handleClose({ deleteEl }) {
    this.setState({
      currentElement: null, showReviewModal: false, showCommentModal: false
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
        this.selectType, this.selectState, this.selectLabel, this.searchType,
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

  handleReviewUpdate(review) {
    this.setState({ review: review });
  }

  handleFetchSample(data) {
    if (data.sample && data?.review_info?.review_level === 0) {
    } else {
      this.setState({
        currentElement: data || {},
        element: data || {},
        elementType: 'sample',
        review_info: data?.review_info || {},
        review: data?.publication?.review || {},
      });
    }
  }


  handleGetElements(results) {
    const {
      elements, page, perPage, pages, selectType, selectState, searchType, searchValue
    } = results;
    this.setState({
      elements, page, perPage, pages, selectType, selectState, searchType, searchValue, showReviewModal: false, showCommentModal: false
    });
  }

  handleReviewModal(result) {
    this.setState({ showReviewModal: result.show, showCommentModal: false, btnAction: result.action });
  }

  handleCommentModal(result) {
    this.setState({ showCommentModal: result.show, showReviewModal: false, btnAction: result.action, field: result.field, orgInfo: result.orgInfo });
  }

  handelUpdateComment(result) {
    this.setState({ review: result.review, showReviewModal: false, showCommentModal: false });
  }

  handleSaveReviewLabel(element) {
    if (element.elementType === 'Reaction') {
      ReviewActions.displayReviewReaction(element.id);
    } else if (element.elementType === 'Sample') {
      ReviewActions.displayReviewSample(element.id);
    }
    ReviewActions.getElements(
      this.selectType || 'All',
      this.selectState || 'pending',
      this.selectLabel,
      this.searchType || 'All',
      this.searchValue || '',
      this.page,
      this.perPage
    );
  }

  handelReviewPublish(results) {
    // const { history, checklist, reviewComments } = results.review;
    this.setState({
      review: results.review,
      showReviewModal: false,
      showCommentModal: false,
      review_info: results.review_info,
    });
    ReviewActions.getElements(
      this.selectType || 'All',
      this.selectState || 'pending',
      this.selectLabel,
      this.searchType || 'All',
      this.searchValue || '',
      this.page,
      this.perPage
    );
  }

  handleDisplayReviewReaction(result) {
    const publication = result.element?.reaction?.publication || {};
    if (
      result.element?.review_info == null ||
      result.element?.review_info?.review_level === 0
    ) {
      //Aviator.navigate('/home');
    } else {
      const currentUser =
        (UserStore.getState() && UserStore.getState().currentUser) || {};
      if (currentUser?.type === RepoConst.U_TYPE.ANONYMOUS) {
        EmbargoActions.displayReviewEmbargo('reaction', result?.id);
      } else {
        this.setState({
          guestPage: 'review',
          elementType: 'reaction',
          queryId: result?.id || 0,
          reaction: result?.element?.reaction || {},
          currentElement: result?.element || {},
          showReviewModal: false,
          showCommentModal: false,
          review: publication?.review || {},
          review_info: result?.element?.review_info || {},
        });
        Aviator.navigate(`/review/review_reaction/${result.id}`, {
          silent: true,
        });
      }
    }
  }

  handleDisplayReviewSample(result) {
    const publication = result?.element?.publication || {};
    if (
      result.element?.review_info == null ||
      result.element?.review_info?.review_level === 0
    ) {
      //Aviator.navigate('/home');
    } else {
      const currentUser =
        (UserStore.getState() && UserStore.getState().currentUser) || {};
      if (currentUser?.type === RepoConst.U_TYPE.ANONYMOUS) {
        EmbargoActions.displayReviewEmbargo('sample', result?.id);
      } else {
        this.setState({
          guestPage: 'review',
          elementType: 'sample',
          queryId: result.id || 0,
          currentElement: result?.element || {},
          showReviewModal: false,
          showCommentModal: false,
          review: publication?.review || {},
          review_info: result?.element?.review_info || {},
        });
        Aviator.navigate(`/review/review_sample/${result.id}`, { silent: true });
      }
    }
  }

  handleSetUserLabel(label) {
    this.setState({ selectLabel: label });
  }
};


export default alt.createStore(ReviewStore, 'ReviewStore');
