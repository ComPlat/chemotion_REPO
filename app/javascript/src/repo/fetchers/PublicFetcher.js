import 'whatwg-fetch';
import { camelizeKeys } from 'humps';
import Molecule from 'src/models/Molecule';
import Reaction from 'src/models/Reaction';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';

export default class PublicFetcher {
  static initialize() {
    const promise = fetch('/api/v1/public/initialize', {
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .then(json => camelizeKeys(json))
      .catch(err => {
        console.error(err);
        return {};
      });

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
      paramAdvValue = params.advValue
        .map(x => `&adv_val[]=${x.value}`)
        .join('');
    } else {
      paramAdvValue = '';
    }
    const listType = params.listType || RepoNavListTypes.SAMPLE;
    const isArchive = listType === RepoNavListTypes.MOLECULE_ARCHIVE;
    const qParam = params.q ? `&q=${encodeURIComponent(params.q)}` : '';
    const structureParam = params.structureQuery
      ? `&structure_query=${encodeURIComponent(params.structureQuery)}&structure_match=${params.structureMatch || 'sub'}`
      : '';
    const sortParam = params.sort ? `&sort=${encodeURIComponent(params.sort)}` : '';
    const arrayParam = (key, values) => ((values && values.length)
      ? values.map((v) => `&${key}[]=${encodeURIComponent(v)}`).join('')
      : '');
    const archiveYearsParam = arrayParam('archive_years', params.archiveYears);
    const archiveProvidersParam = arrayParam('archive_providers', params.archiveProviders);
    const archiveGroupsParam = arrayParam('archive_groups', params.archiveGroups);
    const archiveHasAnalysesParam = arrayParam('archive_has_analyses', params.archiveHasAnalyses);
    const archiveEmbargoesParam = arrayParam('archive_embargoes', params.archiveEmbargoes);
    const archiveSearchParams = isArchive
      ? `${qParam}${structureParam}${sortParam}${archiveYearsParam}${archiveProvidersParam}${archiveGroupsParam}${archiveHasAnalysesParam}${archiveEmbargoesParam}`
      : '';
    const baseUrl = isArchive
      ? '/api/v1/repo_compound_search/molecules.json'
      : '/api/v1/public/molecules.json';
    const reqXvialParam = isArchive ? '' : `&req_xvial=${listType === RepoNavListTypes.MOLECULE_ARCHIVE}`;
    const api = `${baseUrl}?page=${page}&per_page=${perPage}&adv_flag=${advFlag}${paramAdvType}${paramAdvValue}${reqXvialParam}${archiveSearchParams}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json().then(json => {
          if (!json?.molecules) throw new Error('Invalid response');
          const rawFacets = json.facets || null;
          const archiveFacets = rawFacets ? {
            years: rawFacets.years || [],
            providers: rawFacets.providers || [],
            groups: rawFacets.groups || [],
            hasAnalyses: rawFacets.hasAnalyses || rawFacets.has_analyses || [],
            embargoes: rawFacets.embargoes || [],
          } : null;
          return {
            molecules: json.molecules.map(m => new Molecule(m)),
            page: parseInt(response.headers.get('X-Page')),
            pages: parseInt(response.headers.get('X-Total-Pages')),
            perPage: parseInt(response.headers.get('X-Per-Page')),
            totalElements: parseInt(response.headers.get('X-Total'), 10) || 0,
            listType,
            archiveFacets,
          };
        });
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
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
      paramAdvValue = params.advValue
        .map(x => `&adv_val[]=${x.value}`)
        .join('');
    } else {
      paramAdvValue = '';
    }

    const schemeOnly = params.schemeOnly || false;
    const api = `/api/v1/public/reactions.json?page=${page}&per_page=${perPage}&adv_flag=${advFlag}${paramAdvType}${paramAdvValue}&scheme_only=${schemeOnly}`;

    return fetch(api, { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json().then(json => {
          if (!json?.reactions) throw new Error('Invalid response');
          return {
            reactions: json.reactions.map(m => new Reaction(m)),
            page: parseInt(response.headers.get('X-Page'), 10),
            pages: parseInt(response.headers.get('X-Total-Pages'), 10),
            perPage: parseInt(response.headers.get('X-Per-Page'), 10),
            totalElements: parseInt(response.headers.get('X-Total'), 10) || 0,
          };
        });
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static fetchSearchAllRaw({ selection, collectionId = 'public', perPage = 1 } = {}) {
    return fetch('/api/v1/search/all', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selection,
        collection_id: collectionId,
        page: 1,
        per_page: perPage,
        is_sync: false,
        molecule_sort: false,
        is_public: true,
      }),
    })
      .then(response => (response.ok ? response.json() : {}))
      .catch(() => ({}));
  }

  static fetchPublicCountsByType(params = {}) {
    const {
      isSearch, advFlag, advType, advValue, selection
    } = params;
    const countParams = { page: 1, perPage: 1, advFlag, advType, advValue };

    const toCount = res => (res && typeof res.totalElements === 'number' ? res.totalElements : 0);

    if (isSearch && selection) {
      return Promise.all([
        PublicFetcher.fetchSearchAllRaw({ selection, collectionId: 'public' }),
        PublicFetcher.fetchSearchAllRaw({ selection, collectionId: 'schemeOnly' }),
      ]).then(([allJson, schemeJson]) => ({
        reaction: allJson?.publicReactions?.totalElements || 0,
        sample: allJson?.publicMolecules?.totalElements || 0,
        scheme: schemeJson?.publicReactions?.totalElements || 0,
      }));
    }

    return Promise.all([
      PublicFetcher.fetchPublicReactions({ ...countParams, schemeOnly: false }).then(toCount),
      PublicFetcher.fetchPublicMolecules({ ...countParams, listType: RepoNavListTypes.SAMPLE }).then(toCount),
      PublicFetcher.fetchPublicReactions({ ...countParams, schemeOnly: true }).then(toCount),
    ]).then(([reaction, sample, scheme]) => ({ reaction, sample, scheme }));
  }

  static fetchAdvancedValues(advType, name) {
    return fetch(
      `/api/v1/public/find_adv_values.json?name=${name}&adv_type=${advType}`,
      {
        credentials: 'same-origin',
      }
    )
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
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
    const { collectionId, elementType, page, perPage, selection } = params;
    return fetch(`/api/v1/search/${elementType.toLowerCase()}`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selection,
        collection_id: collectionId || 'public',
        page: page || 1,
        per_page: perPage,
        is_sync: false,
        molecule_sort: false,
        is_public: true,
      }),
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .then(json => {
        if (!json?.publicMolecules) throw new Error('Invalid search results');
        return {
          molecules: json.publicMolecules.molecules.map(m => new Molecule(m)),
          page: json.publicMolecules.page,
          totalElements: json.publicMolecules.totalElements,
          perPage: json.publicMolecules.perPage,
          listType: params.listType,
        };
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return { molecules: [], page: 1, totalElements: 0, perPage: params.perPage, listType: params.listType };
      });
  }

  static searchPublicReactions(params = {}) {
    const { collectionId, elementType, page, perPage, selection } = params;
    return fetch(`/api/v1/search/${elementType.toLowerCase()}`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selection,
        collection_id: collectionId || 'public',
        page: page || 1,
        per_page: perPage,
        is_sync: false,
        molecule_sort: false,
        is_public: true,
      }),
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .then(json => {
        if (!json?.publicReactions) throw new Error('Invalid search results');
        return {
          reactions: json.publicReactions.reactions.map(r => new Reaction(r)),
          page: json.publicReactions.page,
          totalElements: json.publicReactions.totalElements,
          perPage: json.publicReactions.perPage,
          listType: params.listType,
        };
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return { reactions: [], page: 1, totalElements: 0, perPage: params.perPage, listType: params.listType };
      });
  }

  static fetchLastPublished() {
    const api = '/api/v1/public/last_published.json';
    return fetch(api, {
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static fetchLastPublishedSample() {
    const api = '/api/v1/public/last_published_sample.json';
    return fetch(api, {
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static fetchDataset(id) {
    const api = `/api/v1/public/dataset.json?id=${id}`;
    return fetch(api, {
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static fetchMolecule(id, advFlag = false, advType = '', advValues = null, pid = null, suffix = '') {
    const paramAdvType =
      advType && advType !== '' ? `&adv_type=${advType}` : '';

    let paramAdvValue = '';
    if (typeof advValues === 'number') {
      paramAdvValue = `&label_val=${advValues}`;
    } else if (Array.isArray(advValues)) {
      paramAdvValue = advValues.map(x => `&adv_val[]=${x.value}`).join('');
    } else {
      paramAdvValue = '';
    }

    let paramPid = '';
    if (typeof pid === 'number') {
      paramPid = `&pid=${pid}`;
    }

    let paramSuffix = '';
    if (typeof suffix === 'string') {
      paramSuffix = `&suffix=${suffix}`;
    }

    const api = `/api/v1/public/molecule.json?id=${id}&adv_flag=${advFlag}${paramAdvType}${paramAdvValue}${paramPid}${paramSuffix}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static fetchReaction(id) {
    const api = `/api/v1/public/reaction.json?id=${id}`;
    return fetch(api, { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static queryPid(params) {
    const api = `/api/v1/public/pid/`;

    return fetch(api, {
      method: 'post',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: params.id,
      }),
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        Aviator.navigate(json);
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static queryInchikey(params) {
    const api = `/api/v1/public/inchikey/`;

    return fetch(api, {
      method: 'post',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inchikey: params.inchikey,
        type: params.type,
        version: params.version,
      }),
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        Aviator.navigate(json);
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static selectPublicCollection() {
    return fetch('/api/v1/public/collection.json', {
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static publishedStatics() {
    const api = '/api/v1/public/published_statics';
    return fetch(api, {
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static topContributors(limit = 10, days = 365) {
    const api = `/api/v1/public/top_contributors?limit=${limit}&days=${days}`;
    return fetch(api, {
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .catch(errorMessage => {
        console.error(errorMessage);
        return {};
      });
  }

  static fetchAllAffiliationData() {
    const api = '/api/v1/public/affiliations/all_data';
    return fetch(api, {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .catch(errorMessage => {
        console.log('Error fetching affiliation data:', errorMessage);
        return {
          countries: [],
          organizations: {}
        };
      });
  }

  static fetchAllAffiliationData() {
    const api = '/api/v1/public/affiliations/all_data';
    return fetch(api, {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .catch(errorMessage => {
        console.log('Error fetching affiliation data:', errorMessage);
        return {
          countries: [],
          organizations: {}
        };
      });
  }

  static downloadZip(id) {
    let fileName = 'dataset.zip';
    return fetch(`/api/v1/public/download/dataset?id=${id}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
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

  // Generic method to fetch RDF data
  static getRDF(format, type, id, options = {}) {
    const api = `/api/v1/public/metadata/${format}?type=${type}&id=${id}`;
    const { responseType = 'text', errorPrefix = 'Error fetching RDF' } =
      options;

    return fetch(api, {
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return responseType === 'jsonld' ? response.json() : response.text();
      })
      .catch(errorMessage => {
        console.log(`${errorPrefix}:`, errorMessage);
        if (responseType === 'jsonld') {
          return undefined;
        }
        return `${errorPrefix}: ${errorMessage}`;
      });
  }

  // Generic download method for RDF formats
  static downloadRDF(format, type, id) {
    const api = `/api/v1/public/metadata/download_rdf?rdf_format=${format}&type=${type}&id=${id}`;
    window.open(api, '_blank');
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
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ molfile: params.data.mol }),
    })
      .then(response => {
        clearTimeout(timeoutId);
        return response.json();
      })
      .then(json => new Blob([json.molfile], { type: 'text/plain' }))
      .catch(errorMessage => {
        clearTimeout(timeoutId);
        throw new Error(errorMessage);
      });
  }

  static reviewers() {
    const promise = fetch('/intro/reviewers.json', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'cache-control': 'no-cache' },
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
    return promise;
  }

  static yearlyPublicationStats() {
    return fetch('/api/v1/public/yearly_publication_stats', {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .catch(errorMessage => {
        console.log(errorMessage);
        return {
          years: [], series: {}, totals: [], cumulative: [],
        };
      });
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

  static fetchImageAttachment(attId) {
    return fetch(`/api/v1/public/download/attachment?id=${attId}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => ({
        type: blob.type,
        data: URL.createObjectURL(blob),
      }))
      .catch((error) => {
        console.error('Failed to fetch public image attachment:', error);
      });
  }

  // Use in REPO
  static fetchOls(name, edited = true) {
    return fetch(
      `/api/v1/public/ols_terms/list.json?name=${name}&edited=${edited}`,
      {
        credentials: 'same-origin',
      }
    )
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

}
