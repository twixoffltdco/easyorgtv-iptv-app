const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { getChannels, searchChannels, getStats, getCategories, getCountries, addChannels } = require('./database');
const { startCrawler, crawlChannels, addSource, removeSource, getSources, getCrawlerStatus, forceScan, fetchPlaylist } = require('./crawler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// Stream Proxy - CORS bypass for video streams
// ============================================

// Proxy for M3U8 playlists (rewrites URLs to use proxy)
app.get('/api/proxy/m3u8', async (req, res) => {
  const streamUrl = req.query.url;
  
  if (!streamUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const parsedUrl = new URL(streamUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const proxyReq = protocol.get(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': parsedUrl.origin,
        'Origin': parsedUrl.origin
      },
      timeout: 15000
    }, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        return res.status(proxyRes.statusCode).json({ error: 'Failed to fetch stream' });
      }

      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        // Rewrite relative URLs in m3u8 to absolute proxied URLs
        const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
        
        const rewritten = data.split('\n').map(line => {
          line = line.trim();
          if (line.startsWith('#') || line === '') {
            // Handle URI= in EXT-X-KEY
            if (line.includes('URI="')) {
              return line.replace(/URI="([^"]+)"/g, (match, uri) => {
                const absoluteUri = uri.startsWith('http') ? uri : baseUrl + uri;
                return `URI="/api/proxy/stream?url=${encodeURIComponent(absoluteUri)}"`;
              });
            }
            return line;
          }
          // Convert relative URLs to absolute proxied URLs
          const absoluteUrl = line.startsWith('http') ? line : baseUrl + line;
          if (line.endsWith('.m3u8') || line.includes('.m3u8?')) {
            return `/api/proxy/m3u8?url=${encodeURIComponent(absoluteUrl)}`;
          }
          return `/api/proxy/stream?url=${encodeURIComponent(absoluteUrl)}`;
        }).join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(rewritten);
      });
    });

    proxyReq.on('error', (err) => {
      console.error('M3U8 proxy error:', err.message);
      res.status(500).json({ error: 'Stream proxy error', message: err.message });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Stream timeout' });
    });

  } catch (error) {
    console.error('M3U8 proxy error:', error.message);
    res.status(500).json({ error: 'Invalid URL or proxy error' });
  }
});

// Proxy for TS segments and other media files
app.get('/api/proxy/stream', async (req, res) => {
  const streamUrl = req.query.url;
  
  if (!streamUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const parsedUrl = new URL(streamUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': parsedUrl.origin,
      'Origin': parsedUrl.origin
    };

    // Forward range header for seeking support
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const proxyReq = protocol.get(streamUrl, { headers, timeout: 30000 }, (proxyRes) => {
      // Forward response headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      
      if (proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', proxyRes.headers['content-type']);
      }
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      if (proxyRes.headers['content-range']) {
        res.setHeader('Content-Range', proxyRes.headers['content-range']);
      }
      if (proxyRes.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
      }

      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Stream proxy error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream proxy error' });
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Stream timeout' });
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      proxyReq.destroy();
    });

  } catch (error) {
    console.error('Stream proxy error:', error.message);
    res.status(500).json({ error: 'Invalid URL or proxy error' });
  }
});

// Check if stream is available
app.get('/api/check-stream', async (req, res) => {
  const streamUrl = req.query.url;
  
  if (!streamUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const parsedUrl = new URL(streamUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const checkReq = protocol.get(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Range': 'bytes=0-1024'
      },
      timeout: 10000
    }, (checkRes) => {
      const isOk = checkRes.statusCode >= 200 && checkRes.statusCode < 400;
      checkRes.destroy();
      res.json({ 
        available: isOk, 
        statusCode: checkRes.statusCode,
        contentType: checkRes.headers['content-type']
      });
    });

    checkReq.on('error', () => {
      res.json({ available: false, error: 'Connection failed' });
    });

    checkReq.on('timeout', () => {
      checkReq.destroy();
      res.json({ available: false, error: 'Timeout' });
    });

  } catch (error) {
    res.json({ available: false, error: error.message });
  }
});

// ============================================
// API Routes - Channels
// ============================================

// Get all channels with pagination
app.get('/api/channels', (req, res) => {
  const { page = 1, limit = 50, category, country, language } = req.query;
  const channels = getChannels({
    page: parseInt(page),
    limit: parseInt(limit),
    category,
    country,
    language
  });
  res.json(channels);
});

// Search channels
app.get('/api/channels/search', (req, res) => {
  const { q, category, country, language } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  const results = searchChannels(q, { category, country, language });
  res.json(results);
});

// Get channel by ID
app.get('/api/channels/:id', (req, res) => {
  const channels = getChannels({ page: 1, limit: 100000 });
  const channel = channels.data.find(c => c.id === req.params.id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  res.json(channel);
});

// Get channels by category
app.get('/api/category/:category', (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const channels = getChannels({
    page: parseInt(page),
    limit: parseInt(limit),
    category: req.params.category
  });
  res.json(channels);
});

// Get channels by country
app.get('/api/country/:country', (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const channels = getChannels({
    page: parseInt(page),
    limit: parseInt(limit),
    country: req.params.country
  });
  res.json(channels);
});

// Get all categories
app.get('/api/categories', (req, res) => {
  const categories = getCategories();
  res.json(categories);
});

// Get all countries
app.get('/api/countries', (req, res) => {
  const countries = getCountries();
  res.json(countries);
});

// ============================================
// API Routes - Crawler Management
// ============================================

// Get crawler status
app.get('/api/crawler/status', (req, res) => {
  const status = getCrawlerStatus();
  const sources = getSources();
  res.json({ ...status, sources });
});

// Get all sources info
app.get('/api/sources', (req, res) => {
  const sources = getSources();
  res.json(sources);
});

// Add custom source
app.post('/api/sources', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  // Check if it's an M3U file
  if (!url.match(/\.m3u8?$/i) && !url.includes('m3u')) {
    return res.status(400).json({ error: 'URL must point to an M3U/M3U8 playlist file' });
  }
  
  const added = addSource(url);
  if (added) {
    // Try to fetch channels from the new source immediately
    const channels = await fetchPlaylist(url);
    if (channels.length > 0) {
      addChannels(channels);
    }
    res.json({ 
      success: true, 
      message: `Source added successfully. Found ${channels.length} channels.`,
      channelsFound: channels.length 
    });
  } else {
    res.json({ success: false, message: 'Source already exists' });
  }
});

// Remove custom source
app.delete('/api/sources', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const removed = removeSource(url);
  res.json({ success: removed, message: removed ? 'Source removed' : 'Source not found' });
});

// Manual scan trigger
app.post('/api/scan', async (req, res) => {
  const status = getCrawlerStatus();
  
  if (status.isScanning) {
    return res.json({ 
      success: false, 
      message: 'Scan already in progress',
      status: 'running' 
    });
  }
  
  res.json({ 
    success: true, 
    message: 'Scan started', 
    status: 'running' 
  });
  
  // Start scan asynchronously
  forceScan().catch(console.error);
});

// ============================================
// API Routes - Export
// ============================================

// Export playlist in M3U format
app.get('/api/playlist', (req, res) => {
  const { category, country, language, format = 'm3u' } = req.query;
  const channels = getChannels({
    page: 1,
    limit: 100000,
    category,
    country,
    language
  });

  if (format === 'json') {
    return res.json(channels.data);
  }

  let m3u = '#EXTM3U\n';
  m3u += '#PLAYLIST:Easyorgtv Playlist\n';
  m3u += `# Generated: ${new Date().toISOString()}\n`;
  m3u += `# Channels: ${channels.data.length}\n\n`;
  
  channels.data.forEach(channel => {
    const logo = channel.logo ? ` tvg-logo="${channel.logo}"` : '';
    const group = channel.category ? ` group-title="${channel.category}"` : '';
    const countryAttr = channel.country ? ` tvg-country="${channel.country}"` : '';
    const lang = channel.language ? ` tvg-language="${channel.language}"` : '';
    const id = channel.id ? ` tvg-id="${channel.id}"` : '';
    
    m3u += `#EXTINF:-1${id}${logo}${group}${countryAttr}${lang},${channel.name}\n`;
    m3u += `${channel.url}\n`;
  });

  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.setHeader('Content-Disposition', `attachment; filename="easyorgtv-${Date.now()}.m3u"`);
  res.send(m3u);
});

// Export by category
app.get('/api/playlist/category/:category', (req, res) => {
  const channels = getChannels({
    page: 1,
    limit: 100000,
    category: req.params.category
  });

  let m3u = '#EXTM3U\n';
  m3u += `#PLAYLIST:Easyorgtv - ${req.params.category}\n\n`;
  
  channels.data.forEach(channel => {
    const logo = channel.logo ? ` tvg-logo="${channel.logo}"` : '';
    const group = ` group-title="${channel.category || req.params.category}"`;
    
    m3u += `#EXTINF:-1${logo}${group},${channel.name}\n`;
    m3u += `${channel.url}\n`;
  });

  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.setHeader('Content-Disposition', `attachment; filename="easyorgtv-${req.params.category}.m3u"`);
  res.send(m3u);
});

// Export by country
app.get('/api/playlist/country/:country', (req, res) => {
  const channels = getChannels({
    page: 1,
    limit: 100000,
    country: req.params.country
  });

  let m3u = '#EXTM3U\n';
  m3u += `#PLAYLIST:Easyorgtv - ${req.params.country}\n\n`;
  
  channels.data.forEach(channel => {
    const logo = channel.logo ? ` tvg-logo="${channel.logo}"` : '';
    const countryAttr = ` tvg-country="${channel.country || req.params.country}"`;
    
    m3u += `#EXTINF:-1${logo}${countryAttr},${channel.name}\n`;
    m3u += `${channel.url}\n`;
  });

  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.setHeader('Content-Disposition', `attachment; filename="easyorgtv-${req.params.country}.m3u"`);
  res.send(m3u);
});

// ============================================
// API Routes - Statistics
// ============================================

// Get statistics
app.get('/api/stats', (req, res) => {
  const stats = getStats();
  const crawlerStatus = getCrawlerStatus();
  const sources = getSources();
  
  res.json({
    ...stats,
    crawler: crawlerStatus,
    sources
  });
});

// ============================================
// Page Routes
// ============================================

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/docs.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/faq.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/terms.html'));
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log('================================================');
  console.log('  EASYORGTV - IPTV Channel Aggregator');
  console.log('================================================');
  console.log(`  Server: http://localhost:${PORT}`);
  console.log(`  API:    http://localhost:${PORT}/api`);
  console.log('================================================');
  console.log('  Starting 24/7 channel crawler...');
  console.log('================================================\n');
  
  // Start crawler on server start
  startCrawler();
});
