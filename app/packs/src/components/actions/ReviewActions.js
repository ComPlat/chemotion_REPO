import alt from '../alt';
import ReviewFetcher from '../fetchers/ReviewFetcher';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';

class ReviewActions {
  handleReviewModal(show, action) {
    return { show, action };
  }

  updateReview(review) {
    return review;
  }

  fetchSample(id) {
    return (dispatch) => { RepositoryFetcher.fetchSample(id, false)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(`SampleDetailsRepoComment_${errorMessage}`);
        LoadingActions.stop();
      });
    }
  }

  displayReviewReaction(id) {
    return (dispatch) => { RepositoryFetcher.fetchReaction(id, false)
      .then((result) => {
        dispatch({id, element: result})
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  displayReviewSample(id) {
    return (dispatch) => { RepositoryFetcher.fetchSample(id, false)
      .then((result) => {
        dispatch({id, element: result})
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  reviewPublish(id, type, comment, action, checklist, reviewComments) {
    return (dispatch) => { RepositoryFetcher.repoReviewPublish(id, type, comment, action, checklist, reviewComments)
      .then((result) => {
        dispatch({ id :id, element: result[`${type}`], type: type, review: result.review, comment: comment, action: action, review_info: result.review_info })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }


  getElements(type='All', state='pending', searchType='All', searchValue='', page=1, perPage=10) {
    return (dispatch) => { RepositoryFetcher.fetchReviewElements(type, state, searchType, searchValue, page, perPage)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }


  updateComment(id, type, comments) {
    return (dispatch) => {
      RepositoryFetcher.updateComment(id, type, comments)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchUnitsSystem() {
    return (dispatch) => { fetch('/units_system/units_system.json', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' }
      }).then(response => response.json()).then(json => dispatch(json)).catch((errorMessage) => {
        console.log(errorMessage);
      });
    }
  }

}
export default alt.createActions(ReviewActions);
