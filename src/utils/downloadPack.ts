import JSZip from 'jszip';
import { Movie, Torrent, buildMagnetLink, RECOMMENDED_TRACKERS } from '../types';
import { getMovieSlug } from './seo';

export const SITE_URL = 'https://cinevault-movies-one.vercel.app';
export const SITE_NAME = 'CineVault By Sasuu';

/**
 * Clean string for safe file/folder names
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

/**
 * Clean string for display file names
 */
export function sanitizeTitle(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * SVG Logo Content for CineVault
 */
export const CINEVAULT_SVG_LOGO = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cv-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF3355" />
      <stop offset="35%" stop-color="#E50914" />
      <stop offset="75%" stop-color="#B30012" />
      <stop offset="100%" stop-color="#550009" />
    </linearGradient>
    <linearGradient id="cv-silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="25%" stop-color="#E2E8F0" />
      <stop offset="55%" stop-color="#94A3B8" />
      <stop offset="85%" stop-color="#CBD5E1" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>
    <radialGradient id="cv-silver-inner" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
      <stop offset="60%" stop-color="#94A3B8" />
      <stop offset="90%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0F172A" />
    </radialGradient>
    <linearGradient id="cv-ribbon-grad" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="30%" stop-color="#0F172A" />
      <stop offset="70%" stop-color="#334155" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>
    <filter id="cv-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#E50914" flood-opacity="0.5" />
    </filter>
  </defs>
  <circle cx="58" cy="56" r="44" fill="#E50914" opacity="0.15" />
  <path d="M 68 18 C 40 16, 20 34, 20 60 C 20 86, 40 102, 68 100 C 74 99.5, 78 98, 80 96 C 76 92, 70 88, 64 87 C 46 86, 33 74, 33 60 C 33 46, 46 32, 64 31 C 72 30.5, 76 26, 80 22 C 76 20, 72 18.5, 68 18 Z" fill="url(#cv-red-grad)" stroke="#FF5577" stroke-width="1.2" />
  <path d="M 72 19.5 C 44 18, 23 35, 23 60 C 23 83, 42 98, 66 97" fill="none" stroke="#FFAAB8" stroke-width="1.5" stroke-linecap="round" opacity="0.8" />
  <path d="M 60 40 L 74 88 L 84 88 L 68 36 Z" fill="url(#cv-red-grad)" opacity="0.95" />
  <path d="M 74 88 L 94 30 L 108 30 L 84 88 Z" fill="url(#cv-red-grad)" stroke="#FF5577" stroke-width="1" />
  <path d="M 94 30 L 108 30 L 84 88" fill="none" stroke="#FFAAB8" stroke-width="1.2" opacity="0.85" />
  <g fill="#080808" stroke="#334155" stroke-width="0.5">
    <rect x="94.5" y="36" width="7" height="4.5" rx="1" transform="rotate(-18 94.5 36)" />
    <rect x="90" y="46" width="7" height="4.5" rx="1" transform="rotate(-18 90 46)" />
    <rect x="85.5" y="56" width="7" height="4.5" rx="1" transform="rotate(-18 85.5 56)" />
    <rect x="81" y="66" width="7" height="4.5" rx="1" transform="rotate(-18 81 66)" />
    <rect x="76.5" y="76" width="7" height="4.5" rx="1" transform="rotate(-18 76.5 76)" />
  </g>
  <path d="M 45 68 C 55 76, 68 84, 88 84 L 84 94 C 62 94, 48 86, 38 76 Z" fill="url(#cv-ribbon-grad)" stroke="#64748B" stroke-width="0.8" />
  <g fill="#050505">
    <rect x="44" y="72" width="2.5" height="3" rx="0.5" transform="rotate(20 44 72)" />
    <rect x="52" y="76" width="2.5" height="3" rx="0.5" transform="rotate(15 52 76)" />
    <rect x="61" y="79" width="2.5" height="3" rx="0.5" transform="rotate(10 61 79)" />
    <rect x="71" y="81" width="2.5" height="3" rx="0.5" transform="rotate(5 71 81)" />
    <rect x="80" y="82" width="2.5" height="3" rx="0.5" transform="rotate(0 80 82)" />
    <rect x="42" y="78" width="2.5" height="3" rx="0.5" transform="rotate(20 42 78)" />
    <rect x="50" y="82" width="2.5" height="3" rx="0.5" transform="rotate(15 50 82)" />
    <rect x="59" y="85" width="2.5" height="3" rx="0.5" transform="rotate(10 59 85)" />
    <rect x="69" y="87" width="2.5" height="3" rx="0.5" transform="rotate(5 69 87)" />
    <rect x="78" y="88" width="2.5" height="3" rx="0.5" transform="rotate(0 78 88)" />
  </g>
  <g filter="url(#cv-glow)">
    <circle cx="52" cy="50" r="23" fill="url(#cv-silver-grad)" stroke="#FFFFFF" stroke-width="1.2" />
    <circle cx="52" cy="50" r="20" fill="url(#cv-silver-inner)" stroke="#475569" stroke-width="0.8" />
    <circle cx="52" cy="37" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" stroke-width="0.7" />
    <circle cx="63" cy="43.5" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" stroke-width="0.7" />
    <circle cx="63" cy="56.5" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" stroke-width="0.7" />
    <circle cx="52" cy="63" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" stroke-width="0.7" />
    <circle cx="41" cy="56.5" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" stroke-width="0.7" />
    <circle cx="41" cy="43.5" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" stroke-width="0.7" />
    <circle cx="52" cy="50" r="6" fill="url(#cv-silver-grad)" stroke="#FFFFFF" stroke-width="0.8" />
    <circle cx="52" cy="50" r="2.4" fill="#0A0A0A" stroke="#94A3B8" stroke-width="0.5" />
    <path d="M 37 38 C 42 32, 52 30, 62 34 C 54 33, 44 36, 37 38 Z" fill="#FFFFFF" opacity="0.8" />
  </g>
</svg>`;

/**
 * Generate standard desktop .url Internet Shortcut file
 */
export function generateInternetShortcut(url: string, name: string = 'CineVault By Sasuu'): string {
  return `[InternetShortcut]
URL=${url}
IconIndex=0
Comment=Visit ${name} for HD Movie Downloads and Streaming
`;
}

/**
 * Generate Magnet link .url shortcut (launches default torrent client on Windows/Mac)
 */
export function generateMagnetShortcut(magnetUri: string): string {
  return `[InternetShortcut]
URL=${magnetUri}
IconIndex=0
Comment=Direct Magnet Link for BitTorrent Client
`;
}

/**
 * Generate formatted text file containing comprehensive website details and movie information
 */
export function generateWebsiteDetailsTxt(movie: Movie, torrent?: Torrent): string {
  const slug = getMovieSlug(movie);
  const movieUrl = `${SITE_URL}/movies/${slug}`;
  const magnetUri = torrent ? buildMagnetLink(torrent.hash, movie.title_long || movie.title) : '';
  const genres = movie.genres?.join(', ') || 'Cinema / Feature Film';
  const castList = movie.cast?.map(c => `• ${c.name} as ${c.character_name || 'Actor'}`).join('\n') || 'Cast metadata available on website.';
  const synopsis = movie.description_full || movie.summary || movie.synopsis || 'Explore full movie overview, trailers, and subtitles on CineVault.';
  
  return `================================================================================
                           CINEVAULT BY SASUU
                    High-Definition Cinema & Movie Vault
                    Downloaded from CineVault By Sasuu
================================================================================

Official Website   : ${SITE_URL}
Direct Movie Link  : ${movieUrl}
Curator / Admin    : Sasuu (prospersasuu808@gmail.com)
Date Downloaded    : ${new Date().toUTCString()}

--------------------------------------------------------------------------------
MOVIE METADATA & INFORMATION
--------------------------------------------------------------------------------
Title              : ${movie.title}
Year               : ${movie.year || 'N/A'}
IMDb Rating        : ${movie.rating ? `${movie.rating.toFixed(1)} / 10 ` : 'N/A'}
Content Advisory   : ${movie.mpa_rating || 'Not Rated'}
Runtime            : ${movie.runtime ? `${movie.runtime} minutes (${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m)` : 'Feature Length'}
Language           : ${(movie.language || 'English').toUpperCase()}
Genres             : ${genres}
IMDb Code          : ${movie.imdb_code || 'N/A'}

${torrent ? `--------------------------------------------------------------------------------
DOWNLOADED FORMAT SPECIFICATIONS
--------------------------------------------------------------------------------
Resolution         : ${torrent.quality}
Source Type        : ${torrent.type || 'WEB-DL / BluRay'}
File Size          : ${torrent.size} (${torrent.size_bytes ? `${(torrent.size_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : ''})
Video Codec        : ${torrent.video_codec || 'x264 / x265'}
Audio Channels     : ${torrent.audio_channels ? `${torrent.audio_channels} Channels` : 'Stereo / 5.1'}
Seeds / Peers      : ${torrent.seeds} Seeds / ${torrent.peers} Peers
BTIH Info Hash     : ${torrent.hash}
Date Added         : ${torrent.date_uploaded || 'Recent'}

MAGNET URI:
${magnetUri}
` : ''}
--------------------------------------------------------------------------------
SYNOPSIS & OVERVIEW
--------------------------------------------------------------------------------
${synopsis}

--------------------------------------------------------------------------------
CAST & CREW
--------------------------------------------------------------------------------
${castList}

--------------------------------------------------------------------------------
RECOMMENDED SOFTWARE & PLAYBACK
--------------------------------------------------------------------------------
1. BitTorrent Clients:
   - qBittorrent (Fast, Open-Source & Ad-Free): https://www.qbittorrent.org
   - Transmission (Lightweight & Clean): https://transmissionbt.com

2. Video Players (Plays all 4K, 1080p, HDR, and MKV/MP4 files with subtitles):
   - VLC Media Player: https://www.videolan.org
   - MPC-HC / PotPlayer (Windows)
   - IINA Player (macOS)

3. Subtitles & Extras:
   - Download synchronized SRT/VTT subtitles on CineVault: ${movieUrl}

--------------------------------------------------------------------------------
ABOUT CINEVAULT BY SASUU
--------------------------------------------------------------------------------
CineVault By Sasuu is your premier destination for curated, high-definition 
movies. Download high-speed torrents, magnet links, subtitles, and detailed 
film specifications in 720p, 1080p, and 4K Ultra HD.

• Website    : ${SITE_URL}
• Contact    : prospersasuu808@gmail.com

Please consider seeding after download completes to keep speeds fast for 
other cinema lovers around the globe!
================================================================================
`;
}

/**
 * Generate a standalone, offline-ready branded HTML companion document
 * (CineVault-Download-Info.html) with logo, movie poster,
 * verified certification, metadata, return links, and magnet launcher.
 */
export function generateBrandedHtmlCompanion(movie: Movie, torrent?: Torrent): string {
  const slug = getMovieSlug(movie);
  const movieUrl = `${SITE_URL}/movies/${slug}`;
  const posterUrl = movie.large_cover_image || movie.medium_cover_image || 'https://yts.gg/assets/images/movies/cover.jpg';
  const backdropUrl = movie.background_image_original || movie.background_image || '';
  const magnetUri = torrent ? buildMagnetLink(torrent.hash, movie.title_long || movie.title) : '';
  const genres = movie.genres?.join(', ') || 'Cinema / Feature Film';
  const castList = movie.cast?.map(c => `<li><strong>${escapeHtml(c.name)}</strong> as ${escapeHtml(c.character_name || 'Cast Member')}</li>`).join('') || '<li>Full cast metadata available online.</li>';
  const synopsis = movie.description_full || movie.summary || movie.synopsis || 'Explore full movie overview, trailers, and subtitles on CineVault.';
  const downloadDate = new Date().toUTCString();
  const quality = torrent?.quality || '1080p';
  const source = torrent?.type || 'BluRay / WEB-DL';
  const size = torrent?.size || 'Full HD';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(movie.title)} (${movie.year || 'HD'}) — Downloaded from CineVault By Sasuu</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #050505;
      color: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      line-height: 1.6;
      padding: 32px 16px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .container {
      width: 100%;
      max-width: 880px;
      background: #0a0a0a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(229, 9, 20, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1c0407 0%, #0d0d0d 60%, #050505 100%);
      padding: 32px 28px;
      border-bottom: 1px solid rgba(225, 29, 72, 0.25);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-logo-svg {
      width: 52px;
      height: 52px;
      filter: drop-shadow(0 4px 12px rgba(229, 9, 20, 0.5));
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .brand-title span {
      color: #e50914;
    }
    .brand-sub {
      font-size: 12px;
      color: #fda4af;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
    }
    .content {
      padding: 32px 28px;
    }
    .movie-hero {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 28px;
      margin-bottom: 32px;
    }
    @media (max-width: 640px) {
      .movie-hero { grid-template-columns: 1fr; }
      .header { padding: 24px 20px; }
      .content { padding: 24px 20px; }
    }
    .poster-wrap {
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: #121212;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.6);
      aspect-ratio: 2/3;
    }
    .poster-wrap img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
    .movie-title {
      font-size: 28px;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 10px;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .meta-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .meta-tag {
      padding: 5px 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #d4d4d4;
    }
    .meta-tag.rating {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-weight: 800;
    }
    .meta-tag.quality-tag {
      background: rgba(225, 29, 72, 0.2);
      border-color: rgba(225, 29, 72, 0.4);
      color: #ff4d6d;
      font-weight: 800;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      background: #111111;
      padding: 18px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 24px;
    }
    .spec-item {
      font-size: 12px;
    }
    .spec-label {
      color: #888888;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .spec-val {
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 13px 22px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #e50914;
      color: #ffffff;
      box-shadow: 0 4px 18px rgba(229, 9, 20, 0.45);
    }
    .btn-primary:hover { background: #ff2a36; transform: translateY(-1px); }
    .btn-emerald {
      background: #059669;
      color: #ffffff;
      box-shadow: 0 4px 18px rgba(5, 150, 105, 0.45);
    }
    .btn-emerald:hover { background: #10b981; transform: translateY(-1px); }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-1px); }
    .section-title {
      font-size: 15px;
      font-weight: 800;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 8px;
    }
    .section-title::before {
      content: "";
      width: 4px;
      height: 14px;
      background: #e50914;
      border-radius: 2px;
    }
    .synopsis {
      font-size: 14px;
      color: #d4d4d4;
      line-height: 1.7;
      margin-bottom: 28px;
    }
    .cast-list {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
      font-size: 13px;
      color: #a3a3a3;
      margin-bottom: 28px;
    }
    .cast-list li {
      background: #111111;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .cast-list li strong { color: #ffffff; }
    .magnet-box {
      background: #000000;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #34d399;
      word-break: break-all;
      margin-bottom: 28px;
      max-height: 100px;
      overflow-y: auto;
    }
    .trackers-box {
      background: #0d0d0d;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      color: #888888;
      max-height: 80px;
      overflow-y: auto;
      margin-bottom: 28px;
    }
    .footer {
      background: #050505;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 24px 28px;
      text-align: center;
      font-size: 12px;
      color: #737373;
    }
    .footer a {
      color: #fda4af;
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="brand">
        <div class="brand-logo-svg">
          ${CINEVAULT_SVG_LOGO}
        </div>
        <div>
          <div class="brand-title">Cine<span>Vault</span></div>
          <div class="brand-sub">By Sasuu — Cinema Vault & Discovery</div>
        </div>
      </div>
      <div class="badge">
        <span class="badge-dot"></span>
        <span>Downloaded from CineVault By Sasuu</span>
      </div>
    </header>

    <main class="content">
      <div class="movie-hero">
        <div class="poster-wrap">
          <img src="${escapeHtml(posterUrl)}" alt="${escapeHtml(movie.title)} Official Poster" onerror="this.src='https://yts.gg/assets/images/movies/cover.jpg'">
        </div>
        <div>
          <h1 class="movie-title">${escapeHtml(movie.title)} (${movie.year || 'HD'})</h1>
          
          <div class="meta-tags">
            <span class="meta-tag rating"> ${movie.rating ? movie.rating.toFixed(1) : 'NR'} / 10 IMDb</span>
            <span class="meta-tag quality-tag">${escapeHtml(quality)}</span>
            <span class="meta-tag">${escapeHtml(movie.mpa_rating || 'PG-13')}</span>
            <span class="meta-tag">${movie.runtime ? `${movie.runtime} min` : 'Feature Film'}</span>
            <span class="meta-tag">${escapeHtml((movie.language || 'en').toUpperCase())}</span>
            <span class="meta-tag">${escapeHtml(genres)}</span>
          </div>

          <div class="specs-grid">
            <div class="spec-item">
              <div class="spec-label">Quality</div>
              <div class="spec-val">${escapeHtml(quality)}</div>
            </div>
            <div class="spec-item">
              <div class="spec-label">Source</div>
              <div class="spec-val">${escapeHtml(source)}</div>
            </div>
            <div class="spec-item">
              <div class="spec-label">File Size</div>
              <div class="spec-val">${escapeHtml(size)}</div>
            </div>
            <div class="spec-item">
              <div class="spec-label">Download Date</div>
              <div class="spec-val">${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="actions">
            <a href="${escapeHtml(movieUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
              <span>Visit CineVault Online</span>
              <span></span>
            </a>
            ${magnetUri ? `
            <a href="${escapeHtml(magnetUri)}" class="btn btn-emerald">
              <span> Launch BitTorrent Client</span>
            </a>
            ` : ''}
            <a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
              <span>Browse CineVault Library</span>
            </a>
          </div>
        </div>
      </div>

      <h2 class="section-title">Storyline & Synopsis</h2>
      <p class="synopsis">${escapeHtml(synopsis)}</p>

      <h2 class="section-title">Cast & Characters</h2>
      <ul class="cast-list">
        ${castList}
      </ul>

      ${magnetUri ? `
      <h2 class="section-title">Direct Magnet URI</h2>
      <div class="magnet-box">${escapeHtml(magnetUri)}</div>
      ` : ''}

      <h2 class="section-title">High-Speed Peer Trackers (${RECOMMENDED_TRACKERS.length})</h2>
      <div class="trackers-box">
        ${RECOMMENDED_TRACKERS.map(t => `<div>${escapeHtml(t)}</div>`).join('')}
      </div>

      <h2 class="section-title">Recommended Playback & Software</h2>
      <p class="synopsis" style="margin-bottom: 8px;">
        • <strong>BitTorrent Clients:</strong> <a href="https://www.qbittorrent.org" target="_blank" rel="noopener noreferrer" style="color: #60a5fa;">qBittorrent</a> (Recommended, Open-Source & Ad-Free), <a href="https://transmissionbt.com" target="_blank" rel="noopener noreferrer" style="color: #60a5fa;">Transmission</a><br>
        • <strong>Video Players:</strong> <a href="https://www.videolan.org" target="_blank" rel="noopener noreferrer" style="color: #60a5fa;">VLC Media Player</a>, PotPlayer (Windows), IINA (macOS)<br>
        • <strong>Subtitles:</strong> Download synchronized SRT/VTT subtitles on CineVault: <a href="${escapeHtml(movieUrl)}" target="_blank" rel="noopener noreferrer" style="color: #fda4af;">${escapeHtml(movieUrl)}</a>
      </p>
    </main>

    <footer class="footer">
      <p>This movie package was downloaded via <a href="${SITE_URL}" target="_blank" rel="noopener noreferrer">${SITE_NAME}</a></p>
      <p style="margin-top: 6px; color: #525252;">Official Website: <a href="${SITE_URL}" target="_blank" rel="noopener noreferrer">${SITE_URL}</a> · Contact: prospersasuu808@gmail.com</p>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Trigger immediate download of the branded HTML companion file
 * (CineVault-Download-Info.html)
 */
export function downloadBrandedCompanionFile(movie: Movie, torrent?: Torrent): boolean {
  try {
    const htmlContent = generateBrandedHtmlCompanion(movie, torrent);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const cleanTitle = sanitizeFileName(movie.title);
    const fileName = `CineVault-${cleanTitle}-Download-Info.html`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
    return true;
  } catch (err) {
    console.error('Failed to download branded companion file:', err);
    return false;
  }
}

/**
 * Fetch image array buffer (with fallback to proxy)
 */
async function fetchImageBytes(imageUrl: string): Promise<{ data: ArrayBuffer; ext: string } | null> {
  if (!imageUrl) return null;

  // 1. Try direct fetch
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const ext = imageUrl.includes('.png') ? 'png' : 'jpg';
      return { data: buffer, ext };
    }
  } catch {
    // CORS or network failure; continue to proxy
  }

  // 2. Try through backend proxy
  try {
    const proxyUrl = `/api/download/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const ext = imageUrl.includes('.png') ? 'png' : 'jpg';
      return { data: buffer, ext };
    }
  } catch {
    // Proxy not reachable
  }

  return null;
}

/**
 * Fetch .torrent binary file if possible
 */
async function fetchTorrentBytes(torrentUrl: string): Promise<ArrayBuffer | null> {
  if (!torrentUrl) return null;

  try {
    const res = await fetch(torrentUrl, { mode: 'cors' });
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch {
    // CORS issue, try proxy
  }

  try {
    const proxyUrl = `/api/download/proxy-file?url=${encodeURIComponent(torrentUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch {
    // proxy failed
  }

  return null;
}

/**
 * Main Download Package Handler:
 * Bundles:
 * 1. [MovieTitle]-[Year]-[Quality].torrent (or Launch-Magnet-Download.url & Magnet_URI.txt)
 * 2. [MovieTitle]-[Year].jpg (Cover Poster Photo)
 * 3. CineVault-Logo.svg (Vector Emblem)
 * 4. CineVault-Download-Info.html (Interactive branded companion document)
 * 5. CineVault_By_Sasuu_Details.txt (Complete Site Info & Movie Specs)
 * 6. WWW_CINEVAULT_MOVIES.url (Desktop Internet Shortcut)
 * 
 * Returns true if download was successfully triggered.
 */
export async function downloadMoviePackage(
  movie: Movie,
  torrent?: Torrent,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    onProgress?.('Preparing your CineVault download...');
    const zip = new JSZip();

    const cleanTitle = sanitizeFileName(movie.title);
    const quality = torrent?.quality || '720p';
    const year = movie.year || 'HD';
    const baseName = `${cleanTitle}-${year}-${quality}`;
    const zipName = `CineVault-${baseName}.zip`;

    // 1. Add Interactive Branded HTML Companion File: CineVault-Download-Info.html
    const brandedHtml = generateBrandedHtmlCompanion(movie, torrent);
    zip.file('CineVault-Download-Info.html', brandedHtml);

    // 2. Add CineVault Official Vector Logo: CineVault-Logo.svg
    zip.file('CineVault-Logo.svg', CINEVAULT_SVG_LOGO);

    // 3. Add Site Details & Movie Specs Text File
    const detailsTxt = generateWebsiteDetailsTxt(movie, torrent);
    zip.file('CineVault_By_Sasuu_Details.txt', detailsTxt);
    zip.file('WWW_CINEVAULT_MOVIES.url', generateInternetShortcut(`${SITE_URL}/movies/${getMovieSlug(movie)}`, movie.title));

    // 4. Add Magnet URI Shortcut & Text
    if (torrent) {
      const magnetUri = buildMagnetLink(torrent.hash, movie.title_long || movie.title);
      zip.file('Launch_Magnet_Download.url', generateMagnetShortcut(magnetUri));
      zip.file('Magnet_URI.txt', magnetUri);

      // 5. Try adding .torrent binary if URL exists
      if (torrent.url) {
        onProgress?.('Adding torrent metadata...');
        const torrentBytes = await fetchTorrentBytes(torrent.url);
        if (torrentBytes && torrentBytes.byteLength > 0) {
          zip.file(`${cleanTitle}-${year}-${torrent.quality}.torrent`, torrentBytes);
        }
      }
    }

    // 6. Add High-Res Photo / Movie Poster: [MovieTitle]-[Year].jpg
    onProgress?.('Adding movie poster photo & artwork...');
    const posterUrl = movie.large_cover_image || movie.medium_cover_image || movie.background_image_original;
    if (posterUrl) {
      const imageResult = await fetchImageBytes(posterUrl);
      if (imageResult && imageResult.data.byteLength > 0) {
        zip.file(`${cleanTitle}-${year}.${imageResult.ext}`, imageResult.data);
      }
    }

    // Add Backdrop / Fanart if available
    const backdropUrl = movie.background_image_original || movie.background_image;
    if (backdropUrl && backdropUrl !== posterUrl) {
      const bgResult = await fetchImageBytes(backdropUrl);
      if (bgResult && bgResult.data.byteLength > 0) {
        zip.file(`${cleanTitle}-${year}-Backdrop.${bgResult.ext}`, bgResult.data);
      }
    }

    // 7. Generate ZIP File & Trigger Browser Download
    onProgress?.('Compacting ZIP package...');
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    onProgress?.('Download package ready ');
    const downloadUrl = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    }, 2000);

    return true;
  } catch (error) {
    console.error('Error generating CineVault download package:', error);
    // Fallback: trigger standalone branded HTML companion download
    downloadBrandedCompanionFile(movie, torrent);
    return true;
  }
}

/**
 * Universal Branded Download Trigger:
 * 1. Launches BitTorrent client (magnet: URI)
 * 2. Automatically delivers CineVault Branded Companion File (CineVault-Download-Info.html)
 *    so every single download from the site includes branding, photo, and website details.
 */
export function handleBrandedMagnetDownload(
  movie: Movie,
  torrent: Torrent,
  options?: {
    onStart?: () => void;
    autoCompanion?: boolean;
  }
): void {
  options?.onStart?.();

  const magnetUrl = buildMagnetLink(torrent.hash, movie.title_long || movie.title);

  // 1. Launch magnet link
  const magnetAnchor = document.createElement('a');
  magnetAnchor.href = magnetUrl;
  document.body.appendChild(magnetAnchor);
  magnetAnchor.click();
  setTimeout(() => {
    document.body.removeChild(magnetAnchor);
  }, 500);

  // 2. Automatically download the branded companion document if enabled (default true)
  if (options?.autoCompanion !== false) {
    setTimeout(() => {
      downloadBrandedCompanionFile(movie, torrent);
    }, 400);
  }
}
