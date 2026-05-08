const express = require('express');
const cors = require('cors');
const path = require('path');
const { crawlChannels, getChannels, searchChannels, getStats, getCategories, getCountries } = require('./database');
const { startCrawler } = require('./crawler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes

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
  const channels = getChannels({ page: 1, limit: 10000 });
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

// Export playlist in M3U format
app.get('/api/playlist', (req, res) => {
  const { category, country, language } = req.query;
  const channels = getChannels({
    page: 1,
    limit: 10000,
    category,
    country,
    language
  });

  let m3u = '#EXTM3U\n';
  channels.data.forEach(channel => {
    const logo = channel.logo ? ` tvg-logo="${channel.logo}"` : '';
    const group = channel.category ? ` group-title="${channel.category}"` : '';
    const country = channel.country ? ` tvg-country="${channel.country}"` : '';
    const language = channel.language ? ` tvg-language="${channel.language}"` : '';
    
    m3u += `#EXTINF:-1${logo}${group}${country}${language},${channel.name}\n`;
    m3u += `${channel.url}\n`;
  });

  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.setHeader('Content-Disposition', 'attachment; filename="easyorgtv.m3u"');
  res.send(m3u);
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const stats = getStats();
  res.json(stats);
});

// Manual scan trigger
app.post('/api/scan', async (req, res) => {
  try {
    res.json({ message: 'Scan started', status: 'running' });
    await crawlChannels();
  } catch (error) {
    console.error('Scan error:', error);
  }
});

// Serve documentation pages
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

// Start server
app.listen(PORT, () => {
  console.log(`Easyorgtv server running on http://localhost:${PORT}`);
  
  // Start crawler on server start
  startCrawler();
});
