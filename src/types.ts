export interface Torrent {
  url: string;
  hash: string;
  quality: string;
  type: string;
  is_repack?: string;
  video_codec: string;
  bit_depth: string;
  audio_channels: string;
  seeds: number;
  peers: number;
  size: string;
  size_bytes: number;
  date_uploaded: string;
  date_uploaded_unix: number;
}

export interface CastMember {
  name: string;
  character_name: string;
  url_small_image?: string;
  imdb_code?: string;
}

export interface Movie {
  id: number;
  url: string;
  imdb_code: string;
  title: string;
  title_english: string;
  title_long: string;
  slug: string;
  year: number;
  rating: number;
  runtime: number;
  genres: string[];
  summary: string;
  description_full: string;
  synopsis?: string;
  description_intro?: string;
  yt_trailer_code: string;
  language: string;
  mpa_rating: string;
  background_image: string;
  background_image_original: string;
  small_cover_image: string;
  medium_cover_image: string;
  large_cover_image: string;
  state?: string;
  torrents: Torrent[];
  date_uploaded: string;
  date_uploaded_unix: number;
  like_count?: number;
  download_count?: number;
  cast?: CastMember[];
  medium_screenshot_image1?: string;
  medium_screenshot_image2?: string;
  medium_screenshot_image3?: string;
  large_screenshot_image1?: string;
  large_screenshot_image2?: string;
  large_screenshot_image3?: string;
}

export interface ParentalGuide {
  type: string;
  parental_guide_text?: string;
  severity?: string;
}

export interface FilterParams {
  query_term: string;
  quality: string;
  genre: string;
  minimum_rating: number;
  year?: string;
  min_year?: number;
  max_year?: number;
  decade?: string;
  runtime_bracket?: string; // 'all' | 'short' (<90m) | 'medium' (90-120m) | 'long' (120-150m) | 'epic' (150m+)
  codec?: string; // 'all' | 'x264' | 'x265' | 'surround' | '4k'
  audio?: string; // 'all' | '5.1' | '7.1'
  language?: string;
  sort_by: string;
  order_by: 'desc' | 'asc';
  page: number;
  limit: number;
}

export interface SwarmHealth {
  status: 'blazing' | 'healthy' | 'moderate' | 'low';
  label: string;
  badgeClass: string;
  description: string;
  ratio: number;
}

export function getSwarmHealth(seeds: number, peers: number): SwarmHealth {
  const safeSeeds = Number(seeds) || 0;
  const safePeers = Number(peers) || 0;
  const ratio = safePeers > 0 ? Number((safeSeeds / safePeers).toFixed(2)) : safeSeeds > 0 ? safeSeeds : 0;

  if (safeSeeds >= 50 || (safeSeeds >= 20 && safePeers > 0 && ratio >= 1.2)) {
    return {
      status: 'blazing',
      label: 'Blazing Fast',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      description: 'High-speed throughput with robust active swarm',
      ratio,
    };
  } else if (safeSeeds >= 15 || ratio >= 0.8) {
    return {
      status: 'healthy',
      label: 'Healthy Swarm',
      badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      description: 'Strong swarm with steady sustained download speed',
      ratio,
    };
  } else if (safeSeeds >= 4) {
    return {
      status: 'moderate',
      label: 'Active Swarm',
      badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      description: 'Active swarm with stable availability',
      ratio,
    };
  } else {
    return {
      status: 'low',
      label: 'DHT Available',
      badgeClass: 'bg-white/[0.04] text-neutral-300 border-white/10',
      description: 'Distributed DHT swarm; connects to seeders upon client start',
      ratio,
    };
  }
}

export function calculateEstimatedDownloadTime(sizeBytes: number, speedMbps: number): string {
  if (!sizeBytes || sizeBytes <= 0) return 'Instant';
  // speedMbps is Megabits per sec (Mbps). 1 Byte = 8 bits.
  // Bytes per sec = (speedMbps * 1,000,000) / 8
  const bytesPerSec = (speedMbps * 1000000) / 8;
  const totalSeconds = Math.ceil(sizeBytes / bytesPerSec);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export interface MovieApiResponse {
  status: string;
  status_message: string;
  data: {
    movie_count: number;
    limit: number;
    page_number: number;
    movies?: Movie[];
    movie?: Movie;
    parent_guides?: ParentalGuide[];
  };
}

export const RECOMMENDED_TRACKERS = [
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://glotorrents.pw:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://open.stealth.si:80/announce',
  'udp://p4p.arenabg.com:1337',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.moeking.me:6969/announce'
];

export function buildMagnetLink(torrentHash: string, movieTitle: string): string {
  const encodedName = encodeURIComponent(movieTitle);
  const trackersQuery = RECOMMENDED_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('');
  return `magnet:?xt=urn:btih:${torrentHash}&dn=${encodedName}${trackersQuery}`;
}

export type ColorMode = 'black' | 'white' | 'blue-black';

export interface CineBotMovieSuggestion {
  title: string;
  year?: number;
  reason: string;
  searchTerm?: string;
  movieData?: Movie;
}

export interface CineBotShowSuggestion {
  title: string;
  year?: number | string;
  reason: string;
  searchTerm?: string;
  imdb_code?: string;
  showData?: TvShowInfo;
}

export interface CineBotRecommendedFilters {
  genre?: string | null;
  minimum_rating?: number | null;
  decade?: string | null;
  quality?: string | null;
  format?: 'movie' | 'tv' | 'all' | null;
}

export interface CineBotMessage {
  id: string;
  sender: 'user' | 'cinebot';
  text: string;
  timestamp: number;
  suggestedMovies?: CineBotMovieSuggestion[];
  suggestedShows?: CineBotShowSuggestion[];
  recommendedFilters?: CineBotRecommendedFilters;
  followUpSuggestions?: string[];
  source?: string;
}

// TV Show Metadata
export interface TvShowInfo {
  id?: number;
  name: string;
  imdb_code: string;
  imdb_id: string;
  year?: string;
  rating?: number;
  image?: string;
  summary?: string;
  genres?: string[];
  network?: string;
}

export interface TvCastMember {
  person: {
    id: number;
    name: string;
    image?: { medium?: string; original?: string } | null;
  };
  character: {
    id: number;
    name: string;
    image?: { medium?: string; original?: string } | null;
  };
}

export interface TvEpisode {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate?: string;
  runtime?: number;
  image?: { medium?: string; original?: string } | null;
  summary?: string;
}

export interface TvShowDetails extends TvShowInfo {
  status?: string;
  runtime?: number;
  averageRuntime?: number;
  premiered?: string;
  ended?: string;
  officialSite?: string;
  type?: string;
  language?: string;
  cast?: TvCastMember[];
  episodes?: TvEpisode[];
  backdropImage?: string;
}

// EZTV API Types (https://eztvx.to/api/get-torrents)
export interface EztvTorrent {
  id: number;
  hash: string;
  filename: string;
  episode_url?: string;
  torrent_url?: string;
  magnet_url: string;
  title: string;
  imdb_id: string;
  season: string;
  episode: string;
  small_screenshot?: string;
  large_screenshot?: string;
  poster_url?: string;
  seeds: number;
  peers: number;
  date_released_unix: number;
  size_bytes: string | number;
  clean_title?: string;
  genres?: string[];
}

export interface EztvApiResponse {
  status?: string;
  imdb_id?: string;
  resolved_title?: string;
  show_meta?: TvShowInfo | null;
  torrents_count: number;
  limit: number;
  page: number;
  torrents: EztvTorrent[];
  status_message?: string;
  message?: string;
}

