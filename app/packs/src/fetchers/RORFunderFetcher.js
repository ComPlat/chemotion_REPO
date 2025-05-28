import 'whatwg-fetch';

// Cache for storing API responses to follow ROR best practices
const rorCache = {
  cache: new Map(),
  cacheTimeout: 10 * 60 * 1000, // 10 minutes cache timeout

  getKey(query, page) {
    return `${query.toLowerCase()}-${page}`;
  },

  get(query, page) {
    const key = this.getKey(query, page);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Clean up expired cache entries
    this.cleanExpired();
    return null;
  },

  set(query, page, data) {
    const key = this.getKey(query, page);
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

export default class RORFunderFetcher {
  /**
   * Search for organizations using the ROR API
   * @param {string} query - The search query (minimum 3 characters)
   * @param {number} page - The page number for pagination (default: 1)
   * @returns {Promise<Object>} Promise resolving to search results
   */
  static async searchOrganizations(query, page = 1) {
    if (!query || query.length < 3) {
      throw new Error('Query must be at least 3 characters long');
    }

    // Check cache first
    const cachedResult = rorCache.get(query, page);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      // Encode the query parameter properly
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.ror.org/organizations?query=${encodedQuery}&page=${page}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'ChemotionRepository (mailto:chemotion-repository@lists.kit.edu)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform the data to match our component's expected format
      const result = this.transformRORResponse(data);

      // Cache the result
      rorCache.set(query, page, result);

      return result;
    } catch (error) {
      console.error('Error fetching from ROR API:', error);
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }
  }

  /**
   * Transform ROR API response to our expected format
   * @param {Object} rorData - Raw response from ROR API
   * @returns {Object} Transformed data
   */
  static transformRORResponse(rorData) {
    if (!rorData) {
      return {
        items: [],
        totalResults: 0,
        currentPage: 1,
        itemsPerPage: 20,
      };
    }

    const items = (rorData.items || []).map(org => ({
      id: org.id || '',
      name: org.name || '',
      location: this.formatLocation(org),
      uri: org.id || '', // ROR ID serves as URI
      types: org.types || [],
      country: org.country?.country_name || '',
      established: org.established || null,
    }));

    return {
      items,
      totalResults: rorData.number_of_results || 0,
      currentPage: rorData.meta?.page || 1,
      itemsPerPage: rorData.meta?.per_page || 20,
      totalPages: rorData.meta?.pages || 1,
    };
  }

  /**
   * Format location information from ROR data
   * @param {Object} org - Organization data from ROR
   * @returns {string} Formatted location string
   */
  static formatLocation(org) {
    const parts = [];

    if (org.addresses && org.addresses.length > 0) {
      const address = org.addresses[0];
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
    }

    if (org.country?.country_name) {
      parts.push(org.country.country_name);
    }

    return parts.join(', ');
  }

  /**
   * Get a specific organization by ROR ID
   * @param {string} rorId - The ROR ID
   * @returns {Promise<Object>} Promise resolving to organization details
   */
  static async getOrganizationById(rorId) {
    if (!rorId) {
      throw new Error('ROR ID is required');
    }

    try {
      // Extract ROR ID from full URL if needed
      const cleanId = rorId.replace('https://ror.org/', '');
      const url = `https://api.ror.org/organizations/${cleanId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'ChemotionRepository (mailto:chemotion-repository@lists.kit.edu)',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Organization not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const org = await response.json();

      return {
        id: org.id || '',
        name: org.name || '',
        location: this.formatLocation(org),
        uri: org.id || '',
        types: org.types || [],
        country: org.country?.country_name || '',
        established: org.established || null,
      };
    } catch (error) {
      console.error('Error fetching organization by ID:', error);
      throw new Error(`Failed to fetch organization: ${error.message}`);
    }
  }

  /**
   * Clear the cache (useful for testing or manual cache refresh)
   */
  static clearCache() {
    rorCache.clear();
  }
}
