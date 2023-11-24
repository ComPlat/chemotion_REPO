/* eslint-disable class-methods-use-this */
import alt from 'src/stores/alt/alt';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';

class RepositoryActions {
  publishSample(params, closeView = false) {
    return (dispatch) => { RepositoryFetcher.publishSample(params)
      .then((result) => {
        if (result != null) {
          dispatch({ element: result, closeView })
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  reviewPublish(element) {
    return (dispatch) => { RepositoryFetcher.reviewPublish(element)
      .then((result) => {
        dispatch({ element: result })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  publishSampleReserveDois(params, closeView = false) {
    return (dispatch) => { RepositoryFetcher.publishSample(params, 'dois')
      .then((result) => {
        if (result != null) {
          dispatch({ element: result, closeView })
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  publishReaction(params, closeView = false) {
    return (dispatch) => {
      RepositoryFetcher.publishReaction(params)
      .then((result) => {
        if (result != null) {
          dispatch({ element: result, closeView })
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  publishReactionReserveDois(params, closeView = false) {
    return (dispatch) => {
      RepositoryFetcher.publishReaction(params, 'dois')
      .then((result) => {
        if (result != null) {
          dispatch({ element: result, closeView })
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }
}

export default alt.createActions(RepositoryActions);
