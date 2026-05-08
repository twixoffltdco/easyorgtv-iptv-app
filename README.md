# Easyorgtv

A free, open-source IPTV channel aggregator with internet-wide search capabilities.

![Easyorgtv Screenshot](https://via.placeholder.com/800x400?text=Easyorgtv+Screenshot)

## Features

- **Internet-wide Search** - Automatically discovers and indexes publicly available IPTV streams
- **Built-in Player** - Watch channels directly in your browser with HLS.js
- **M3U Export** - Export playlists for use with VLC, Kodi, or any IPTV player
- **Category Filtering** - Browse channels by category, country, or language
- **Search** - Find channels by name or keyword
- **REST API** - Integrate with your own applications
- **Self-hosted** - Run your own instance with full control
- **No Dependencies on External Services** - Does not rely on iptv-org or any other channel database

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/easyorgtv/easyorgtv.git

# Navigate to the directory
cd easyorgtv

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`.

## Project Structure

```
easyorgtv/
├── server/
│   ├── index.js      # Express server and API routes
│   ├── crawler.js    # Stream discovery and validation
│   ├── parser.js     # M3U/M3U8 playlist parser
│   └── database.js   # In-memory channel storage
├── public/
│   ├── index.html    # Main application page
│   ├── docs.html     # Documentation page
│   ├── faq.html      # FAQ page
│   ├── privacy.html  # Privacy Policy
│   ├── terms.html    # Terms of Service
│   ├── css/
│   │   └── style.css # Application styles
│   └── js/
│       └── app.js    # Frontend JavaScript
├── package.json
└── README.md
```

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels` | Get paginated channel list |
| GET | `/api/channels/search?q={query}` | Search channels |
| GET | `/api/channels/:id` | Get single channel |
| GET | `/api/categories` | Get all categories |
| GET | `/api/countries` | Get all countries |
| GET | `/api/playlist` | Export M3U playlist |
| GET | `/api/stats` | Get system statistics |
| POST | `/api/scan` | Trigger manual scan |

### Query Parameters

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `category` - Filter by category
- `country` - Filter by country code
- `language` - Filter by language

### Example

```bash
# Get all news channels
curl http://localhost:3000/api/channels?category=News

# Search for a channel
curl http://localhost:3000/api/channels/search?q=france

# Download M3U playlist
curl http://localhost:3000/api/playlist -o channels.m3u
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

### Adding Custom Playlist Sources

Edit `server/crawler.js` and add URLs to the `CRAWL_SOURCES` array:

```javascript
const CRAWL_SOURCES = [
  'https://example.com/playlist.m3u',
  'https://another-source.com/channels.m3u8'
];
```

## Usage with External Players

### VLC Media Player

1. Download the playlist: `http://localhost:3000/api/playlist`
2. Open VLC → Media → Open Network Stream
3. Enter the playlist URL or open the downloaded file

### Kodi

1. Install PVR IPTV Simple Client addon
2. Configure with playlist URL: `http://localhost:3000/api/playlist`
3. Restart Kodi

### Other IPTV Apps

Use the playlist URL `http://your-server:3000/api/playlist` with any M3U-compatible application.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Video Player**: HLS.js
- **No frameworks** - Pure, lightweight implementation

## How It Works

1. **Crawler** searches configured sources for M3U/M3U8 playlists
2. **Parser** extracts channel metadata (name, logo, category, etc.)
3. **Database** stores channels in memory (no persistence required)
4. **API** serves channel data to the frontend
5. **Player** uses HLS.js to stream video directly in browser

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Legal Notice

Easyorgtv is a search engine for publicly available streams. We do not host, store, or transmit any video content. The availability of a stream does not imply endorsement or verification of its legality.

Users are solely responsible for ensuring their use of streams complies with applicable laws in their jurisdiction.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Documentation](/docs)
- [FAQ](/faq)
- [Privacy Policy](/privacy)
- [Terms of Service](/terms)
- [API Reference](/docs#api-reference)

---

Made with care by the Easyorgtv Team
