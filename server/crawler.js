/**
 * IPTV Channel Crawler
 * Searches the internet for public M3U/M3U8 playlists
 */

const fetch = require('node-fetch');
const { parseM3U, isValidStreamUrl, normalizeCategory } = require('./parser');
const { addChannels, setScanStatus } = require('./database');

// Demo/Sample channels for initial population
// These are public domain/free streaming sources
const DEMO_CHANNELS = [
  {
    id: 'nasa-tv-public',
    name: 'NASA TV Public',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/200px-NASA_logo.svg.png',
    category: 'Science',
    country: 'US',
    language: 'English'
  },
  {
    id: 'nasa-tv-media',
    name: 'NASA TV Media',
    url: 'https://ntv2.akamaized.net/hls/live/2013923/NASA-NTV2-HLS/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/200px-NASA_logo.svg.png',
    category: 'Science',
    country: 'US',
    language: 'English'
  },
  {
    id: 'bloomberg-tv',
    name: 'Bloomberg TV',
    url: 'https://www.bloomberg.com/media-manifest/streams/us.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Bloomberg_logo.svg',
    category: 'Business',
    country: 'US',
    language: 'English'
  },
  {
    id: 'france24-english',
    name: 'France 24 English',
    url: 'https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/France_24_logo_%282018%29.svg/200px-France_24_logo_%282018%29.svg.png',
    category: 'News',
    country: 'FR',
    language: 'English'
  },
  {
    id: 'france24-french',
    name: 'France 24 Francais',
    url: 'https://static.france24.com/live/F24_FR_LO_HLS/live_web.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/France_24_logo_%282018%29.svg/200px-France_24_logo_%282018%29.svg.png',
    category: 'News',
    country: 'FR',
    language: 'French'
  },
  {
    id: 'dw-english',
    name: 'DW News English',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Deutsche_Welle_Logo.svg/200px-Deutsche_Welle_Logo.svg.png',
    category: 'News',
    country: 'DE',
    language: 'English'
  },
  {
    id: 'dw-german',
    name: 'DW Deutsch',
    url: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Deutsche_Welle_Logo.svg/200px-Deutsche_Welle_Logo.svg.png',
    category: 'News',
    country: 'DE',
    language: 'German'
  },
  {
    id: 'al-jazeera-english',
    name: 'Al Jazeera English',
    url: 'https://live-hls-web-aje.getaj.net/AJE/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Al_Jazeera_English.svg/200px-Al_Jazeera_English.svg.png',
    category: 'News',
    country: 'QA',
    language: 'English'
  },
  {
    id: 'cgtn-english',
    name: 'CGTN',
    url: 'https://news.cgtn.com/resource/live/english/cgtn-news.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/CGTN_Logo.svg/200px-CGTN_Logo.svg.png',
    category: 'News',
    country: 'CN',
    language: 'English'
  },
  {
    id: 'rt-news',
    name: 'RT News',
    url: 'https://rt-news.secure.footprint.net/1103.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/RT_logo.svg/200px-RT_logo.svg.png',
    category: 'News',
    country: 'RU',
    language: 'English'
  },
  {
    id: 'nhk-world',
    name: 'NHK World Japan',
    url: 'https://nhkworld.webcdn.stream.ne.jp/www11/nhkworld-tv/domestic/263942/live.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/NHK_logo.svg/200px-NHK_logo.svg.png',
    category: 'General',
    country: 'JP',
    language: 'English'
  },
  {
    id: 'euronews-english',
    name: 'Euronews English',
    url: 'https://euronews-euronews-english-1-eu.rakuten.wurl.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Euronews_2022.svg/200px-Euronews_2022.svg.png',
    category: 'News',
    country: 'FR',
    language: 'English'
  },
  {
    id: 'cbc-news',
    name: 'CBC News Network',
    url: 'https://cbcnewshd-f.akamaihd.net/i/cbcnews_1@8981/index_2500_av-p.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/CBC_News_Logo.svg/200px-CBC_News_Logo.svg.png',
    category: 'News',
    country: 'CA',
    language: 'English'
  },
  {
    id: 'abc-news-au',
    name: 'ABC News Australia',
    url: 'https://abc-iview-mediapackagestreams-2.akamaized.net/out/v1/6e1cc6d25ec0480ea099a5399d73bc4b/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/ABC_Australia_logo.svg/200px-ABC_Australia_logo.svg.png',
    category: 'News',
    country: 'AU',
    language: 'English'
  },
  {
    id: 'arirang-tv',
    name: 'Arirang TV',
    url: 'https://amdlive-ch01-ctnd-com.akamaized.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Arirang_TV_logo.svg/200px-Arirang_TV_logo.svg.png',
    category: 'General',
    country: 'KR',
    language: 'English'
  },
  {
    id: 'trt-world',
    name: 'TRT World',
    url: 'https://tv-trtworld.medya.trt.com.tr/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/TRT_World_logo.svg/200px-TRT_World_logo.svg.png',
    category: 'News',
    country: 'TR',
    language: 'English'
  },
  {
    id: 'cna-singapore',
    name: 'CNA Singapore',
    url: 'https://live1.mediadesk.sg/hls/channelnewsasia/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/CNA_%282020%29.svg/200px-CNA_%282020%29.svg.png',
    category: 'News',
    country: 'SG',
    language: 'English'
  },
  {
    id: 'sky-news',
    name: 'Sky News',
    url: 'https://skynews2-plutolive.amagi.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sky_News_2021.svg/200px-Sky_News_2021.svg.png',
    category: 'News',
    country: 'GB',
    language: 'English'
  },
  {
    id: 'lofi-girl',
    name: 'Lofi Girl Radio',
    url: 'https://usa-sanitarium.streamservers.io:8080/radio.mp3',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Lofi_Girl_logo.svg/200px-Lofi_Girl_logo.svg.png',
    category: 'Music',
    country: 'INT',
    language: 'None'
  },
  {
    id: 'classic-arts',
    name: 'Classic Arts Showcase',
    url: 'https://classicarts.akamaized.net/hls/live/1024257/CAS/master.m3u8',
    logo: null,
    category: 'Entertainment',
    country: 'US',
    language: 'English'
  }
];

// Public M3U playlist sources to crawl
// Note: These are hypothetical endpoints - real crawler would need actual sources
const CRAWL_SOURCES = [];

/**
 * Fetch and parse a single M3U playlist
 * @param {string} url - Playlist URL
 * @returns {Promise<Array>} Array of channels
 */
async function fetchPlaylist(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Easyorgtv/1.0'
      }
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    return parseM3U(content, url);
  } catch (error) {
    console.error(`Failed to fetch playlist ${url}:`, error.message);
    return [];
  }
}

/**
 * Check if a stream URL is accessible
 * @param {string} url - Stream URL
 * @returns {Promise<boolean>} Is accessible
 */
async function checkStreamAvailability(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Easyorgtv/1.0'
      }
    });
    
    clearTimeout(timeout);
    return response.ok || response.status === 302 || response.status === 301;
  } catch {
    return false;
  }
}

/**
 * Crawl all configured sources for channels
 * @returns {Promise<void>}
 */
async function crawlChannels() {
  console.log('Starting channel crawl...');
  setScanStatus('running');

  try {
    // First, add demo channels
    console.log('Adding demo channels...');
    addChannels(DEMO_CHANNELS);

    // Then crawl configured sources
    for (const source of CRAWL_SOURCES) {
      console.log(`Crawling: ${source}`);
      const channels = await fetchPlaylist(source);
      
      // Normalize categories
      channels.forEach(channel => {
        if (channel.category) {
          channel.category = normalizeCategory(channel.category);
        }
      });

      if (channels.length > 0) {
        console.log(`Found ${channels.length} channels from ${source}`);
        addChannels(channels);
      }
    }

    setScanStatus('completed');
    console.log('Channel crawl completed');
  } catch (error) {
    console.error('Crawl error:', error);
    setScanStatus('error');
  }
}

/**
 * Start the crawler with periodic updates
 */
function startCrawler() {
  // Initial crawl
  crawlChannels();

  // Schedule periodic updates (every 6 hours)
  setInterval(() => {
    crawlChannels();
  }, 6 * 60 * 60 * 1000);
}

/**
 * Add a custom playlist source
 * @param {string} url - Playlist URL
 */
function addSource(url) {
  if (!CRAWL_SOURCES.includes(url)) {
    CRAWL_SOURCES.push(url);
  }
}

/**
 * Remove a playlist source
 * @param {string} url - Playlist URL
 */
function removeSource(url) {
  const index = CRAWL_SOURCES.indexOf(url);
  if (index > -1) {
    CRAWL_SOURCES.splice(index, 1);
  }
}

/**
 * Get all configured sources
 * @returns {Array} Array of source URLs
 */
function getSources() {
  return [...CRAWL_SOURCES];
}

module.exports = {
  crawlChannels,
  startCrawler,
  fetchPlaylist,
  checkStreamAvailability,
  addSource,
  removeSource,
  getSources
};
