import 'whatwg-fetch';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';
import NotificationActions from '../actions/NotificationActions';

const AnalysisIdstoPublish = element => (
  element.analysisArray()
    .filter(a => (a.extended_metadata.publish && (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true')))
    .map(container => {
      return container.link_id ? container.link_id : container.id;
    })
);

export default class RepositoryFetcher {

  static reviewPublish(element) {
    const { id, type } = element;
    return fetch('/api/v1/repository/reviewing/submit', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, type })
    }).then(response => response.json())
      .then((json) => {
        if (typeof json.reaction !== 'undefined') {
          json.reaction.can_publish = false;
          json.reaction.can_update = false;
          return new Reaction(json.reaction);
        } else if (type === 'sample') {
          json.sample.can_publish = false;
          json.sample.can_update = false;
          return new Sample(json.sample);
        }
        return null;
    })
    .catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static publishSample(params, option = null) {
    const { sample, coauthors, reviewers, refs, embargo, license, addMe } = params;
    const analysesIds = AnalysisIdstoPublish(sample);
    return fetch(`/api/v1/repository/publishSample/${option ? 'dois' : ''}`, {
      credentials: 'same-origin',
      method: option ? 'PUT' : 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sampleId: sample.id,
        analysesIds,
        coauthors,
        reviewers,
        refs,
        embargo,
        license,
        addMe
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      if (json.error) {
        const notification = {
          title: 'Publish sample fail',
          message: `Error: ${json.error}`,
          level: 'error',
          dismissible: 'button',
          autoDismiss: 6,
          position: 'tr',
          uid: 'publish_sample_error'};
        NotificationActions.add(notification);
        return null;
      }
      if (option=='dois') {
        json.sample.can_publish = true;
        json.sample.can_update = true;
      }
      return new Sample(json.sample);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static publishReactionScheme(params) {
    const {
      reaction, coauthors, reviewers, embargo, license, addMe, schemeDesc
    } = params;
    return fetch('/api/v1/repository/publishReactionScheme', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reactionId: reaction.id,
        temperature: reaction.temperature,
        duration: reaction.durationDisplay,
        products: reaction.products,
        schemeDesc,
        coauthors,
        reviewers,
        embargo,
        license,
        addMe
      })
    })
      .then(response => (response.json()))
      .then((json) => {
        if (json.error) {
          const notification = {
            title: 'Publish reaction scheme fail',
            message: `Error: ${json.error}`,
            level: 'error',
            dismissible: 'button',
            autoDismiss: 6,
            position: 'tr',
            uid: 'publish_reaction_error'
          };
          NotificationActions.add(notification);
          return null;
        }
        return new Reaction(json.reaction);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static publishReaction(params, option = null) {
    const { reaction, coauthors, reviewers, refs, embargo, license, isFullyPublish, addMe } = params;
    if (!isFullyPublish) return this.publishReactionScheme(params);
    const analysesIds = reaction.samples.reduce((acc, s) => acc.concat(AnalysisIdstoPublish(s)),
      AnalysisIdstoPublish(reaction)
    )
    return fetch(`/api/v1/repository/publishReaction/${option ? 'dois' : ''}`, {
      credentials: 'same-origin',
      method: option ? 'PUT' : 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reactionId: reaction.id,
        analysesIds,
        coauthors,
        reviewers,
        refs,
        embargo,
        license,
        addMe
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      if (json.error) {
        const notification = {
          title: 'Publish reaction fail',
          message: `Error: ${json.error}`,
          level: 'error',
          dismissible: 'button',
          autoDismiss: 6,
          position: 'tr',
          uid: 'publish_reaction_error'
        };
        NotificationActions.add(notification);
        return null;
      }
      if (option=='dois') {
        json.reaction.can_publish = true;
        json.reaction.can_update = true;
      }
      return new Reaction(json.reaction);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static createNewSampleVersion(params, option = null) {
    const { id } = params;
    return fetch(`/api/v1/repository/createNewSampleVersion/`, {
      credentials: 'same-origin',
      method: option ? 'PUT' : 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sampleId: id
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      if (json.error) {
        const notification = {
          title: 'Create new sample version fail',
          message: `Error: ${json.error}`,
          level: 'error',
          dismissible: 'button',
          autoDismiss: 6,
          position: 'tr',
          uid: 'create_new_sample_version_error'};
        NotificationActions.add(notification);
        return null;
      }
      return new Sample(json.sample);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static createNewReactionVersion(params, option = null) {
    const { id } = params;
    return fetch(`/api/v1/repository/createNewReactionVersion/`, {
      credentials: 'same-origin',
      method: option ? 'PUT' : 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reactionId: id
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      if (json.error) {
        const notification = {
          title: 'Create new reaction version fail',
          message: `Error: ${json.error}`,
          level: 'error',
          dismissible: 'button',
          autoDismiss: 6,
          position: 'tr',
          uid: 'create_new_reaction_version_error'};
        NotificationActions.add(notification);
        return null;
      }
      return new Reaction(json.reaction);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static fetchReviewElements(type, state, searchType, searchValue, page, perPage) {
    const paramSearchType = (searchType && searchType !== '') ? `&search_type=${searchType}` : '';
    const paramSearchValue = (searchValue && searchValue !== '') ? `&search_value=${searchValue}` : '';
    const api = `/api/v1/repository/list.json?type=${type}&state=${state}${paramSearchType}${paramSearchValue}&page=${page}&per_page=${perPage}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json().then(json => ({
        elements: json.elements,
        page: parseInt(response.headers.get('X-Page'), 10),
        pages: parseInt(response.headers.get('X-Total-Pages'), 10),
        perPage: parseInt(response.headers.get('X-Per-Page'), 10),
        selectType: type,
        selectState: state,
        searchType,
        searchValue
      })))
      .catch((errorMessage) => { console.log(errorMessage); });
  }


  static fetchReaction(id, isPublic) {
    const api = `/api/v1/repository/reaction.json?id=${id}&is_public=${isPublic}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchSample(id, isPublic) {
    const api = `/api/v1/repository/sample.json?id=${id}&is_public=${isPublic}`
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
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

  static compound(id, data, action = 'request') {
    const api = `/api/v1/repository/compound/${action}`;
    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data })
    }).then(response => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
