import 'whatwg-fetch';

// TODO: SamplesFetcher also updates Samples and so on...naming?
export default class UsersFetcher {
  static fetchUsersByName(name) {
    const promise = fetch(`/api/v1/users/name.json?name=${name}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchCurrentUser() {
    const promise = fetch('/api/v1/users/current.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchProfile() {
    const promise = fetch('/api/v1/profiles.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static updateUserProfile(params = {}) {
    const promise = fetch('/api/v1/profiles/', {
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

  static fetchNoVNCDevices(id = 0) {
    return fetch(`/api/v1/devices/novnc?id=${id}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
    }).then(response => response.json())
      .then(json => json.devices)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static createGroup(params = {}) {
    const promise = fetch('/api/v1/groups/create', {
      credentials: 'same-origin',
      method: 'POST',
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

  static fetchCurrentGroup() {
    const promise = fetch('/api/v1/groups/qrycurrent', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static updateGroup(params = {}) {
    const promise = fetch(`/api/v1/groups/upd/${params.id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: params.id,
        destroy_group: params.destroy_group,
        rm_users: params.rm_users,
        add_users: params.add_users,
      })
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchOls(name, edited = true) {
    return fetch(`/api/v1/ols_terms/list.json?name=${name}&edited=${edited}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }


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

  static deleteCollaboratorAff(params) {
    return fetch('/api/v1/collaborators/delete_aff', {
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

  static fetchUsersByNameFirst(name, first) {
    return fetch(`/api/v1/collaborators/user.json?name=${name}&first=${first}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
