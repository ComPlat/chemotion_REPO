import alt from 'src/stores/alt/alt';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';

class ReviewActions {
  handleReviewModal(show, action) {
    return { show, action };
  }
  handleCommentModal(show, action, field, orgInfo) {
    return { show, action, field, orgInfo };
  }
  updateReview(review) {
    return review;
  }

  fetchSample(id) {
    return (dispatch) => { RepositoryFetcher.fetchSample(id)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(`SampleDetailsRepoComment_${errorMessage}`);
        RepoLoadingActions.stop();
      });
    }
  }

  displayReviewReaction(id) {
    return (dispatch) => { RepositoryFetcher.fetchReaction(id)
      .then((result) => {
        dispatch({id, element: result})
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  displayReviewSample(id) {
    return (dispatch) => { RepositoryFetcher.fetchSample(id)
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
        // Stop the loading overlay so a failed review action (e.g. a 500 on
        // submit) doesn't leave the page spinning forever.
        RepoLoadingActions.stop();
      });};
  }


  getElements(type='All', state='pending', label=null, searchType='All', searchValue='', page=1, perPage=10) {
    return (dispatch) => { RepositoryFetcher.fetchReviewElements(type, state, label, searchType, searchValue, page, perPage)
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

  saveReviewLabel(element, ids) {
    return dispatch => {
      RepositoryFetcher.saveReviewLabel({
        elementId: element.id,
        elementType: element.elementType,
        user_labels: ids,
      })
        .then(() => {
          dispatch(element);
        })
        .catch(errorMessage => {
          console.log(errorMessage);
        });
    };
  }

  setUserLabel(label) {
    return label;
  }
}

export default alt.createActions(ReviewActions);
