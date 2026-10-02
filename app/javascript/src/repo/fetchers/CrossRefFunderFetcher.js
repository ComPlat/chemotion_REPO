import 'whatwg-fetch';

// Cache for storing API responses to follow CrossRef best practices
const funderCache = {
  cache: new Map(),
  cacheTimeout: 10 * 60 * 1000, // 10 minutes cache timeout

  getKey(query, offset, rows) {
    return `${query.toLowerCase()}-${offset}-${rows}`;
  },

  get(query, offset, rows) {
    const key = this.getKey(query, offset, rows);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Clean up expired cache entries
    this.cleanExpired();
    return null;
  },

  set(query, offset, rows, data) {
    const key = this.getKey(query, offset, rows);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  cleanExpired() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    entries.forEach(([key, value]) => {
      if (now - value.timestamp >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    });
  },

  clear() {
    this.cache.clear();
  },
};

export default class CrossRefFunderFetcher {
  /**
   * Search for funders using the CrossRef API
   * @param {string} query - The search query (minimum 3 characters)
   * @param {number} offset - The offset for pagination (default: 0)
   * @param {number} rows - Number of results per page (default: 20)
   * @returns {Promise<Object>} Promise resolving to search results
   */
  static async searchFunders(query, offset = 0, rows = 20) {
    if (!query || query.length < 3) {
      throw new Error('Query must be at least 3 characters long');
    }

    // Check cache first
    const cachedResult = funderCache.get(query, offset, rows);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      // Encode the query parameter properly
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.crossref.org/funders?query=${encodedQuery}&offset=${offset}&rows=${rows}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'ChemotionRepository (mailto:chemotion-repository@lists.kit.edu)', // Polite user agent as recommended
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      // Transform the data to match our component's expected format
      const result = this.transformCrossRefResponse(data);

      // Cache the result
      funderCache.set(query, offset, rows, result);

      return result;
    } catch (error) {
      console.error('Error fetching from CrossRef API:', error);
      throw new Error(`Failed to fetch funders: ${error.message}`);
    }
  }

  /**
   * Transform CrossRef API response to our expected format
   * @param {Object} crossrefData - Raw response from CrossRef API
   * @returns {Object} Transformed data
   */
  static transformCrossRefResponse(crossrefData) {
    const { message } = crossrefData;

    if (!message) {
      return {
        items: [],
        totalResults: 0,
        currentPage: 0,
        itemsPerPage: 20,
      };
    }

    const items = (message.items || []).map(funder => ({
      id: funder.id || '',
      name: funder.name || '',
      location: funder.location || '',
      uri: funder.uri || '',
      altNames: funder['alt-names'] || [],
    }));

    return {
      items,
      totalResults: message['total-results'] || 0,
      currentPage: Math.floor(
        (message.query?.['start-index'] || 0) /
          (message['items-per-page'] || 20)
      ),
      itemsPerPage: message['items-per-page'] || 20,
      query: message.query,
    };
  }

  /**
   * Clear the cache (useful for testing or manual cache refresh)
   */
  static clearCache() {
    funderCache.clear();
  }

  /**
   * Get a specific funder by ID
   * @param {string} funderId - The funder ID
   * @returns {Promise<Object>} Promise resolving to funder details
   */
  static async getFunderById(funderId) {
    if (!funderId) {
      throw new Error('Funder ID is required');
    }

    try {
      const encodedId = encodeURIComponent(funderId);
      const url = `https://api.crossref.org/funders/${encodedId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ChemotionELN (mailto:support@chemotion.net)',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.message) {
        throw new Error('Invalid response format');
      }

      const funder = data.message;
      return {
        id: funder.id || '',
        name: funder.name || '',
        location: funder.location || '',
        uri: funder.uri || '',
        altNames: funder['alt-names'] || [],
      };
    } catch (error) {
      console.error('Error fetching funder by ID:', error);
      throw new Error(`Failed to fetch funder: ${error.message}`);
    }
  }

  /**
   * Store CrossRef funder information for an element
   * @param {string} elementType - Type of element (Sample, Reaction, Container, ResearchPlan)
   * @param {number} elementId - ID of the element
   * @param {Object} funderData - Funder data
   * @returns {Promise<Object>} Promise resolving to stored tag data
   */
  static async storeFunderForElement(elementType, elementId, funderData) {
    if (!elementType || !elementId) {
      throw new Error('Element type and ID are required');
    }

    if (!funderData || typeof funderData !== 'object') {
      throw new Error('Funder data is required and must be an object');
    }

    if (!funderData.name || !funderData.name.trim()) {
      throw new Error('Funder name is required in funder data');
    }

    try {
      const requestBody = {
        element_type: elementType,
        element_id: elementId,
        funder_data: {
          fundingType: funderData.fundingType,
          name: funderData.name,
          uri: funderData.uri,
          awardUri: funderData.awardUri || '',
          awardTitle: funderData.awardTitle || '',
          awardNumber: funderData.awardNumber || '',
        },
      };

      const response = await fetch('/api/v1/crossref/add_funder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error storing funder data:', error);
      throw new Error(`Failed to store funder data: ${error.message}`);
    }
  }

  /**
   * Get stored funding records for an element
   * @param {string} elementType - Type of element (Sample, Reaction, Container, ResearchPlan)
   * @param {number} elementId - ID of the element
   * @returns {Promise<Array>} Promise resolving to array of FundingEntity objects
   */
  static async getFunderForElement(elementType, elementId, aggregate = false) {
    if (!elementType || !elementId) {
      throw new Error('Element type and ID are required');
    }

    try {
      const url = `/api/v1/public/get_funder?element_type=${encodeURIComponent(
        elementType
      )}&element_id=${encodeURIComponent(elementId)}&aggregate=${aggregate}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      // Return array of funding entities (or empty array if no data)
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error getting funder data:', error);
      throw new Error(`Failed to get funder data: ${error.message}`);
    }
  }

  /**
   * Remove stored CrossRef funding record by ID
   * @param {number} fundingId - ID of the funding record to remove
   * @returns {Promise<Object>} Promise resolving to removal result
   */
  static async removeFunderForElement(fundingId) {
    if (!fundingId || typeof fundingId !== 'number') {
      throw new Error('Funding ID is required and must be a number');
    }

    try {
      const requestBody = {
        funding_id: fundingId,
      };

      const response = await fetch('/api/v1/crossref/remove_funder', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing funder data:', error);
      throw new Error(`Failed to remove funder data: ${error.message}`);
    }
  }
}
