import alt from 'src/stores/alt/alt';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import EmbargoFetcher from 'src/repo/fetchers/EmbargoFetcher';
import SearchFetcher from 'src/fetchers/SearchFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import RepoNavListTypes from 'src/repoHome/RepoNavListTypes';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

class PublicActions {
  initialize() {
    return (dispatch) => {
      PublicFetcher.initialize()
        .then(json => dispatch(json))
        .catch(err => console.log(err));
    };
  }

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

  loadSpectra(spcInfos) {
    const idxs = spcInfos && spcInfos.map(si => si.idx);
    if (idxs.length === 0) {
      return null;
    }

    return dispatch => {
      PublicFetcher.fetchFiles(idxs)
        .then(fetchedFiles => {
          dispatch({ fetchedFiles, spcInfos });
        })
        .catch(errorMessage => {
          console.log(errorMessage);
        });
    };
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
        if (result.error) {
          LoadingActions.stop();
        } else {
          dispatch({reactionData: result, id: id})
        }
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

  getElements(type='All', state='pending', label, searchType='All', searchValue='', page=1, perPage=10) {
    return (dispatch) => { RepositoryFetcher.fetchReviewElements(type, state, label, searchType, searchValue, page, perPage)
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
  handleCommentModal(show) {
    return show;
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

  publicSearch(params) {
    return params;
  }

  setSearchParams(params) {
    return params;
  }

  loadSpectraForNMRDisplayer(spcInfos) {
    const idxs = spcInfos && spcInfos.map(si => si.idx);
    if (idxs.length === 0) {
      return null;
    }

    return (dispatch) => {
      PublicFetcher.fetchFiles(idxs)
        .then((fetchedFiles) => {
          dispatch({ fetchedFiles, spcInfos });
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }
}

export default alt.createActions(PublicActions);
