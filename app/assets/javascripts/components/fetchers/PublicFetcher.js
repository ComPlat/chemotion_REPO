import 'whatwg-fetch'
import _ from 'lodash'
import Molecule from '../models/Molecule';
import Reaction from '../models/Reaction';

export default class PublicFetcher {
  static fetchPublicMolecules(params = {}) {
    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const advFlag = params.advFlag || false;
    const paramAdvType = params.advType ? `&adv_type=${params.advType}` : '';
    const paramAdvValue = params.advValue ? params.advValue.map(x => `&adv_val[]=${x.value}`).join('') : '';
    const api = `/api/v1/public/molecules.json?page=${page}&per_page=${perPage}&adv_flag=${advFlag}${paramAdvType}${paramAdvValue}`;

    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json().then(json => ({
        molecules: json.molecules.map(m => new Molecule(m)),
        page: parseInt(response.headers.get('X-Page')),
        pages: parseInt(response.headers.get('X-Total-Pages')),
        perPage: parseInt(response.headers.get('X-Per-Page'))
      }))).catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchPublicReactions(params = {}) {
    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const advFlag = params.advFlag || false;
    const paramAdvType = params.advType ? `&adv_type=${params.advType}` : '';
    const paramAdvValue = params.advValue ? params.advValue.map(x => `&adv_val[]=${x.value}`).join('') : '';
    const schemeOnly = params.schemeOnly || false;
    const api = `/api/v1/public/reactions.json?page=${page}&per_page=${perPage}&adv_flag=${advFlag}${paramAdvType}${paramAdvValue}&scheme_only=${schemeOnly}`;

    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json().then(json => ({
        reactions: json.reactions.map(m => new Reaction(m)),
        page: parseInt(response.headers.get('X-Page'), 10),
        pages: parseInt(response.headers.get('X-Total-Pages'), 10),
        perPage: parseInt(response.headers.get('X-Per-Page'), 10)
      }))).catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchAdvancedValues(advType, name) {
    return fetch(`/api/v1/public/find_adv_valuess.json?name=${name}&adv_type=${advType}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static searchPublicMolecules(params = {}) {
    const {
      collectionId,
      elementType,
      page,
      perPage,
      selection
    } = params;
    return fetch(`/api/v1/search/${elementType.toLowerCase()}`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selection,
        collection_id: collectionId || 'public',
        page: page || 1,
        per_page: perPage,
        is_sync: false,
        molecule_sort: false,
        is_public: true
      })
    }).then(response => response.json())
      .then(json => ({
        molecules: json.publicMolecules.molecules.map(m => new Molecule(m)),
        page: json.publicMolecules.page,
        totalElements: json.publicMolecules.totalElements,
        perPage: json.publicMolecules.perPage
      })).catch((errorMessage) => { console.log(errorMessage); });
  }

  static searchPublicReactions(params = {}) {
    const {
      collectionId,
      elementType,
      page,
      perPage,
      selection
    } = params;
    return fetch(`/api/v1/search/${elementType.toLowerCase()}`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selection,
        collection_id: collectionId || 'public',
        page: page || 1,
        per_page: perPage,
        is_sync: false,
        molecule_sort: false,
        is_public: true
      })
    }).then(response => response.json())
      .then(json => ({
        reactions: json.publicReactions.reactions.map(r => new Reaction(r)),
        page: json.publicReactions.page,
        totalElements: json.publicReactions.totalElements,
        perPage: json.publicReactions.perPage
      })).catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchLastPublished() {
    const api = '/api/v1/public/last_published.json';
    return fetch(api, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchLastPublishedSample() {
    const api = '/api/v1/public/last_published_sample.json';
    return fetch(api, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchDataset(id) {
    const api = `/api/v1/public/dataset.json?id=${id}`;
    return fetch(api, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchMolecule(id, advFlag = false, advType = '', advValues = null) {
    const paramAdvType = (advType && advType !== '') ? `&adv_type=${advType}` : '';
    const paramAdvValue = advValues ? advValues.map(x => `&adv_val[]=${x.value}`).join('') : '';
    const api = `/api/v1/public/molecule.json?id=${id}&adv_flag=${advFlag}${paramAdvType}${paramAdvValue}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchReaction(id) {
    const api = `/api/v1/public/reaction.json?id=${id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static queryPid(params) {
    const api = `/api/v1/public/pid/`

    return fetch(api, {
        method: 'post',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: params.id
        })
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        Aviator.navigate(json)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      })
  }

  static queryInchikey(params) {
    const api = `/api/v1/public/inchikey/`

    return fetch(api, {
        method: 'post',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inchikey: params.inchikey,
          type: params.type,
          version: params.version
        })
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        Aviator.navigate(json)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      })
  }

  static selectPublicCollection() {
    return fetch(
      '/api/v1/public/collection.json',
      { credentials: 'same-origin' }
    ).then((response) => { return response.json(); })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static publishedStatics() {
    const api = '/api/v1/public/published_statics';
    return fetch(api, {
      credentials: 'same-origin'
    }).then((response) => {
      return response.json();
    })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static affiliations(type) {
    const api = `/api/v1/public/affiliations/${type}`;
    return fetch(api, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
