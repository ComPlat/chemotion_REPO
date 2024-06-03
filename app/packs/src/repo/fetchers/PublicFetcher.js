import 'whatwg-fetch';
import _ from 'lodash';
import { camelizeKeys } from 'humps';
import Molecule from 'src/models/Molecule';
import Reaction from 'src/models/Reaction';
import RepoNavListTypes from 'src/repoHome/RepoNavListTypes';

export default class PublicFetcher {
  static initialize() {
    const promise = fetch('/api/v1/public/initialize', {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then(json => camelizeKeys(json))
      .catch(err => console.log(err)); // eslint-disable-line

    return promise;
  }

  static fetchPublicMolecules(params = {}) {
    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const advFlag = params.advFlag || false;
    const paramAdvType = params.advType ? `&adv_type=${params.advType}` : '';

    let paramAdvValue = '';
    if (typeof params.advValue === 'number') {
      paramAdvValue = `&label_val=${params.advValue}`;
    } else if (Array.isArray(params.advValue)) {
      paramAdvValue = params.advValue.map(x => `&adv_val[]=${x.value}`).join('');
    } else {
      paramAdvValue = '';
    }
//     const paramAdvValue = params.advValue ? params.advValue.map(x => `&adv_val[]=${x.value}`).join('') : '';
    const listType = params.listType || RepoNavListTypes.SAMPLE;
    const api = `/api/v1/public/molecules.json?page=${page}&per_page=${perPage}&adv_flag=${advFlag}${paramAdvType}${paramAdvValue}&req_xvial=${listType === RepoNavListTypes.MOLECULE_ARCHIVE}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => response.json().then(json => ({
        molecules: json.molecules.map(m => new Molecule(m)),
        page: parseInt(response.headers.get('X-Page')),
        pages: parseInt(response.headers.get('X-Total-Pages')),
        perPage: parseInt(response.headers.get('X-Per-Page')),
        listType
      }))).catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchPublicReactions(params = {}) {
    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const advFlag = params.advFlag || false;
    const paramAdvType = params.advType ? `&adv_type=${params.advType}` : '';

    let paramAdvValue = '';
    if (typeof params.advValue === 'number') {
      paramAdvValue = `&label_val=${params.advValue}`;
    } else if (Array.isArray(params.advValue)) {
      paramAdvValue = params.advValue.map(x => `&adv_val[]=${x.value}`).join('');
    } else {
      paramAdvValue = '';
    }

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
    return fetch(`/api/v1/public/find_adv_values.json?name=${name}&adv_type=${advType}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchFiles(ids) {
    const promise = fetch('/api/v1/public/files', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
    return promise;
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
        perPage: json.publicMolecules.perPage,
        listType: params.listType
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
        perPage: json.publicReactions.perPage,
        listType: params.listType
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

    let paramAdvValue = '';
    if (typeof advValues === 'number') {
      paramAdvValue = `&label_val=${advValues}`;
    } else if (Array.isArray(advValues)) {
      paramAdvValue = advValues.map(x => `&adv_val[]=${x.value}`).join('');
    } else {
      paramAdvValue = '';
    }

    // const paramAdvValue = advValues ? advValues.map(x => `&adv_val[]=${x.value}`).join('') : '';
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

  static downloadZip(id) {
    let fileName = 'dataset.zip';
    return fetch(`/api/v1/public/download/dataset?id=${id}`, {
      credentials: 'same-origin', method: 'GET',
    }).then((response) => {
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      }
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

  static downloadDataset(id) {
    let fileName = 'dataset.xlsx';
    const api = `/api/v1/public/export_metadata?id=${id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            fileName = matches[1].replace(/['"]/g, '');
          }
        }
        return response.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.style = 'display: none';
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static getLD(type, id) {
    const api = `/api/v1/public/metadata/jsonld?type=${type}&id=${id}`;
    return fetch(api, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static convertMolfile(params) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000); // 10 seconds timeout

    return fetch('/api/v1/public/service/convert', {
      signal: abortController.signal, // pass the signal to the fetch function
      credentials: 'same-origin',
      method: 'post',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ molfile: params.data.mol })
    }).then((response) => {
      clearTimeout(timeoutId);
      return response.json();
    }).then(json => new Blob([json.molfile], { type: 'text/plain' })).catch((errorMessage) => {
      clearTimeout(timeoutId);
      throw new Error(errorMessage);
    });
  }

  static reviewers() {
    const promise = fetch('/intro/reviewers.json', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'cache-control': 'no-cache' }
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchThumbnail(attId) {
    const promise = fetch(`/api/v1/public/download/thumbnail?id=${attId}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
    return promise;
  }
}
