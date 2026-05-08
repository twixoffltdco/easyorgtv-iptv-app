/**
 * In-memory database for storing channels
 */

let channels = [];
let lastScan = null;
let scanStatus = 'idle';

/**
 * Add channels to the database
 * @param {Array} newChannels - Array of channel objects
 */
function addChannels(newChannels) {
  const existingUrls = new Set(channels.map(c => c.url));
  
  newChannels.forEach(channel => {
    if (!existingUrls.has(channel.url)) {
      channels.push(channel);
      existingUrls.add(channel.url);
    }
  });
  
  lastScan = new Date().toISOString();
}

/**
 * Clear all channels
 */
function clearChannels() {
  channels = [];
}

/**
 * Get channels with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Object} Paginated channel data
 */
function getChannels(options = {}) {
  const { page = 1, limit = 50, category, country, language } = options;
  
  let filtered = [...channels];

  // Apply filters
  if (category) {
    filtered = filtered.filter(c => 
      c.category && c.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  if (country) {
    filtered = filtered.filter(c => 
      c.country && c.country.toLowerCase() === country.toLowerCase()
    );
  }
  
  if (language) {
    filtered = filtered.filter(c => 
      c.language && c.language.toLowerCase() === language.toLowerCase()
    );
  }

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = filtered.slice(startIndex, endIndex);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * Search channels by query
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Object} Search results
 */
function searchChannels(query, filters = {}) {
  const { category, country, language } = filters;
  const searchTerms = query.toLowerCase().split(/\s+/);
  
  let results = channels.filter(channel => {
    const searchText = `${channel.name} ${channel.category || ''} ${channel.country || ''} ${channel.language || ''}`.toLowerCase();
    return searchTerms.every(term => searchText.includes(term));
  });

  // Apply additional filters
  if (category) {
    results = results.filter(c => 
      c.category && c.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  if (country) {
    results = results.filter(c => 
      c.country && c.country.toLowerCase() === country.toLowerCase()
    );
  }
  
  if (language) {
    results = results.filter(c => 
      c.language && c.language.toLowerCase() === language.toLowerCase()
    );
  }

  return {
    data: results,
    total: results.length,
    query
  };
}

/**
 * Get all unique categories
 * @returns {Array} Array of categories with counts
 */
function getCategories() {
  const categoryMap = {};
  
  channels.forEach(channel => {
    const cat = channel.category || 'Uncategorized';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  return Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get all unique countries
 * @returns {Array} Array of countries with counts
 */
function getCountries() {
  const countryMap = {};
  
  channels.forEach(channel => {
    if (channel.country) {
      countryMap[channel.country] = (countryMap[channel.country] || 0) + 1;
    }
  });

  return Object.entries(countryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get database statistics
 * @returns {Object} Statistics
 */
function getStats() {
  const categories = getCategories();
  const countries = getCountries();
  
  return {
    totalChannels: channels.length,
    totalCategories: categories.length,
    totalCountries: countries.length,
    lastScan,
    scanStatus,
    topCategories: categories.slice(0, 10),
    topCountries: countries.slice(0, 10)
  };
}

/**
 * Set scan status
 * @param {string} status - Scan status
 */
function setScanStatus(status) {
  scanStatus = status;
}

/**
 * Get scan status
 * @returns {string} Current scan status
 */
function getScanStatus() {
  return scanStatus;
}

module.exports = {
  addChannels,
  clearChannels,
  getChannels,
  searchChannels,
  getCategories,
  getCountries,
  getStats,
  setScanStatus,
  getScanStatus
};
