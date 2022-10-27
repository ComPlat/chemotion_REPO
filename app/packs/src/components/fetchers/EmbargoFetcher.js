import 'whatwg-fetch';

export default class EmbargoFetcher {
  static fetchEmbargoElements(id) {
    const api = `/api/v1/public/col_list.json?collection_id=${id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchEmbargoElement(cid, el) {
    const api =
      `/api/v1/public/col_element.json?collection_id=${cid}&el_type=${el.type}&el_id=${el.id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchEmbargo(id) {
    const api = `/api/v1/public/embargo.json?id=${id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static deleteEmbargo(id) {
    const api = '/api/v1/repository/embargo/delete';
    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ collection_id: id })
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
  static moveEmbargo(id, newEmbargo, element) {
    const api = '/api/v1/repository/embargo/move';
    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ collection_id: id, new_embargo: newEmbargo.value, element })
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
  static refreshEmbargo(emb) {
    const api = '/api/v1/repository/embargo/refresh';
    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: emb.id, collection_id: emb.element_id })
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static assignEmbargo(embargoVal, element) {
    const api = '/api/v1/repository/assign_embargo';
    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_embargo: embargoVal, element })
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static releaseEmbargo(id) {
    const api = '/api/v1/repository/embargo/release';
    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection_id: id })
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static generateEmbargoAccount(id) {
    const api = '/api/v1/repository/embargo/account';
    return fetch(api, {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection_id: id })
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static repoFetchEmbargoElements(id) {
    const api = `/api/v1/repository/embargo/list.json?collection_id=${id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static repoFetchEmbargoElement(type, id) {
    const api = `/api/v1/repository/${type}.json?id=${id}&is_public=false`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchEmbargoCollections(isSubmit = false) {
    const api = '/api/v1/repository/embargo_list.json';
    return fetch(api, {
      method: 'post',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_submit: isSubmit
      })
    })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
