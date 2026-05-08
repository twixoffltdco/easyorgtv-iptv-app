/**
 * M3U/M3U8 Playlist Parser
 * Parses IPTV playlists and extracts channel information
 */

/**
 * Parse M3U content and extract channels
 * @param {string} content - Raw M3U content
 * @param {string} sourceUrl - Source URL for reference
 * @returns {Array} Array of channel objects
 */
function parseM3U(content, sourceUrl = '') {
  const channels = [];
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  if (!lines[0] || !lines[0].startsWith('#EXTM3U')) {
    return channels;
  }

  let currentChannel = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXTINF:')) {
      currentChannel = parseExtInf(line);
      currentChannel.source = sourceUrl;
    } else if (line.startsWith('#EXTVLCOPT:')) {
      // Handle VLC options (user-agent, referrer, etc.)
      if (currentChannel) {
        const option = parseVlcOption(line);
        if (option) {
          currentChannel.options = currentChannel.options || {};
          currentChannel.options[option.key] = option.value;
        }
      }
    } else if (line.startsWith('#')) {
      // Skip other comments/directives
      continue;
    } else if (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp')) {
      // This is a stream URL
      if (currentChannel) {
        currentChannel.url = line;
        currentChannel.id = generateChannelId(currentChannel.name, line);
        channels.push(currentChannel);
        currentChannel = null;
      }
    }
  }

  return channels;
}

/**
 * Parse #EXTINF line and extract metadata
 * @param {string} line - EXTINF line
 * @returns {Object} Channel metadata
 */
function parseExtInf(line) {
  const channel = {
    name: 'Unknown Channel',
    duration: -1,
    logo: null,
    category: null,
    country: null,
    language: null,
    tvgId: null,
    tvgName: null
  };

  // Extract duration
  const durationMatch = line.match(/#EXTINF:(-?\d+)/);
  if (durationMatch) {
    channel.duration = parseInt(durationMatch[1]);
  }

  // Extract attributes
  const attributes = extractAttributes(line);
  
  if (attributes['tvg-logo']) channel.logo = attributes['tvg-logo'];
  if (attributes['tvg-id']) channel.tvgId = attributes['tvg-id'];
  if (attributes['tvg-name']) channel.tvgName = attributes['tvg-name'];
  if (attributes['tvg-country']) channel.country = attributes['tvg-country'];
  if (attributes['tvg-language']) channel.language = attributes['tvg-language'];
  if (attributes['group-title']) channel.category = attributes['group-title'];

  // Extract channel name (after the last comma)
  const nameMatch = line.match(/,([^,]+)$/);
  if (nameMatch) {
    channel.name = nameMatch[1].trim();
  }

  // Use tvg-name as fallback for name
  if (channel.name === 'Unknown Channel' && channel.tvgName) {
    channel.name = channel.tvgName;
  }

  return channel;
}

/**
 * Extract key="value" attributes from a line
 * @param {string} line - Line containing attributes
 * @returns {Object} Extracted attributes
 */
function extractAttributes(line) {
  const attributes = {};
  const regex = /([a-zA-Z-]+)="([^"]*)"/g;
  let match;

  while ((match = regex.exec(line)) !== null) {
    attributes[match[1].toLowerCase()] = match[2];
  }

  return attributes;
}

/**
 * Parse VLC option line
 * @param {string} line - EXTVLCOPT line
 * @returns {Object|null} Option key-value pair
 */
function parseVlcOption(line) {
  const match = line.match(/#EXTVLCOPT:([^=]+)=(.+)/);
  if (match) {
    return {
      key: match[1].trim(),
      value: match[2].trim()
    };
  }
  return null;
}

/**
 * Generate unique channel ID
 * @param {string} name - Channel name
 * @param {string} url - Stream URL
 * @returns {string} Unique ID
 */
function generateChannelId(name, url) {
  const base = `${name}-${url}`.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
  const hash = simpleHash(url);
  return `${base}-${hash}`;
}

/**
 * Simple hash function for generating unique IDs
 * @param {string} str - Input string
 * @returns {string} Hash string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Validate if a URL looks like a valid stream
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid stream URL
 */
function isValidStreamUrl(url) {
  if (!url) return false;
  
  const validProtocols = ['http://', 'https://', 'rtmp://', 'rtsp://'];
  const hasValidProtocol = validProtocols.some(p => url.startsWith(p));
  
  if (!hasValidProtocol) return false;

  // Check for common stream extensions
  const streamExtensions = ['.m3u8', '.ts', '.mp4', '.flv', '.mkv', '.avi'];
  const hasStreamExtension = streamExtensions.some(ext => url.includes(ext));
  
  // Also allow URLs without extensions (many streams don't have them)
  return hasStreamExtension || url.includes('/live/') || url.includes('/stream/') || url.includes('/iptv/');
}

/**
 * Normalize category name
 * @param {string} category - Raw category
 * @returns {string} Normalized category
 */
function normalizeCategory(category) {
  if (!category) return 'Uncategorized';
  
  const categoryMap = {
    'news': 'News',
    'sport': 'Sports',
    'sports': 'Sports',
    'movie': 'Movies',
    'movies': 'Movies',
    'film': 'Movies',
    'films': 'Movies',
    'music': 'Music',
    'kids': 'Kids',
    'children': 'Kids',
    'documentary': 'Documentary',
    'entertainment': 'Entertainment',
    'general': 'General',
    'education': 'Education',
    'religious': 'Religious',
    'religion': 'Religious',
    'comedy': 'Comedy',
    'drama': 'Drama',
    'series': 'Series',
    'animation': 'Animation',
    'nature': 'Nature',
    'science': 'Science',
    'technology': 'Technology',
    'travel': 'Travel',
    'food': 'Food',
    'lifestyle': 'Lifestyle',
    'business': 'Business',
    'weather': 'Weather',
    'xxx': 'Adult',
    'adult': 'Adult'
  };

  const normalized = category.toLowerCase().trim();
  return categoryMap[normalized] || category;
}

module.exports = {
  parseM3U,
  parseExtInf,
  extractAttributes,
  isValidStreamUrl,
  normalizeCategory,
  generateChannelId
};
