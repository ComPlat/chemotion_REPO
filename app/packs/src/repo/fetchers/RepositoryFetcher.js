import 'whatwg-fetch';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const AnalysisIdstoPublish = element => (
  element
    .analysisArray()
    .filter(
      a =>
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true')
    )
    .map(x => x.id)
);

export default class RepositoryFetcher {
  static reviewPublish(element) {
    const { id, type } = element;
    return fetch('/api/v1/repository/reviewing/submit', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, type }),
    })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          const notification = {
            title: 'Failed to Submit for Review',
            message: `Error: ${json.error}`,
            level: 'error',
            dismissible: 'button',
            autoDismiss: 6,
            position: 'tr',
            uid: 'publish_error',
          };
          NotificationActions.add(notification);
          return null;
        }
        if (typeof json.reaction !== 'undefined') {
          json.reaction.can_publish = false;
          json.reaction.can_update = false;
          return new Reaction(json.reaction);
        }
        if (type === 'sample') {
          json.sample.can_publish = false;
          json.sample.can_update = false;
          return new Sample(json.sample);
        }
        return null;
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static publishSample(params, option = null) {
    const { sample, coauthors, reviewers, refs, embargo, license, addMe, addGroupLead } = params;
    const analysesIds = AnalysisIdstoPublish(sample);
    return fetch(`/api/v1/repository/publishSample/${option ? 'dois' : ''}`, {
      credentials: 'same-origin',
      method: option ? 'PUT' : 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: sample.id,
        analysesIds,
        coauthors,
        reviewers,
        refs,
        embargo,
        license,
        init_comment: sample.versionComment,
        addMe,
        addGroupLead,
      }),
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        if (json.error) {
          const notification = {
            title: 'Failed to Publish Sample',
            message: `Error: ${json.error}`,
            level: 'error',
            dismissible: 'button',
            autoDismiss: 6,
            position: 'tr',
            uid: 'publish_sample_error',
          };
          NotificationActions.add(notification);
          return null;
        }
        return { element: sample, closeView: true };
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static publishReactionScheme(params) {
    const {
      reaction,
      coauthors,
      reviewers,
      embargo,
      license,
      addMe,
      addGroupLead,
      schemeDesc,
    } = params;
    return fetch('/api/v1/repository/publishReactionScheme', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: reaction.id,
        temperature: reaction.temperature,
        duration: reaction.durationDisplay,
        products: reaction.products,
        schemeDesc,
        coauthors,
        reviewers,
        embargo,
        license,
        init_comment: reaction.versionComment,
        addMe,
        addGroupLead,
      }),
    })
      .then(response => {
        if (response.headers.get('content-type')?.includes('application/json')) {
          return response.json();
        } else {
          throw new Error(response.statusText);
        }
      })
      .then(json => {
        if (json.error) {
          const notification = {
            title: 'Failed to Publish Reaction Scheme',
            message: `Error: ${json.error}`,
            level: 'error',
            dismissible: 'button',
            autoDismiss: 6,
            position: 'tr',
            uid: 'publish_reaction_error',
          };
          NotificationActions.add(notification);
          return null;
        }
        return reaction;
      })
      .catch(errorMessage => {
        console.log('errorMessage', errorMessage);
        const notification = {
          title: 'Failed to Publish Scheme Only Reaction',
          message: `Error: ${errorMessage}`,
          level: 'error',
          dismissible: 'button',
          autoDismiss: 6,
          position: 'tr',
          uid: 'publish_reaction_error',
        };
        NotificationActions.add(notification);
        return null;
      });
  }

  static publishReaction(params, option = null) {
    const {
      reaction,
      coauthors,
      reviewers,
      refs,
      embargo,
      license,
      isFullyPublish,
      addMe,
      addGroupLead,
    } = params;
    if (!isFullyPublish) return this.publishReactionScheme(params);
    const analysesIds = reaction.samples.reduce(
      (acc, s) => acc.concat(AnalysisIdstoPublish(s)),
      AnalysisIdstoPublish(reaction)
    );
    return fetch(`/api/v1/repository/publishReaction/${option ? 'dois' : ''}`, {
      credentials: 'same-origin',
      method: option ? 'PUT' : 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: reaction.id,
        analysesIds,
        coauthors,
        reviewers,
        refs,
        embargo,
        license,
        init_comment: reaction.versionComment,
        addMe,
        addGroupLead,
      })
    })
      .then(response => {
        if (response.headers.get('content-type')?.includes('application/json')) {
          return response.json();
        } else {
          throw new Error(response.statusText);
        }
      })
      .then(json => {
        if (json.error) {
          const notification = {
            title: 'Failed to Publish Reaction',
            message: `Error: ${json.error}`,
            level: 'error',
            dismissible: 'button',
            autoDismiss: 6,
            position: 'tr',
            uid: 'publish_reaction_error',
          };
          NotificationActions.add(notification);
          return null;
        }
        if (option === 'dois') {
          json.reaction.can_publish = true;
          json.reaction.can_update = true;
        }
        return reaction;
      })
      .catch(errorMessage => {
        console.log('errorMessage', errorMessage);
        const notification = {
          title: 'Failed to Publish Reaction',
          message: `Error: ${errorMessage}`,
          level: 'error',
          dismissible: 'button',
          autoDismiss: 6,
          position: 'tr',
          uid: 'publish_reaction_error',
        };
        NotificationActions.add(notification);
        return null;
      });
  }

  static fetchReviewElements(
    type,
    state,
    label,
    searchType,
    searchValue,
    page,
    perPage
  ) {
    const strApi = '/api/v1/repository/review_list.json?';
    const paramSearchType =
      searchType && searchType !== '' ? `&search_type=${searchType}` : '';
    const paramSearchValue =
      searchValue && searchValue !== '' ? `&search_value=${searchValue}` : '';
    const searchLabel = label === null ? '' : `&label=${label}`;
    const paramPage = `&page=${page}&per_page=${perPage}`;
    const api = `${strApi}type=${type}&state=${state}${searchLabel}${paramSearchType}${paramSearchValue}${paramPage}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response =>
        response.json().then(json => ({
          elements: json.elements,
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10),
          selectType: type,
          selectState: state,
          searchType,
          searchValue,
        }))
      )
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchReaction(id) {
    const api = `/api/v1/repository/reaction.json?id=${id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchSample(id) {
    const api = `/api/v1/repository/sample.json?id=${id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static saveComments(id, type, comments) {
    return fetch('/api/v1/repository/reviewing/comments', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, type, comments })
    }).then(response => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static repoReviewPublish(id, type, comment, action, checklist = {}, reviewComments) {
    let api = '';
    if (action === 'Comments') {
      api = '/api/v1/repository/reviewing/comments';
    } else if (action === 'Accept') {
      api = '/api/v1/repository/reviewing/accepted';
    } else if (action === 'Approve') {
      api = '/api/v1/repository/reviewing/approved';
    } else if (action === 'Review') {
      api = '/api/v1/repository/reviewing/reviewed';
    } else if (action === 'Submit') {
      api = '/api/v1/repository/reviewing/submit';
    } else if (action === 'Decline') {
      api = '/api/v1/repository/reviewing/declined';
    } else {
      // return;
    }

    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id, type, comment, checklist, reviewComments
      })
    }).then(response => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchReviewSearchOptions(searchType, elementType, state) {
    return fetch(`/api/v1/repository/review_search_options.json?type=${searchType}&element_type=${elementType}&state=${state}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static previewMetadata(id, type) {
    return fetch('/api/v1/repository/metadata/preview', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, type })
    }).then(response => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static userComment(id, type, pageId, pageType, comment) {
    return fetch('/api/v1/repository/comment/user_comment', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, type, pageId, pageType, comment })
    }).then(response => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static reviewerComment(id, type, comment) {
    return fetch('/api/v1/repository/comment/reviewer', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, type, comment })
    }).then(response => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static updateComment(id, type, comments) {
    return fetch('/api/v1/repository/reviewing/comment', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, type, comments })
    }).then(response => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static saveRepoAuthors(params = {}) {
    return fetch('/api/v1/repository/save_repo_authors', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static zipPreviewMetadata(id, type) {
    const currentTime = Math.floor(Date.now() / 1000);
    const fileName = `metadata_${type}_${id}-${currentTime}.zip`;
    return fetch('/api/v1/repository/metadata/preview_zip', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, type })
    }).then((response) => {
      return response.blob();
    }).then((blob) => {
      const a = document.createElement('a');
      a.style = 'display: none';
      document.body.appendChild(a);
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static saveReviewLabel(params = {}) {
    return fetch('/api/v1/repository/save_repo_labels', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static compound(id, data, action = 'request') {
    const api = `/api/v1/repository/compound/${action}`;
    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data: data?.xid, xcomp: data?.xcomp })
    }).then(response => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
