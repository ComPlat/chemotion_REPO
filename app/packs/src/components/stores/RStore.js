import Aviator from 'aviator';
import alt from '../alt';
import ReviewActions from '../actions/ReviewActions';
import EmbargoActions from '../actions/EmbargoActions';

class RStore {
  constructor() {
    this.bindListeners({
      navigateReview: [ReviewActions.displayReviewSample, ReviewActions.displayReviewReaction],
      navigateEmbargoReview: [EmbargoActions.displayReviewEmbargo],
    });
  }

  navigate(page, result) {
    const elementType = (result.element.sample ? 'sample' : 'reaction');
    const subPage = page === 'embargo' ? elementType : `review_${elementType}`;
    if (result.element && result.element?.review_info?.review_level === 0) {
      Aviator.navigate('/home');
    } else {
      this.setState({ guestPage: page });
      Aviator.navigate(`/${page}/${subPage}/${result.id}`, { silent: true });
    }
  }

  navigateEmbargoReview(result) {
    this.navigate('embargo', result);
  }

  navigateReview(result) {
    this.navigate('review', result);
  }
}

export default alt.createStore(RStore, 'RStore');
