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
  language?: string;
  sort_by: string;
  order_by: 'desc' | 'asc';
  page: number;
  limit: number;
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
