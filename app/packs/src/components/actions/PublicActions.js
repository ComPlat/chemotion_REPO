import alt from '../alt';
import PublicFetcher from '../fetchers/PublicFetcher';
import NotificationActions from './NotificationActions';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';
import EmbargoFetcher from '../fetchers/EmbargoFetcher';
import SearchFetcher from '../fetchers/SearchFetcher';
import RepoNavListTypes from '../../libHome/RepoNavListTypes';

class PublicActions {
  refreshPubElements(type) {
    return type;
  }

  close(deleteEl) {
    return { deleteEl }
  }

  displayCollection(id) {
    return (dispatch) => { EmbargoFetcher.fetchEmbargo(id)
      .then((result) => {
        dispatch({colData: result, id: id})
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  getMolecules(pageParams={}) {
    return (dispatch) => { PublicFetcher.fetchPublicMolecules(pageParams)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  getReactions(pageParams={}) {
    return (dispatch) => { PublicFetcher.fetchPublicReactions(pageParams)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  getSearchMolecules(pageParams={}) {
    let uid;
    NotificationActions.add({
      title: "Searching ...",
      level: "info",
      position: "tc",
      onAdd: function(notificationObject) { uid = notificationObject.uid; }
    });

    return (dispatch) => { PublicFetcher.searchPublicMolecules(pageParams)
      .then((result) => {
        NotificationActions.removeByUid(uid);
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  getSearchReactions(pageParams = {}) {
    let uid;
    NotificationActions.add({
      title: "Searching ...",
      level: "info",
      position: "tc",
      onAdd: function (notificationObject) { uid = notificationObject.uid; }
    });

    return (dispatch) => {
      PublicFetcher.searchPublicReactions(pageParams)
      .then((result) => {
        NotificationActions.removeByUid(uid);
        dispatch(result)
      }).catch((errorMessage) => {
        NotificationActions.removeByUid(uid);
        console.log(errorMessage)
      })
    }
  }

  lastPublished() {
    return (dispatch) => {
      PublicFetcher.fetchLastPublished()
      .then((result) => {
        dispatch(result.last_published)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  lastPublishedSample(){
    return (dispatch) => { PublicFetcher.fetchLastPublishedSample()
      .then((result) => {
        dispatch(result.sample)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  openRepositoryPage(page) {
    if (page) {
      return page
    } else {
      return ""
    }
  }

  displayDataset(id) {
    return (dispatch) => { PublicFetcher.fetchDataset(id)
      .then((result) => {
        dispatch({dataset: result, id: id})
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  displayMolecule(id, anchor = '', advFlag = false, advType = '', advVal = '', listType = RepoNavListTypes.SAMPLE) {
    return (dispatch) => { PublicFetcher.fetchMolecule(id, advFlag, advType, advVal)
      .then((result) => {
        dispatch({moleculeData: result, id: id, anchor: anchor, listType})
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  displayReaction(id) {
    return (dispatch) => { PublicFetcher.fetchReaction(id)
      .then((result) => {
        dispatch({reactionData: result, id: id})
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  articles() {
    return (dispatch) => {
      fetch('/newsroom/index.json',
        {
          cache: 'no-store',
          headers: {
            'cache-control': 'no-cache'
          }
        }
      )
      .then(response => response.json())
      .then(json => {
        dispatch({data: json});
      }).catch((errorMessage) => {
        dispatch({ data: [] });
      });
    };
  }

  editArticle(key) {
    if (key === 'new') {
      return (dispatch) => {
          dispatch({ key: key, data: {} });
      };
    }
    return (dispatch) => {
      fetch(`/newsroom/${key}`,
        {
          cache: 'no-store',
          headers: {
            'cache-control': 'no-cache'
          }
        }
      )
      .then(response => response.json())
      .then(json => {
        dispatch({key: key, data: json});
      })
    };
  }

  displayArticle(key) {
    return (dispatch) => {
      fetch(`/newsroom/${key}`,
        {
          cache: 'no-store',
          headers: {
            'cache-control': 'no-cache'
          }
        }
      )
      .then(response => response.json())
      .then(json => {
        dispatch({key: key, data: json});
      })
    };
  }

  howtos() {
    return (dispatch) => {
      fetch('/howto/index.json',
        {
          cache: 'no-store',
          headers: {
            'cache-control': 'no-cache'
          }
        }
      )
        .then(response => response.json())
        .then(json => {
          dispatch({ data: json });
        }).catch((errorMessage) => {
          // console.log(errorMessage);
          dispatch({ data: [] });
        });
    };
  }

  editHowTo(key) {
    if (key === 'ein') {
      return (dispatch) => {
        dispatch({ key: key, data: {} });
      };
    }
    return (dispatch) => {
      fetch(`/howto/${key}`,
        {
          cache: 'no-store',
          headers: {
            'cache-control': 'no-cache'
          }
        }
      )
        .then(response => response.json())
        .then(json => {
          dispatch({ key: key, data: json });
        })
    };
  }

  displayHowTo(key) {
    return (dispatch) => {
      fetch(`/howto/${key}`,
        {
          cache: 'no-store',
          headers: {
            'cache-control': 'no-cache'
        }}
      )
        .then(response => response.json())
        .then(json => {
          dispatch({ key: key, data: json });
        })
    };
  }

  selectPublicCollection() {
    return (dispatch) => {
      PublicFetcher.selectPublicCollection()
        .then((result) => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); })
    }
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

  publishedStatics() {
    return (dispatch) => {
      PublicFetcher.publishedStatics()
        .then((result) => {
          dispatch(result.published_statics)
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  handleReviewModal(show) {
    return show;
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

  fetchBasedOnSearchSelectionAndCollection(params) {
    let uid;
    NotificationActions.add({
      title: "Searching ...",
      level: "info",
      position: "tc",
      onAdd: function(notificationObject) { uid = notificationObject.uid; }
    });
    return (dispatch) => {
      SearchFetcher.fetchBasedOnSearchSelectionAndCollection(params)
        .then((result) => {
          dispatch(result);
          NotificationActions.removeByUid(uid);
        }).catch((errorMessage) => { console.log(errorMessage); });
    };
  }
}

export default alt.createActions(PublicActions)
