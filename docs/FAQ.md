# Frequently Asked Questions

## General Questions

### What is Easyorgtv?

Easyorgtv is a free, open-source IPTV channel aggregator that searches the internet for publicly available live TV streams. It provides a unified interface to browse, search, and watch channels from around the world.

Unlike traditional IPTV services, Easyorgtv does not host any content - it simply indexes and organizes publicly available streams.

### Is Easyorgtv free to use?

Yes, Easyorgtv is completely free and open-source under the MIT License. There are no subscriptions, ads, or hidden fees.

### Where do the channels come from?

Easyorgtv uses a crawler system that searches for publicly available M3U/M3U8 playlists on the internet. These playlists contain links to live streams that broadcasters have made publicly accessible.

We do NOT use channels from iptv-org or any other external database. Our system independently discovers streams.

### How is this different from iptv-org?

While iptv-org maintains a curated database of channels, Easyorgtv:
- Has its own crawler/discovery system
- Runs as a self-hosted web application
- Includes a built-in video player
- Provides a REST API
- Does not rely on external channel databases

---

## Playback Issues

### Why is a channel not working?

Streams can stop working for several reasons:
- The broadcaster changed the stream URL
- The stream is geo-restricted in your region
- The stream requires authentication
- Server maintenance or technical issues
- High traffic causing temporary unavailability

Try refreshing the channel list or checking back later.

### The video is buffering constantly. What can I do?

Try these solutions:
1. Check your internet connection speed
2. Close other bandwidth-heavy applications
3. Use a VPN if the stream is slow from your location
4. Wait a few moments and try again

### Can I watch on my smart TV?

Yes! Export the M3U playlist and use it with any IPTV app:

**Smart TVs:** Use built-in IPTV apps or IPTV Smarters
**Android TV / Fire TV:** TiviMate, IPTV Smarters
**Apple TV:** GSE Smart IPTV
**Kodi:** PVR IPTV Simple Client addon
**Desktop:** VLC Media Player

Download the playlist from `/api/playlist`.

---

## Technical Questions

### How do I self-host Easyorgtv?

```bash
git clone https://github.com/easyorgtv/easyorgtv.git
cd easyorgtv
npm install
npm start
```

The server runs on port 3000 by default. Set the `PORT` environment variable to change it.

### How do I add my own playlist sources?

Edit `server/crawler.js` and add URLs to the `CRAWL_SOURCES` array:

```javascript
const CRAWL_SOURCES = [
  'https://example.com/playlist.m3u',
  'https://another-source.com/channels.m3u8'
];
```

### What browsers are supported?

All modern browsers:
- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari (with native HLS support)
- Opera

### How often is the database updated?

The crawler runs automatically every 6 hours. You can trigger a manual scan via `POST /api/scan`.

### What video formats are supported?

- HLS (m3u8) - Primary format, supported via HLS.js
- Direct video URLs (mp4, etc.)
- RTMP/RTSP - Limited support, depends on browser

---

## Legal Questions

### Is using Easyorgtv legal?

Easyorgtv indexes publicly available streams. We do not host content. The legality of watching specific streams depends on your local laws and the licensing of the content.

We recommend only watching content that is legally available in your region.

### How do I report a copyright issue?

Contact us with:
1. Your contact information
2. Description of the copyrighted work
3. The specific channel/stream URL
4. A statement of good faith belief

We will promptly remove any infringing content from our index.

---

## API Questions

### How do I use the API?

All endpoints are under `/api`:

```bash
# Get channels
curl http://localhost:3000/api/channels

# Search
curl http://localhost:3000/api/channels/search?q=news

# Export playlist
curl http://localhost:3000/api/playlist -o channels.m3u
```

### Is there a rate limit?

The default installation has no rate limiting. For production deployments, consider adding rate limiting via a reverse proxy.

### Can I integrate with my own application?

Yes! The REST API is designed for integration. All responses are JSON (except playlist export).

---

For more detailed information, see the [full documentation](DOCS.md).
