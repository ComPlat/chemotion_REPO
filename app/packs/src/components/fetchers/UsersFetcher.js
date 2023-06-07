import 'whatwg-fetch';

export default class CollaboratorFetcher {

  static fetchMyCollaborations() {
    return fetch('/api/v1/collaborators/list', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static AddMyCollaboration(params = {}) {
    return fetch('/api/v1/collaborators/add', {
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

  static createAddMyCollaboration(params = {}) {
    return fetch('/api/v1/collaborators/create', {
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


  static addCollaboratorAff(params = {}) {
    return fetch('/api/v1/collaborators/add_aff', {
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

  static deleteCollaboration(params) {
    return fetch('/api/v1/collaborators/delete', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static deleteCollaboratorAff(params) {
    return fetch('/api/v1/collaborators/delete_aff', {
      credentials: 'same-origin',
      method: 'PUT',
    });
  }

  static refreshOrcidAff(params) {
    return fetch('/api/v1/collaborators/refresh_orcid_aff', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }


  static loadOrcidByUserId(params) {
    return fetch('/api/v1/collaborators/load_orcid', {
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

  static fetchUsersByNameFirst(name, first, email) {
    return fetch(`/api/v1/collaborators/user.json?name=${name}&first=${first}&email=${email}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchandAddCollaboratorByOrcid(orcid) {
    return fetch(`/api/v1/collaborators/orcid.json?orcid=${orcid}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
