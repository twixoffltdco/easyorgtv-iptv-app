/**
 * Easyorgtv - Main Application JavaScript
 */

// State
let currentPage = 1;
let currentCategory = '';
let currentCountry = '';
let searchQuery = '';
let channels = [];
let totalPages = 1;
let hls = null;

// DOM Elements
const channelGrid = document.getElementById('channelGrid');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const categoryList = document.getElementById('categoryList');
const countryList = document.getElementById('countryList');
const refreshBtn = document.getElementById('refreshBtn');
const playerModal = document.getElementById('playerModal');
const playerOverlay = document.getElementById('playerOverlay');
const playerClose = document.getElementById('playerClose');
const playerTitle = document.getElementById('playerTitle');
const playerCategory = document.getElementById('playerCategory');
const playerLogo = document.getElementById('playerLogo');
const videoPlayer = document.getElementById('videoPlayer');
const playerError = document.getElementById('playerError');
const retryBtn = document.getElementById('retryBtn');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadCategories();
  loadCountries();
  loadChannels();
  setupEventListeners();
  
  // Start periodic stats update (every 30 seconds)
  setInterval(loadStats, 30000);
});

// Event Listeners
function setupEventListeners() {
  // Search
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      loadChannels();
    }, 300);
  });

  // Refresh - trigger manual scan
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `
      <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
      Scanning...
    `;
    
    try {
      await fetch('/api/scan', { method: 'POST' });
      // Wait a bit for scan to progress
      setTimeout(() => {
        loadChannels();
        loadStats();
        loadCategories();
        loadCountries();
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        `;
      }, 5000);
    } catch (error) {
      console.error('Scan failed:', error);
      refreshBtn.disabled = false;
    }
  });

  // Player Modal
  playerOverlay.addEventListener('click', closePlayer);
  playerClose.addEventListener('click', closePlayer);
  retryBtn.addEventListener('click', retryStream);

  // Mobile Menu
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && playerModal.classList.contains('open')) {
      closePlayer();
    }
  });
}

// Load Statistics
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();

    document.getElementById('totalChannels').textContent = formatNumber(stats.totalChannels);
    document.getElementById('totalCategories').textContent = stats.totalCategories;
    document.getElementById('totalCountries').textContent = stats.totalCountries;
    
    // Update crawler status indicator if exists
    const crawlerStatus = document.getElementById('crawlerStatus');
    if (crawlerStatus && stats.crawler) {
      if (stats.crawler.isScanning) {
        crawlerStatus.innerHTML = `
          <span class="status-indicator scanning"></span>
          <span>Scanning... (${stats.crawler.totalFound} found)</span>
        `;
      } else {
        crawlerStatus.innerHTML = `
          <span class="status-indicator idle"></span>
          <span>Sources: ${stats.sources?.total || 0}</span>
        `;
      }
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Format large numbers
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Load Categories
async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();

    categoryList.innerHTML = `
      <button class="filter-item ${!currentCategory ? 'active' : ''}" data-category="">
        All Categories
      </button>
    `;

    categories.forEach(cat => {
      const button = document.createElement('button');
      button.className = `filter-item ${currentCategory === cat.name ? 'active' : ''}`;
      button.dataset.category = cat.name;
      button.innerHTML = `
        <span>${cat.name}</span>
        <span class="filter-count">${cat.count}</span>
      `;
      button.addEventListener('click', () => selectCategory(cat.name));
      categoryList.appendChild(button);
    });

    // Add click handler for "All Categories"
    categoryList.querySelector('[data-category=""]').addEventListener('click', () => selectCategory(''));
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Load Countries
async function loadCountries() {
  try {
    const response = await fetch('/api/countries');
    const countries = await response.json();

    countryList.innerHTML = `
      <button class="filter-item ${!currentCountry ? 'active' : ''}" data-country="">
        All Countries
      </button>
    `;

    countries.forEach(country => {
      const button = document.createElement('button');
      button.className = `filter-item ${currentCountry === country.name ? 'active' : ''}`;
      button.dataset.country = country.name;
      button.innerHTML = `
        <span>${getCountryFlag(country.name)} ${country.name}</span>
        <span class="filter-count">${country.count}</span>
      `;
      button.addEventListener('click', () => selectCountry(country.name));
      countryList.appendChild(button);
    });

    // Add click handler for "All Countries"
    countryList.querySelector('[data-country=""]').addEventListener('click', () => selectCountry(''));
  } catch (error) {
    console.error('Failed to load countries:', error);
  }
}

// Get country flag emoji
function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '';
  const code = countryCode.toUpperCase();
  const offset = 127397;
  const flag = String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
  return flag;
}

// Select Category
function selectCategory(category) {
  currentCategory = category;
  currentPage = 1;

  // Update UI
  categoryList.querySelectorAll('.filter-item').forEach(item => {
    item.classList.toggle('active', item.dataset.category === category);
  });

  loadChannels();
}

// Select Country
function selectCountry(country) {
  currentCountry = country;
  currentPage = 1;

  // Update UI
  countryList.querySelectorAll('.filter-item').forEach(item => {
    item.classList.toggle('active', item.dataset.country === country);
  });

  loadChannels();
}

// Load Channels
async function loadChannels() {
  channelGrid.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading channels...</p>
    </div>
  `;

  try {
    let url;
    
    if (searchQuery) {
      url = `/api/channels/search?q=${encodeURIComponent(searchQuery)}`;
      if (currentCategory) url += `&category=${encodeURIComponent(currentCategory)}`;
      if (currentCountry) url += `&country=${encodeURIComponent(currentCountry)}`;
    } else {
      url = `/api/channels?page=${currentPage}&limit=48`;
      if (currentCategory) url += `&category=${encodeURIComponent(currentCategory)}`;
      if (currentCountry) url += `&country=${encodeURIComponent(currentCountry)}`;
    }

    const response = await fetch(url);
    const result = await response.json();

    channels = searchQuery ? result.data : result.data;
    totalPages = searchQuery ? 1 : result.pagination.totalPages;

    renderChannels();
    renderPagination(result.pagination);
  } catch (error) {
    console.error('Failed to load channels:', error);
    channelGrid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Failed to load channels. Please try again.</p>
        <button class="btn-retry" onclick="loadChannels()">Retry</button>
      </div>
    `;
  }
}

// Render Channels
function renderChannels() {
  if (channels.length === 0) {
    channelGrid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <p>No channels found</p>
        <p class="empty-hint">Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }

  channelGrid.innerHTML = channels.map(channel => `
    <div class="channel-card" data-id="${channel.id}" data-url="${channel.url}">
      <div class="channel-preview">
        ${channel.logo 
          ? `<img src="${channel.logo}" alt="${channel.name}" class="channel-logo" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''
        }
        <div class="channel-logo-placeholder" ${channel.logo ? 'style="display:none"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <div class="play-overlay">
          <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
        ${channel.verified ? '<span class="verified-badge" title="Verified stream">&#10003;</span>' : ''}
      </div>
      <div class="channel-info">
        <h3 class="channel-name" title="${channel.name}">${channel.name}</h3>
        <div class="channel-meta">
          ${channel.category ? `<span class="channel-category">${channel.category}</span>` : ''}
          ${channel.country ? `<span class="channel-country">${getCountryFlag(channel.country)} ${channel.country}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  // Add click handlers
  channelGrid.querySelectorAll('.channel-card').forEach(card => {
    card.addEventListener('click', () => {
      const channel = channels.find(c => c.id === card.dataset.id);
      if (channel) {
        openPlayer(channel);
      }
    });
  });
}

// Render Pagination
function renderPagination(paginationData) {
  if (!paginationData || paginationData.totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  const { page, totalPages, total } = paginationData;

  let pagesHtml = '';
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  if (start > 1) {
    pagesHtml += `<button class="pagination-page" data-page="1">1</button>`;
    if (start > 2) {
      pagesHtml += `<span class="pagination-ellipsis">...</span>`;
    }
  }

  for (let i = start; i <= end; i++) {
    pagesHtml += `<button class="pagination-page ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      pagesHtml += `<span class="pagination-ellipsis">...</span>`;
    }
    pagesHtml += `<button class="pagination-page" data-page="${totalPages}">${totalPages}</button>`;
  }

  pagination.innerHTML = `
    <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Prev
    </button>
    <div class="pagination-pages">
      ${pagesHtml}
    </div>
    <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">
      Next
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
    <span class="pagination-total">${formatNumber(total)} channels</span>
  `;

  pagination.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        currentPage = parseInt(btn.dataset.page);
        loadChannels();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// Player Functions
let currentChannel = null;

function openPlayer(channel) {
  currentChannel = channel;
  playerTitle.textContent = channel.name;
  playerCategory.textContent = channel.category || 'Uncategorized';
  
  if (channel.logo) {
    playerLogo.src = channel.logo;
    playerLogo.style.display = 'block';
  } else {
    playerLogo.style.display = 'none';
  }

  playerError.classList.remove('visible');
  playerModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  playStream(channel.url);
}

function closePlayer() {
  playerModal.classList.remove('open');
  document.body.style.overflow = '';
  
  if (hls) {
    hls.destroy();
    hls = null;
  }
  
  videoPlayer.pause();
  videoPlayer.src = '';
  currentChannel = null;
}

function playStream(url) {
  playerError.classList.remove('visible');

  // Check if it's an HLS stream
  if (url.includes('.m3u8') || url.includes('m3u8')) {
    if (Hls.isSupported()) {
      if (hls) {
        hls.destroy();
      }
      
      hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        startLevel: -1,
        autoStartLoad: true,
        xhrSetup: function(xhr, url) {
          xhr.withCredentials = false;
        }
      });

      hls.loadSource(url);
      hls.attachMedia(videoPlayer);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoPlayer.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              showPlayerError();
              break;
          }
        }
      });
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoPlayer.src = url;
      videoPlayer.addEventListener('loadedmetadata', () => {
        videoPlayer.play().catch(() => {});
      });
    } else {
      showPlayerError();
    }
  } else {
    // Direct video URL
    videoPlayer.src = url;
    videoPlayer.play().catch(() => {
      showPlayerError();
    });
  }

  videoPlayer.onerror = () => {
    showPlayerError();
  };
}

function showPlayerError() {
  playerError.classList.add('visible');
}

function retryStream() {
  if (currentChannel) {
    playStream(currentChannel.url);
  }
}

// Export Playlist
function downloadPlaylist(format = 'm3u') {
  let url = `/api/playlist?format=${format}`;
  if (currentCategory) url += `&category=${encodeURIComponent(currentCategory)}`;
  if (currentCountry) url += `&country=${encodeURIComponent(currentCountry)}`;
  
  window.location.href = url;
}

// Add Custom Source
async function addCustomSource(sourceUrl) {
  try {
    const response = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sourceUrl })
    });
    const result = await response.json();
    
    if (result.success) {
      loadStats();
      loadChannels();
      loadCategories();
      loadCountries();
    }
    
    return result;
  } catch (error) {
    console.error('Failed to add source:', error);
    return { success: false, message: 'Network error' };
  }
}

// Expose functions globally for HTML onclick handlers
window.downloadPlaylist = downloadPlaylist;
window.addCustomSource = addCustomSource;
window.loadChannels = loadChannels;
