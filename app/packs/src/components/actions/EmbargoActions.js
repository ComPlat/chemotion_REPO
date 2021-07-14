import alt from '../alt';
import EmbargoFetcher from '../fetchers/EmbargoFetcher';

class EmbargoActions {

  displayEmbargo(id) {
    return (dispatch) => { EmbargoFetcher.fetchEmbargo(id)
      .then((result) => {
        dispatch({colData: result, id: id})
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }


  getEmbargoElements(id) {
    return (dispatch) => {
      EmbargoFetcher.fetchEmbargoElements(id)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  getEmbargoElement(cid, el) {
    return (dispatch) => {
      EmbargoFetcher.fetchEmbargoElement(cid, el)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  moveEmbargo(id, newEmbargo, element) {
    return (dispatch) => {
      EmbargoFetcher.moveEmbargo(id, newEmbargo, element)
        .then((result) => {
          dispatch({ id, result })
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  assignEmbargo(newEmbargo, element) {
    return (dispatch) => {
      EmbargoFetcher.assignEmbargo(newEmbargo, element)
        .then((result) => {
          dispatch(result)
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  fetchEmbargoBundle() {
    return (dispatch) => {
      EmbargoFetcher.fetchEmbargoCollections()
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      });
    }
  }

  displayReviewEmbargo(type, id) {
    return (dispatch) => {
      EmbargoFetcher.repoFetchEmbargoElement(type, id)
      .then((result) => {
        dispatch({ id, element: result })
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  releaseEmbargo(id) {
    return (dispatch) => {
      EmbargoFetcher.releaseEmbargo(id)
        .then((result) => {
          dispatch({ id, result })
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  deleteEmbargo(id) {
    return (dispatch) => {
      EmbargoFetcher.deleteEmbargo(id)
        .then((result) => {
          dispatch({ id, result })
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }


  generateEmbargoAccount(id) {
    return (dispatch) => {
      EmbargoFetcher.generateEmbargoAccount(id)
        .then((result) => {
          dispatch({ id, result })
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  getEmbargoBundle() {
    return (dispatch) => {
      EmbargoFetcher.fetchEmbargoCollections()
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      });
    }
  }
}

export default alt.createActions(EmbargoActions);
