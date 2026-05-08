# Easyorgtv Documentation

Complete technical documentation for Easyorgtv - an IPTV channel aggregator with internet-wide search capabilities.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [M3U Format](#m3u-format)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher (or yarn)
- Modern web browser with JavaScript enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/easyorgtv/easyorgtv.git
cd easyorgtv

# Install dependencies
npm install

# Start the development server
npm start
```

The server starts at `http://localhost:3000` by default.

### Quick Test

```bash
# Check if the server is running
curl http://localhost:3000/api/stats

# Get channel list
curl http://localhost:3000/api/channels
```

## Architecture

### Overview

Easyorgtv consists of four main components:

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  (HTML/CSS/JS + HLS.js Player)                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Express Server                        │
│  (API Routes + Static File Serving)                     │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────┐    ┌─────────────────────┐
│      Crawler        │    │     Database        │
│  (Stream Discovery) │───▶│  (In-memory Store)  │
└─────────────────────┘    └─────────────────────┘
              │
              ▼
┌─────────────────────┐
│       Parser        │
│   (M3U Extraction)  │
└─────────────────────┘
```

### Components

#### 1. Crawler (`server/crawler.js`)

Responsible for:
- Fetching M3U/M3U8 playlists from configured sources
- Validating stream URLs (HEAD requests)
- Scheduling periodic updates (every 6 hours)
- Managing source list

#### 2. Parser (`server/parser.js`)

Handles:
- Parsing #EXTINF tags
- Extracting channel metadata
- Normalizing categories
- Generating unique channel IDs
- Validating stream URLs

#### 3. Database (`server/database.js`)

Provides:
- In-memory channel storage
- Filtering by category/country/language
- Search functionality
- Pagination
- Statistics aggregation

#### 4. API Server (`server/index.js`)

Exposes:
- RESTful API endpoints
- M3U playlist export
- Static file serving
- Documentation pages

### Data Flow

1. Server starts → Crawler initializes
2. Crawler fetches playlists from sources
3. Parser extracts channel information
4. Channels stored in database
5. Frontend requests channels via API
6. User plays stream → HLS.js loads directly from source

## API Reference

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### GET /channels

Get paginated list of all channels.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page |
| category | string | - | Filter by category |
| country | string | - | Filter by country |
| language | string | - | Filter by language |

**Response:**

```json
{
  "data": [
    {
      "id": "nasa-tv-public-abc123",
      "name": "NASA TV Public",
      "url": "https://example.com/stream.m3u8",
      "logo": "https://example.com/logo.png",
      "category": "Science",
      "country": "US",
      "language": "English"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /channels/search

Search channels by query.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| q | string | Yes | Search query |
| category | string | No | Filter by category |
| country | string | No | Filter by country |

**Response:**

```json
{
  "data": [...],
  "total": 5,
  "query": "news"
}
```

#### GET /channels/:id

Get a single channel by ID.

**Response:**

```json
{
  "id": "nasa-tv-public-abc123",
  "name": "NASA TV Public",
  "url": "https://example.com/stream.m3u8",
  "logo": "https://example.com/logo.png",
  "category": "Science",
  "country": "US",
  "language": "English",
  "source": "https://example.com/playlist.m3u"
}
```

#### GET /categories

Get all categories with channel counts.

**Response:**

```json
[
  { "name": "News", "count": 45 },
  { "name": "Sports", "count": 32 },
  { "name": "Entertainment", "count": 28 }
]
```

#### GET /countries

Get all countries with channel counts.

**Response:**

```json
[
  { "name": "US", "count": 120 },
  { "name": "UK", "count": 85 },
  { "name": "FR", "count": 64 }
]
```

#### GET /playlist

Export all channels as M3U playlist.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| category | string | Filter by category |
| country | string | Filter by country |
| language | string | Filter by language |

**Response:** `application/x-mpegurl`

```
#EXTM3U
#EXTINF:-1 tvg-logo="..." group-title="Science" tvg-country="US",NASA TV Public
https://example.com/stream.m3u8
```

#### GET /stats

Get system statistics.

**Response:**

```json
{
  "totalChannels": 250,
  "totalCategories": 15,
  "totalCountries": 45,
  "lastScan": "2024-01-15T10:30:00Z",
  "scanStatus": "completed",
  "topCategories": [...],
  "topCountries": [...]
}
```

#### POST /scan

Trigger a manual channel scan.

**Response:**

```json
{
  "message": "Scan started",
  "status": "running"
}
```

## M3U Format

### Supported Tags

| Tag | Description | Example |
|-----|-------------|---------|
| #EXTM3U | Header (required) | `#EXTM3U` |
| #EXTINF | Channel info | `#EXTINF:-1,Channel Name` |
| tvg-id | EPG identifier | `tvg-id="channel.id"` |
| tvg-name | Display name | `tvg-name="Channel Name"` |
| tvg-logo | Logo URL | `tvg-logo="https://..."` |
| tvg-country | Country code | `tvg-country="US"` |
| tvg-language | Language | `tvg-language="English"` |
| group-title | Category | `group-title="News"` |

### Example Playlist

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="nasa.tv" tvg-name="NASA TV" tvg-logo="https://example.com/nasa.png" group-title="Science" tvg-country="US" tvg-language="English",NASA TV Public
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8

#EXTINF:-1 tvg-name="France 24 English" group-title="News" tvg-country="FR",France 24
https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | HTTP server port |
| NODE_ENV | development | Environment mode |

### Adding Playlist Sources

Edit `server/crawler.js`:

```javascript
const CRAWL_SOURCES = [
  'https://your-source.com/playlist.m3u',
  'https://another-source.com/iptv.m3u8'
];
```

### Customizing Scan Interval

In `server/crawler.js`, modify the interval:

```javascript
// Default: 6 hours (6 * 60 * 60 * 1000)
setInterval(() => {
  crawlChannels();
}, 12 * 60 * 60 * 1000); // 12 hours
```

## Deployment

### Standard Deployment

```bash
# Set production environment
export NODE_ENV=production
export PORT=80

# Start server
npm start
```

### Docker (Coming Soon)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name easyorgtv.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Common Issues

#### Streams not loading

1. Check browser console for errors
2. Verify the stream URL is accessible
3. Try a different browser
4. Some streams may be geo-restricted

#### No channels showing

1. Check if crawler completed: `GET /api/stats`
2. Verify sources in `crawler.js`
3. Check server logs for errors

#### High memory usage

The in-memory database grows with channel count. For large deployments, consider:
- Limiting channel count
- Adding pagination limits
- Implementing persistence (future feature)

### Debug Mode

Add console logs to track issues:

```javascript
// In crawler.js
console.log('Fetching:', sourceUrl);
console.log('Found channels:', channels.length);
```

### Getting Help

- Check the [FAQ](/faq)
- Open an issue on GitHub
- Review server logs

---

For more information, visit the [main documentation](/docs) page.
