import alt from '../alt'
import PublicFetcher from '../fetchers/PublicFetcher'
import NotificationActions from './NotificationActions';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';

class PublicActions {

  close(deleteEl) {
    return { deleteEl }
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

  displayMolecule(id, advFlag = false, advType = '', advVal = '') {
    return (dispatch) => { PublicFetcher.fetchMolecule(id, advFlag, advType, advVal)
      .then((result) => {
        dispatch({moleculeData: result, id: id})
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

  getElements(type='All', state='pending', page=1, perPage=10) {
    return (dispatch) => { RepositoryFetcher.fetchReviewElements(type, state, page, perPage)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
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

  reviewPublish(id, type, comments, summary, feedback, action) {
    return (dispatch) => { RepositoryFetcher.repoReviewPublish(id, type, comments, summary, feedback, action)
      .then((result) => {
        dispatch({ id :id, element: result, type: type, comments: comments, summary: summary, feedback: feedback, action: action })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  displayReviewEmbargo(type, id) {
    return (dispatch) => {
      RepositoryFetcher.fetchEmbargoElement(type, id)
      .then((result) => {
        dispatch({ id, element: result })
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  generateEmbargoAccount(id) {
    return (dispatch) => {
      RepositoryFetcher.generateEmbargoAccount(id)
        .then((result) => {
          dispatch({ id, result })
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  fetchEmbargoBundle() {
    return (dispatch) => {
      RepositoryFetcher.fetchEmbargoCollections()
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      });
    }
  }

  releaseEmbargo(id) {
    return (dispatch) => {
      RepositoryFetcher.releaseEmbargo(id)
        .then((result) => {
          dispatch({ id, result })
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  deleteEmbargo(id) {
    return (dispatch) => {
      RepositoryFetcher.deleteEmbargo(id)
        .then((result) => {
          dispatch({ id, result })
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  moveEmbargo(id, newEmbargo, element) {
    return (dispatch) => {
      RepositoryFetcher.moveEmbargo(id, newEmbargo, element)
        .then((result) => {
          dispatch({ id, result })
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  getEmbargoElements(id) {
    return (dispatch) => {
      RepositoryFetcher.fetchEmbargoElements(id)
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
}

export default alt.createActions(PublicActions)
