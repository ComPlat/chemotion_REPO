import 'whatwg-fetch';
import { camelizeKeys } from 'humps';

const buildArrayParam = (key, values) =>
  (values || [])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map((v) => `${encodeURIComponent(key)}[]=${encodeURIComponent(v)}`)
    .join('&');

const buildScalarParam = (key, value) => {
  if (value === null || value === undefined || value === '') return '';
  return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

const buildQuery = (filters = {}) => {
  const parts = [
    buildArrayParam('years', filters.years),
    buildArrayParam('authors', filters.authors),
    buildArrayParam('contributors', filters.contributors),
    buildArrayParam('institutions', filters.institutions),
    buildArrayParam('element_types', filters.elementTypes),
    buildArrayParam('ontologies', filters.ontologies),
    buildArrayParam('reaction_types', filters.reactionTypes),
    buildArrayParam('embargoes', filters.embargoes),
    filters.schemeOnly === undefined || filters.schemeOnly === null
      ? ''
      : buildScalarParam('scheme_only', filters.schemeOnly ? 'true' : 'false'),
    buildScalarParam('q', filters.q),
    buildScalarParam('structure_query', filters.structureQuery),
    buildScalarParam('structure_match', filters.structureMatch),
    buildScalarParam('tanimoto', filters.tanimoto),
  ];
  return parts.filter(Boolean).join('&');
};

const handleJson = (response) => {
  if (!response.ok) throw new Error(response.statusText);
  return response.json().then(camelizeKeys);
};

export default class RepoSearchFetcher {
  static fetchFacets(filters = {}) {
    const qs = buildQuery(filters);
    const url = `/api/v1/repo_search/facets${qs ? `?${qs}` : ''}`;
    return fetch(url, { credentials: 'same-origin' }).then(handleJson);
  }

  static fetchFacetValues(facet, query = '', limit = 10) {
    const params = [
      `facet=${encodeURIComponent(facet)}`,
      query ? `q=${encodeURIComponent(query)}` : '',
      `limit=${limit}`,
    ]
      .filter(Boolean)
      .join('&');
    const url = `/api/v1/repo_search/facet_values?${params}`;
    return fetch(url, { credentials: 'same-origin' }).then(handleJson);
  }

  static fetchResults(filters = {}, page = 1, perPage = 20, sort = 'recent') {
    const base = buildQuery(filters);
    const paging = [
      buildScalarParam('page', page),
      buildScalarParam('per_page', perPage),
      buildScalarParam('sort', sort),
    ]
      .filter(Boolean)
      .join('&');
    const qs = [base, paging].filter(Boolean).join('&');
    const url = `/api/v1/repo_search/results${qs ? `?${qs}` : ''}`;
    return fetch(url, { credentials: 'same-origin' }).then(handleJson);
  }
}
