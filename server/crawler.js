/**
 * IPTV Channel Crawler
 * Actively searches the internet for public M3U/M3U8 playlists 24/7
 */

const fetch = require('node-fetch');
const { parseM3U, isValidStreamUrl, normalizeCategory } = require('./parser');
const { addChannels, setScanStatus, clearChannels } = require('./database');

// Scan interval - every 30 minutes
const SCAN_INTERVAL = 30 * 60 * 1000;

// Global state
let isScanning = false;
let totalScanned = 0;
let totalFound = 0;

// ============================================
// GITHUB RAW M3U SOURCES
// Real repositories with IPTV playlists
// ============================================
const GITHUB_M3U_SOURCES = [
  // Free IPTV Sources
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_usa.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_uk.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_germany.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_france.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_spain.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_italy.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_russia.m3u8',
  
  // CrocoUser/zabava-project
  'https://raw.githubusercontent.com/CrocoUser/zabava-project/main/iptv.m3u',
  'https://raw.githubusercontent.com/CrocoUser/zabava-project/main/playlist.m3u',
  'https://raw.githubusercontent.com/CrocoUser/zabava-project/master/iptv.m3u',
  'https://raw.githubusercontent.com/CrocoUser/zabava-project/master/playlist.m3u',
  
  // Popular IPTV collections
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ad.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ae.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/af.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/al.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/am.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ar.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/at.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/au.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/az.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ba.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/bd.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/be.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/bg.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/br.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/by.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ca.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ch.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cl.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/co.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cz.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/de.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/dk.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ec.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ee.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/eg.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/es.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/fi.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/fr.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/gb.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ge.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/gr.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/hk.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/hr.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/hu.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/id.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ie.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/il.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/in.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/iq.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ir.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/it.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/jp.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ke.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/kr.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/kw.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/kz.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/lb.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/lt.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/lv.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ma.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/md.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/mk.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/mx.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/my.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ng.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/nl.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/no.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/nz.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pe.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ph.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pk.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pl.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pt.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/qa.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ro.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/rs.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ru.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/sa.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/se.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/sg.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/si.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/sk.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/th.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/tn.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/tr.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/tw.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ua.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/uy.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/uz.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ve.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/vn.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/za.m3u',
  
  // Category-based playlists
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/animation.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/business.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/classic.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/comedy.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/cooking.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/culture.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/documentary.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/education.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/entertainment.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/family.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/general.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/kids.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/legislative.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/lifestyle.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/movies.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/music.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/news.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/outdoor.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/relax.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/religious.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/science.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/series.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/shop.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/sports.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/travel.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/categories/weather.m3u',
  
  // Other GitHub IPTV repositories
  'https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/ipv6.m3u',
  'https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/itv.m3u',
  'https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/global.m3u',
  
  // FreeIPTV
  'https://raw.githubusercontent.com/iptv-community/iptv/main/categories/entertainment.m3u',
  'https://raw.githubusercontent.com/iptv-community/iptv/main/categories/news.m3u',
  'https://raw.githubusercontent.com/iptv-community/iptv/main/categories/sports.m3u',
  
  // M3U Plus
  'https://raw.githubusercontent.com/m3u-data/m3u/main/playlist.m3u',
  
  // WorldIPTV
  'https://raw.githubusercontent.com/Starter-IPTV/STARTER-IPTV/main/playlist.m3u',
];

// ============================================
// DIRECT STREAM SOURCES
// Official broadcaster streams
// ============================================
const DIRECT_STREAMS = [
  // News Channels
  {
    name: 'NASA TV Public',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/200px-NASA_logo.svg.png',
    category: 'Science',
    country: 'US',
    language: 'English'
  },
  {
    name: 'NASA TV Media',
    url: 'https://ntv2.akamaized.net/hls/live/2013923/NASA-NTV2-HLS/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/200px-NASA_logo.svg.png',
    category: 'Science',
    country: 'US',
    language: 'English'
  },
  {
    name: 'France 24 English',
    url: 'https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/France_24_logo_%282018%29.svg/200px-France_24_logo_%282018%29.svg.png',
    category: 'News',
    country: 'FR',
    language: 'English'
  },
  {
    name: 'France 24 Francais',
    url: 'https://static.france24.com/live/F24_FR_LO_HLS/live_web.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/France_24_logo_%282018%29.svg/200px-France_24_logo_%282018%29.svg.png',
    category: 'News',
    country: 'FR',
    language: 'French'
  },
  {
    name: 'France 24 Arabic',
    url: 'https://static.france24.com/live/F24_AR_LO_HLS/live_web.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/France_24_logo_%282018%29.svg/200px-France_24_logo_%282018%29.svg.png',
    category: 'News',
    country: 'FR',
    language: 'Arabic'
  },
  {
    name: 'France 24 Spanish',
    url: 'https://static.france24.com/live/F24_ES_LO_HLS/live_web.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/France_24_logo_%282018%29.svg/200px-France_24_logo_%282018%29.svg.png',
    category: 'News',
    country: 'FR',
    language: 'Spanish'
  },
  {
    name: 'DW News English',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Deutsche_Welle_Logo.svg/200px-Deutsche_Welle_Logo.svg.png',
    category: 'News',
    country: 'DE',
    language: 'English'
  },
  {
    name: 'DW Deutsch',
    url: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Deutsche_Welle_Logo.svg/200px-Deutsche_Welle_Logo.svg.png',
    category: 'News',
    country: 'DE',
    language: 'German'
  },
  {
    name: 'DW Arabic',
    url: 'https://dwamdstream101.akamaized.net/hls/live/2015524/dwstream101/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Deutsche_Welle_Logo.svg/200px-Deutsche_Welle_Logo.svg.png',
    category: 'News',
    country: 'DE',
    language: 'Arabic'
  },
  {
    name: 'DW Spanish',
    url: 'https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Deutsche_Welle_Logo.svg/200px-Deutsche_Welle_Logo.svg.png',
    category: 'News',
    country: 'DE',
    language: 'Spanish'
  },
  {
    name: 'Al Jazeera English',
    url: 'https://live-hls-web-aje.getaj.net/AJE/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Al_Jazeera_English.svg/200px-Al_Jazeera_English.svg.png',
    category: 'News',
    country: 'QA',
    language: 'English'
  },
  {
    name: 'Al Jazeera Arabic',
    url: 'https://live-hls-web-aja.getaj.net/AJA/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Al_Jazeera_English.svg/200px-Al_Jazeera_English.svg.png',
    category: 'News',
    country: 'QA',
    language: 'Arabic'
  },
  {
    name: 'CGTN',
    url: 'https://news.cgtn.com/resource/live/english/cgtn-news.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/CGTN_Logo.svg/200px-CGTN_Logo.svg.png',
    category: 'News',
    country: 'CN',
    language: 'English'
  },
  {
    name: 'CGTN Documentary',
    url: 'https://news.cgtn.com/resource/live/english/document.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/CGTN_Logo.svg/200px-CGTN_Logo.svg.png',
    category: 'Documentary',
    country: 'CN',
    language: 'English'
  },
  {
    name: 'NHK World Japan',
    url: 'https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/NHK_logo.svg/200px-NHK_logo.svg.png',
    category: 'General',
    country: 'JP',
    language: 'English'
  },
  {
    name: 'Euronews English',
    url: 'https://euronews-euronews-english-1-eu.rakuten.wurl.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Euronews_2022.svg/200px-Euronews_2022.svg.png',
    category: 'News',
    country: 'FR',
    language: 'English'
  },
  {
    name: 'Euronews French',
    url: 'https://euronews-euronews-french-3-eu.rakuten.wurl.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Euronews_2022.svg/200px-Euronews_2022.svg.png',
    category: 'News',
    country: 'FR',
    language: 'French'
  },
  {
    name: 'Euronews German',
    url: 'https://euronews-euronews-german-1-eu.rakuten.wurl.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Euronews_2022.svg/200px-Euronews_2022.svg.png',
    category: 'News',
    country: 'FR',
    language: 'German'
  },
  {
    name: 'Euronews Spanish',
    url: 'https://euronews-euronews-spanish-1-eu.rakuten.wurl.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Euronews_2022.svg/200px-Euronews_2022.svg.png',
    category: 'News',
    country: 'FR',
    language: 'Spanish'
  },
  {
    name: 'Euronews Italian',
    url: 'https://euronews-euronews-italian-2-eu.rakuten.wurl.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Euronews_2022.svg/200px-Euronews_2022.svg.png',
    category: 'News',
    country: 'IT',
    language: 'Italian'
  },
  {
    name: 'Euronews Portuguese',
    url: 'https://euronews-euronews-portuguese-2-eu.rakuten.wurl.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Euronews_2022.svg/200px-Euronews_2022.svg.png',
    category: 'News',
    country: 'PT',
    language: 'Portuguese'
  },
  {
    name: 'Euronews Russian',
    url: 'https://euronews-euronews-russian-1-eu.rakuten.wurl.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Euronews_2022.svg/200px-Euronews_2022.svg.png',
    category: 'News',
    country: 'RU',
    language: 'Russian'
  },
  {
    name: 'TRT World',
    url: 'https://tv-trtworld.medya.trt.com.tr/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/TRT_World_logo.svg/200px-TRT_World_logo.svg.png',
    category: 'News',
    country: 'TR',
    language: 'English'
  },
  {
    name: 'TRT Haber',
    url: 'https://tv-trthaber.medya.trt.com.tr/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/TRT_Haber_logo.svg/200px-TRT_Haber_logo.svg.png',
    category: 'News',
    country: 'TR',
    language: 'Turkish'
  },
  {
    name: 'TRT 1',
    url: 'https://tv-trt1.medya.trt.com.tr/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/TRT_1_logo_%282021-%29.svg/200px-TRT_1_logo_%282021-%29.svg.png',
    category: 'General',
    country: 'TR',
    language: 'Turkish'
  },
  {
    name: 'Arirang TV',
    url: 'https://amdlive-ch01-ctnd-com.akamaized.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Arirang_TV_logo.svg/200px-Arirang_TV_logo.svg.png',
    category: 'General',
    country: 'KR',
    language: 'English'
  },
  {
    name: 'KBS World',
    url: 'https://kbsworld24-rtp-live.akamaized.net/hls/live/2002341/kbsworld24/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/KBS_World_logo.svg/200px-KBS_World_logo.svg.png',
    category: 'General',
    country: 'KR',
    language: 'Korean'
  },
  {
    name: 'CNA Singapore',
    url: 'https://live1.mediadesk.sg/hls/channelnewsasia/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/CNA_%282020%29.svg/200px-CNA_%282020%29.svg.png',
    category: 'News',
    country: 'SG',
    language: 'English'
  },
  {
    name: 'WION India',
    url: 'https://d3cxdcibt08uee.cloudfront.net/wionhdlive/wionhd/wionhd.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/WION_News_Logo.svg/200px-WION_News_Logo.svg.png',
    category: 'News',
    country: 'IN',
    language: 'English'
  },
  {
    name: 'India Today',
    url: 'https://indiatoday.akamaized.net/hls/live/2014320/indiatoday/indiatoday_manifest.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/India_Today_TV_logo.svg/200px-India_Today_TV_logo.svg.png',
    category: 'News',
    country: 'IN',
    language: 'English'
  },
  {
    name: 'Aaj Tak',
    url: 'https://feeds.intoithd.com/aajtak_aajtak/aajtak/aajtak.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Aaj_tak_logo.svg/200px-Aaj_tak_logo.svg.png',
    category: 'News',
    country: 'IN',
    language: 'Hindi'
  },
  {
    name: 'NDTV 24x7',
    url: 'https://ndtv24x7elemarchana.akamaized.net/hls/live/2003678/ndtv24x7/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/NDTV_logo.svg/200px-NDTV_logo.svg.png',
    category: 'News',
    country: 'IN',
    language: 'English'
  },
  {
    name: 'TV5Monde',
    url: 'https://ott.tv5monde.com/Content/HLS/Live/channel(info)/index.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/TV5Monde_logo.svg/200px-TV5Monde_logo.svg.png',
    category: 'General',
    country: 'FR',
    language: 'French'
  },
  {
    name: 'RFI French',
    url: 'https://webradio-video.rfi.fr/live/rfimonde/rfimonde.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/RFI_logo.svg/200px-RFI_logo.svg.png',
    category: 'News',
    country: 'FR',
    language: 'French'
  },
  // Russian Channels
  {
    name: 'Perviy Kanal',
    url: 'https://edge1.1internet.tv/dash-live11/streams/1tv/1tv.mpd',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Channel_One_Russia.svg/200px-Channel_One_Russia.svg.png',
    category: 'General',
    country: 'RU',
    language: 'Russian'
  },
  {
    name: 'RTR Planeta',
    url: 'https://live.russia.tv/index/index/sid/rtrplaneta',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Logo_RTR-Planeta.svg/200px-Logo_RTR-Planeta.svg.png',
    category: 'General',
    country: 'RU',
    language: 'Russian'
  },
  // Entertainment
  {
    name: 'Pluto TV Movies',
    url: 'https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/5f4d868e3d19cd0007a1ad8b/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Pluto_TV_logo_2020.svg/200px-Pluto_TV_logo_2020.svg.png',
    category: 'Movies',
    country: 'US',
    language: 'English'
  },
  {
    name: 'Classic Arts Showcase',
    url: 'https://classicarts.akamaized.net/hls/live/1024257/CAS/master.m3u8',
    logo: null,
    category: 'Entertainment',
    country: 'US',
    language: 'English'
  },
  // Music Channels
  {
    name: 'MTV Music 24/7',
    url: 'https://mtveurope-samsunguk.amagi.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/MTV_2021_%28brand_version%29.svg/200px-MTV_2021_%28brand_version%29.svg.png',
    category: 'Music',
    country: 'US',
    language: 'English'
  },
  {
    name: 'Deluxe Music',
    url: 'https://sdn-global-live-streaming-packager-cache.3qsdn.com/264/live/deluxemusic/main/deluxemusic.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Deluxe_Music_Logo.svg/200px-Deluxe_Music_Logo.svg.png',
    category: 'Music',
    country: 'DE',
    language: 'German'
  },
  {
    name: 'Radio Monte Carlo TV',
    url: 'https://rmchdlive.akamaized.net/hls/live/2022717/rmchd/master.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Radio_Monte_Carlo_TV_logo.svg/200px-Radio_Monte_Carlo_TV_logo.svg.png',
    category: 'Music',
    country: 'IT',
    language: 'Italian'
  },
  // Kids
  {
    name: 'Cartoon Network',
    url: 'https://turnerlive.warnermediacdn.com/hls/live/586495/cnngo/cartoonnetwork/VIDEO_0_3564000.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Cartoon_Network_2010_logo.svg/200px-Cartoon_Network_2010_logo.svg.png',
    category: 'Kids',
    country: 'US',
    language: 'English'
  },
  // Sports
  {
    name: 'ESPN News',
    url: 'https://espn-espnnews-samsungus.amagi.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/200px-ESPN_wordmark.svg.png',
    category: 'Sports',
    country: 'US',
    language: 'English'
  },
  {
    name: 'beIN Sports',
    url: 'https://bfrancetv-beinsports-1-fra-rakuten.amagi.tv/playlist.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bein_sport_logo.svg/200px-Bein_sport_logo.svg.png',
    category: 'Sports',
    country: 'FR',
    language: 'French'
  },
  // Religion
  {
    name: 'EWTN',
    url: 'https://ewtn-live.global.ssl.fastly.net/live1/ewtn1/ewtn1.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/EWTN_logo.svg/200px-EWTN_logo.svg.png',
    category: 'Religious',
    country: 'US',
    language: 'English'
  },
  // Weather
  {
    name: 'The Weather Network',
    url: 'https://weathernetwork.playoutcenter.vip/weathernetwork/wn-nat/live.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/The_Weather_Network_logo.svg/200px-The_Weather_Network_logo.svg.png',
    category: 'Weather',
    country: 'CA',
    language: 'English'
  },
];

// ============================================
// DYNAMIC SEARCH SOURCES
// Search patterns for finding M3U playlists
// ============================================
const GITHUB_SEARCH_TERMS = [
  'iptv m3u playlist',
  'free iptv m3u',
  'iptv playlist m3u8',
  'live tv m3u',
  'tv channels m3u',
  'streaming m3u playlist',
  'free tv channels m3u',
  'international iptv m3u',
];

// User-added sources storage
let customSources = [];

/**
 * Fetch and parse a single M3U playlist
 */
async function fetchPlaylist(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Easyorgtv/1.0 (IPTV Aggregator)',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      return [];
    }

    const content = await response.text();
    const channels = parseM3U(content, url);
    
    // Add source info
    channels.forEach(channel => {
      channel.source = url;
      channel.discoveredAt = new Date().toISOString();
    });
    
    return channels;
  } catch (error) {
    console.log(`[Crawler] Failed to fetch: ${url.substring(0, 60)}...`);
    return [];
  }
}

/**
 * Search GitHub for M3U repositories
 */
async function searchGitHub() {
  const foundUrls = [];
  
  for (const term of GITHUB_SEARCH_TERMS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const query = encodeURIComponent(`${term} extension:m3u`);
      const response = await fetch(
        `https://api.github.com/search/code?q=${query}&per_page=30`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Easyorgtv/1.0'
          }
        }
      );
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          for (const item of data.items) {
            const rawUrl = `https://raw.githubusercontent.com/${item.repository.full_name}/${item.repository.default_branch || 'main'}/${item.path}`;
            if (!foundUrls.includes(rawUrl)) {
              foundUrls.push(rawUrl);
            }
          }
        }
      }
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`[Crawler] GitHub search failed for: ${term}`);
    }
  }
  
  console.log(`[Crawler] Found ${foundUrls.length} potential playlists from GitHub search`);
  return foundUrls;
}

/**
 * Verify if a stream URL is working
 */
async function verifyStream(url) {
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
    return response.ok || response.status === 302 || response.status === 301 || response.status === 405;
  } catch {
    return false;
  }
}

/**
 * Main crawl function - searches internet for channels
 */
async function crawlChannels() {
  if (isScanning) {
    console.log('[Crawler] Scan already in progress, skipping...');
    return;
  }
  
  isScanning = true;
  totalScanned = 0;
  totalFound = 0;
  
  console.log('================================================');
  console.log('[Crawler] Starting full internet scan for IPTV channels...');
  console.log(`[Crawler] Time: ${new Date().toISOString()}`);
  console.log('================================================');
  
  setScanStatus('running');

  try {
    // Phase 1: Add direct verified streams
    console.log('\n[Phase 1] Adding verified direct streams...');
    const directChannels = DIRECT_STREAMS.map((stream, index) => ({
      id: `direct-${index}-${Date.now()}`,
      ...stream,
      verified: true,
      source: 'direct'
    }));
    addChannels(directChannels);
    totalFound += directChannels.length;
    console.log(`[Phase 1] Added ${directChannels.length} direct streams`);

    // Phase 2: Crawl known GitHub M3U sources
    console.log('\n[Phase 2] Crawling known GitHub M3U repositories...');
    for (const url of GITHUB_M3U_SOURCES) {
      totalScanned++;
      const channels = await fetchPlaylist(url);
      if (channels.length > 0) {
        // Normalize categories
        channels.forEach(channel => {
          if (channel.category) {
            channel.category = normalizeCategory(channel.category);
          }
        });
        addChannels(channels);
        totalFound += channels.length;
        console.log(`[Phase 2] Found ${channels.length} channels from ${url.split('/').slice(-2).join('/')}`);
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Phase 3: Search GitHub for new M3U playlists
    console.log('\n[Phase 3] Searching GitHub for new M3U playlists...');
    const githubUrls = await searchGitHub();
    for (const url of githubUrls) {
      if (!GITHUB_M3U_SOURCES.includes(url)) {
        totalScanned++;
        const channels = await fetchPlaylist(url);
        if (channels.length > 0) {
          channels.forEach(channel => {
            if (channel.category) {
              channel.category = normalizeCategory(channel.category);
            }
          });
          addChannels(channels);
          totalFound += channels.length;
          console.log(`[Phase 3] Found ${channels.length} channels from new source`);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Phase 4: Crawl user-added custom sources
    if (customSources.length > 0) {
      console.log('\n[Phase 4] Crawling custom user sources...');
      for (const url of customSources) {
        totalScanned++;
        const channels = await fetchPlaylist(url);
        if (channels.length > 0) {
          channels.forEach(channel => {
            if (channel.category) {
              channel.category = normalizeCategory(channel.category);
            }
          });
          addChannels(channels);
          totalFound += channels.length;
          console.log(`[Phase 4] Found ${channels.length} channels from custom source`);
        }
      }
    }

    setScanStatus('completed');
    console.log('\n================================================');
    console.log(`[Crawler] Scan completed!`);
    console.log(`[Crawler] Sources scanned: ${totalScanned}`);
    console.log(`[Crawler] Total channels found: ${totalFound}`);
    console.log(`[Crawler] Next scan in ${SCAN_INTERVAL / 60000} minutes`);
    console.log('================================================\n');
    
  } catch (error) {
    console.error('[Crawler] Critical error:', error);
    setScanStatus('error');
  } finally {
    isScanning = false;
  }
}

/**
 * Start the crawler with periodic updates - 24/7 operation
 */
function startCrawler() {
  console.log('[Crawler] Initializing 24/7 IPTV channel crawler...');
  
  // Initial crawl
  crawlChannels();

  // Schedule periodic updates every 30 minutes
  setInterval(() => {
    console.log('[Crawler] Starting scheduled scan...');
    crawlChannels();
  }, SCAN_INTERVAL);
  
  console.log(`[Crawler] Scheduled to scan every ${SCAN_INTERVAL / 60000} minutes`);
}

/**
 * Add a custom playlist source
 */
function addSource(url) {
  if (!customSources.includes(url)) {
    customSources.push(url);
    console.log(`[Crawler] Added custom source: ${url}`);
    return true;
  }
  return false;
}

/**
 * Remove a playlist source
 */
function removeSource(url) {
  const index = customSources.indexOf(url);
  if (index > -1) {
    customSources.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Get all configured sources
 */
function getSources() {
  return {
    github: GITHUB_M3U_SOURCES.length,
    direct: DIRECT_STREAMS.length,
    custom: customSources.length,
    total: GITHUB_M3U_SOURCES.length + DIRECT_STREAMS.length + customSources.length,
    customUrls: [...customSources]
  };
}

/**
 * Get crawler status
 */
function getCrawlerStatus() {
  return {
    isScanning,
    totalScanned,
    totalFound,
    nextScan: new Date(Date.now() + SCAN_INTERVAL).toISOString()
  };
}

/**
 * Force immediate scan
 */
async function forceScan() {
  if (!isScanning) {
    await crawlChannels();
    return true;
  }
  return false;
}

module.exports = {
  crawlChannels,
  startCrawler,
  fetchPlaylist,
  verifyStream,
  addSource,
  removeSource,
  getSources,
  getCrawlerStatus,
  forceScan
};
