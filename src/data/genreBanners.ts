import { Movie } from '../types';
import { FALLBACK_FEATURED_MOVIES } from './fallbackMovies';

export interface GenreHeroConfig {
  genre: string;
  headline: string;
  tagline: string;
  badgeLabel: string;
  themeColor: {
    primaryText: string;
    accentBg: string;
    border: string;
    glow: string;
    buttonHover: string;
  };
  sampleMovieTitles: string[];
}

export const GENRE_HERO_CONFIGS: Record<string, GenreHeroConfig> = {
  Action: {
    genre: 'Action',
    headline: 'High-Octane Adrenaline & Kinetic Stunts',
    tagline: 'Peak visceral spectacles, relentless choreography, and unstoppable cinematic momentum.',
    badgeLabel: 'Action Cinema Spotlight',
    themeColor: {
      primaryText: 'text-rose-400',
      accentBg: 'bg-rose-600',
      border: 'border-rose-500/40',
      glow: 'shadow-rose-950/50',
      buttonHover: 'hover:bg-rose-500'
    },
    sampleMovieTitles: ['The Dark Knight', 'Dune: Part Two', 'Mad Max: Fury Road', 'John Wick']
  },
  'Sci-Fi': {
    genre: 'Sci-Fi',
    headline: 'Mind-Bending Realities & Cosmic Frontiers',
    tagline: 'Sprawling space epics, cerebral time paradoxes, and speculative worlds that expand human wonder.',
    badgeLabel: 'Sci-Fi Odyssey Spotlight',
    themeColor: {
      primaryText: 'text-cyan-400',
      accentBg: 'bg-cyan-600',
      border: 'border-cyan-500/40',
      glow: 'shadow-cyan-950/50',
      buttonHover: 'hover:bg-cyan-500'
    },
    sampleMovieTitles: ['Interstellar', 'Dune: Part Two', 'Inception', 'Blade Runner 2049']
  },
  Animation: {
    genre: 'Animation',
    headline: 'Artistry, Wonder & Boundless Imagination',
    tagline: 'Groundbreaking visual marvels, emotionally stirring journeys, and visionary universes crafted frame by frame.',
    badgeLabel: 'Animation Mastery Spotlight',
    themeColor: {
      primaryText: 'text-fuchsia-400',
      accentBg: 'bg-fuchsia-600',
      border: 'border-fuchsia-500/40',
      glow: 'shadow-fuchsia-950/50',
      buttonHover: 'hover:bg-fuchsia-500'
    },
    sampleMovieTitles: ['Spider-Man: Across the Spider-Verse', 'Spider-Man: Into the Spider-Verse', 'Coco', 'Spirited Away']
  },
  Horror: {
    genre: 'Horror',
    headline: 'Creeping Dread, Suspense & Visceral Terror',
    tagline: 'Psychological nightmares, supernatural hauntings, and tension that lingers long after the credits roll.',
    badgeLabel: 'Midnight Horror Spotlight',
    themeColor: {
      primaryText: 'text-red-500',
      accentBg: 'bg-red-700',
      border: 'border-red-600/40',
      glow: 'shadow-red-950/60',
      buttonHover: 'hover:bg-red-600'
    },
    sampleMovieTitles: ['Hereditary', 'The Shining', 'Alien', 'A Quiet Place']
  },
  Comedy: {
    genre: 'Comedy',
    headline: 'Sharp Wit, Clever Satire & Big Laughs',
    tagline: 'Impeccable comedic timing, idiosyncratic characters, and high-rewatchability masterpieces.',
    badgeLabel: 'Comedy Spotlight',
    themeColor: {
      primaryText: 'text-amber-400',
      accentBg: 'bg-amber-600',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-950/50',
      buttonHover: 'hover:bg-amber-500'
    },
    sampleMovieTitles: ['The Grand Budapest Hotel', 'Knives Out', 'Superbad', 'Deadpool']
  },
  Drama: {
    genre: 'Drama',
    headline: 'Profound Storytelling & Transcendent Acting',
    tagline: 'Gripping character studies, moral conflicts, and human triumphs celebrated by generations of cinephiles.',
    badgeLabel: 'Prestige Drama Spotlight',
    themeColor: {
      primaryText: 'text-emerald-400',
      accentBg: 'bg-emerald-600',
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-950/50',
      buttonHover: 'hover:bg-emerald-500'
    },
    sampleMovieTitles: ['Oppenheimer', 'The Dark Knight', 'Interstellar', 'The Shawshank Redemption']
  },
  Adventure: {
    genre: 'Adventure',
    headline: 'Epic Quests & Untamed Expeditions',
    tagline: 'Journey into uncharted realms, perilous treasure hunts, and legendary sagas across mythical horizons.',
    badgeLabel: 'Adventure Saga Spotlight',
    themeColor: {
      primaryText: 'text-teal-400',
      accentBg: 'bg-teal-600',
      border: 'border-teal-500/40',
      glow: 'shadow-teal-950/50',
      buttonHover: 'hover:bg-teal-500'
    },
    sampleMovieTitles: ['Dune: Part Two', 'Interstellar', 'The Grand Budapest Hotel', 'The Lord of the Rings']
  },
  Crime: {
    genre: 'Crime',
    headline: 'Underworld Syndicates & High-Stakes Heists',
    tagline: 'Moody crime syndicates, morally grey detectives, and calculating cat-and-mouse criminal sagas.',
    badgeLabel: 'Crime & Noir Spotlight',
    themeColor: {
      primaryText: 'text-yellow-400',
      accentBg: 'bg-yellow-600',
      border: 'border-yellow-500/40',
      glow: 'shadow-yellow-950/50',
      buttonHover: 'hover:bg-yellow-500'
    },
    sampleMovieTitles: ['The Dark Knight', 'The Grand Budapest Hotel', 'Pulp Fiction', 'The Godfather']
  },
  Mystery: {
    genre: 'Mystery',
    headline: 'Cryptic Enigmas & Intricate Twists',
    tagline: 'Puzzle-box narratives, unreliable narrators, and unexpected revelations that keep you guessing.',
    badgeLabel: 'Mystery Vault Spotlight',
    themeColor: {
      primaryText: 'text-indigo-400',
      accentBg: 'bg-indigo-600',
      border: 'border-indigo-500/40',
      glow: 'shadow-indigo-950/50',
      buttonHover: 'hover:bg-indigo-500'
    },
    sampleMovieTitles: ['Hereditary', 'Shutter Island', 'Memento', 'Prisoners']
  },
  Fantasy: {
    genre: 'Fantasy',
    headline: 'Mythical Realms, Magic & Timeless Epics',
    tagline: 'Enchanted worlds, ancient lore, and mythical heroes clashing against dark forces of destiny.',
    badgeLabel: 'Fantasy Realm Spotlight',
    themeColor: {
      primaryText: 'text-purple-400',
      accentBg: 'bg-purple-600',
      border: 'border-purple-500/40',
      glow: 'shadow-purple-950/50',
      buttonHover: 'hover:bg-purple-500'
    },
    sampleMovieTitles: ['Coco', 'Dune: Part Two', 'The Lord of the Rings', 'Pan\'s Labyrinth']
  },
  Thriller: {
    genre: 'Thriller',
    headline: 'Relentless Suspense & Psychological Tension',
    tagline: 'Heart-pounding pacing, razor-sharp stakes, and breathless countdowns where every second counts.',
    badgeLabel: 'Edge-of-Your-Seat Thrillers',
    themeColor: {
      primaryText: 'text-rose-400',
      accentBg: 'bg-rose-600',
      border: 'border-rose-500/40',
      glow: 'shadow-rose-950/50',
      buttonHover: 'hover:bg-rose-500'
    },
    sampleMovieTitles: ['The Dark Knight', 'Hereditary', 'Oppenheimer', 'Prisoners']
  },
  Romance: {
    genre: 'Romance',
    headline: 'Poetic Passion, Chemistry & Heartfelt Longing',
    tagline: 'Electric connections, bitter-sweet reunions, and timeless love stories rendered with sublime emotional depth.',
    badgeLabel: 'Romantic Cinema Spotlight',
    themeColor: {
      primaryText: 'text-pink-400',
      accentBg: 'bg-pink-600',
      border: 'border-pink-500/40',
      glow: 'shadow-pink-950/50',
      buttonHover: 'hover:bg-pink-500'
    },
    sampleMovieTitles: ['La La Land', 'Before Sunrise', 'Past Lives', 'Pride & Prejudice']
  },
  Biography: {
    genre: 'Biography',
    headline: 'Extraordinary Lives, Visionaries & Icons',
    tagline: 'The triumphs, obsessions, and controversies of history’s most influential architects and pioneers.',
    badgeLabel: 'Biographical Epic Spotlight',
    themeColor: {
      primaryText: 'text-amber-300',
      accentBg: 'bg-amber-600',
      border: 'border-amber-400/40',
      glow: 'shadow-amber-950/50',
      buttonHover: 'hover:bg-amber-500'
    },
    sampleMovieTitles: ['Oppenheimer', 'The Wolf of Wall Street', 'The Social Network', 'Schindler\'s List']
  },
  History: {
    genre: 'History',
    headline: 'Pivotal Eras, Epochs & Historic Turning Points',
    tagline: 'Monumental battles, royal intrigue, and historical chapters brought to life with lavish period authenticity.',
    badgeLabel: 'Historical Chronicle Spotlight',
    themeColor: {
      primaryText: 'text-orange-400',
      accentBg: 'bg-orange-600',
      border: 'border-orange-500/40',
      glow: 'shadow-orange-950/50',
      buttonHover: 'hover:bg-orange-500'
    },
    sampleMovieTitles: ['Oppenheimer', 'Gladiator', 'Schindler\'s List', '1917']
  },
  War: {
    genre: 'War',
    headline: 'Frontline Courage, Sacrifice & Epic Conflicts',
    tagline: 'Visceral battlegrounds, harrowing brotherly bonds, and the human cost of legendary wartime campaigns.',
    badgeLabel: 'War & Conflict Spotlight',
    themeColor: {
      primaryText: 'text-stone-300',
      accentBg: 'bg-stone-700',
      border: 'border-stone-500/40',
      glow: 'shadow-stone-950/50',
      buttonHover: 'hover:bg-stone-600'
    },
    sampleMovieTitles: ['1917', 'Saving Private Ryan', 'Apocalypse Now', 'Dunkirk']
  },
  Western: {
    genre: 'Western',
    headline: 'Outlaws, Frontier Grit & Sunset Duels',
    tagline: 'Dusty frontier saloons, bounty hunters, and lone drifters facing harsh justice on the untamed border.',
    badgeLabel: 'Wild West Spotlight',
    themeColor: {
      primaryText: 'text-amber-500',
      accentBg: 'bg-amber-700',
      border: 'border-amber-600/40',
      glow: 'shadow-amber-950/50',
      buttonHover: 'hover:bg-amber-600'
    },
    sampleMovieTitles: ['Django Unchained', 'The Good, the Bad and the Ugly', 'No Country for Old Men', 'Unforgiven']
  },
  Documentary: {
    genre: 'Documentary',
    headline: 'Real Revelations, Earth Wonders & Untold Truths',
    tagline: 'Breathtaking natural expeditions, investigative revelations, and profound real-world human journeys.',
    badgeLabel: 'Documentary Showcase',
    themeColor: {
      primaryText: 'text-sky-400',
      accentBg: 'bg-sky-600',
      border: 'border-sky-500/40',
      glow: 'shadow-sky-950/50',
      buttonHover: 'hover:bg-sky-500'
    },
    sampleMovieTitles: ['Planet Earth', 'Free Solo', 'Won\'t You Be My Neighbor?', 'Apollo 11']
  },
  Music: {
    genre: 'Music',
    headline: 'Symphonies, Rhythms & Sonic Brilliance',
    tagline: 'The passion, obsession, and transformative resonance of legendary performers and musical geniuses.',
    badgeLabel: 'Music & Symphony Spotlight',
    themeColor: {
      primaryText: 'text-violet-400',
      accentBg: 'bg-violet-600',
      border: 'border-violet-500/40',
      glow: 'shadow-violet-950/50',
      buttonHover: 'hover:bg-violet-500'
    },
    sampleMovieTitles: ['Coco', 'Whiplash', 'Bohemian Rhapsody', 'Amadeus']
  },
  Musical: {
    genre: 'Musical',
    headline: 'Dazzling Choreography & Showstopping Numbers',
    tagline: 'Glorious musical theater, show-stopping ensemble routines, and infectious Broadway grandeur.',
    badgeLabel: 'Musical Spectacular Spotlight',
    themeColor: {
      primaryText: 'text-rose-300',
      accentBg: 'bg-rose-500',
      border: 'border-rose-400/40',
      glow: 'shadow-rose-950/50',
      buttonHover: 'hover:bg-rose-400'
    },
    sampleMovieTitles: ['La La Land', 'The Sound of Music', 'Singin\' in the Rain', 'West Side Story']
  },
  Sport: {
    genre: 'Sport',
    headline: 'Underdogs, Glory & High-Stakes Rivalries',
    tagline: 'The sweat, heartbreak, and triumphant glory of athletes pushing beyond human limits.',
    badgeLabel: 'Sports Glory Spotlight',
    themeColor: {
      primaryText: 'text-lime-400',
      accentBg: 'bg-lime-600',
      border: 'border-lime-500/40',
      glow: 'shadow-lime-950/50',
      buttonHover: 'hover:bg-lime-500'
    },
    sampleMovieTitles: ['Ford v Ferrari', 'Rush', 'Creed', 'Moneyball']
  },
  Family: {
    genre: 'Family',
    headline: 'Heartfelt Adventures For All Generations',
    tagline: 'Enchanting stories of courage, laughter, and heartwarming companionship that bring loved ones together.',
    badgeLabel: 'Family Cinema Spotlight',
    themeColor: {
      primaryText: 'text-yellow-300',
      accentBg: 'bg-yellow-500',
      border: 'border-yellow-400/40',
      glow: 'shadow-yellow-950/50',
      buttonHover: 'hover:bg-yellow-400'
    },
    sampleMovieTitles: ['Coco', 'Spider-Man: Into the Spider-Verse', 'Paddington 2', 'The Lion King']
  },
  'Film-Noir': {
    genre: 'Film-Noir',
    headline: 'Venetian Blinds, Rain & Cynical Shadows',
    tagline: 'Femmes fatales, hardboiled investigators, and moral corruption steeped in atmospheric black-and-white contrast.',
    badgeLabel: 'Film-Noir Vault Spotlight',
    themeColor: {
      primaryText: 'text-slate-300',
      accentBg: 'bg-slate-700',
      border: 'border-slate-500/40',
      glow: 'shadow-slate-950/50',
      buttonHover: 'hover:bg-slate-600'
    },
    sampleMovieTitles: ['Chinatown', 'The Maltese Falcon', 'Sunset Boulevard', 'L.A. Confidential']
  }
};

/**
 * Helper to get the genre configuration or default fallback
 */
export function getGenreHeroConfig(genre?: string): GenreHeroConfig {
  if (genre && GENRE_HERO_CONFIGS[genre]) {
    return GENRE_HERO_CONFIGS[genre];
  }
  return {
    genre: 'All',
    headline: 'Curated Cinematic Masterpieces & 4K Torrents',
    tagline: 'Stream official trailers, inspect IMDb verified ratings, and download high-bitrate torrents with zero friction.',
    badgeLabel: 'Spotlight Masterpiece',
    themeColor: {
      primaryText: 'text-rose-400',
      accentBg: 'bg-rose-600',
      border: 'border-rose-500/40',
      glow: 'shadow-rose-950/50',
      buttonHover: 'hover:bg-rose-500'
    },
    sampleMovieTitles: ['Dune: Part Two', 'Oppenheimer', 'Interstellar', 'The Dark Knight']
  };
}

/**
 * Selects and orders movies matching a specific genre from available candidate pools
 */
export function getHeroMoviesForGenre(
  selectedGenre: string,
  catalogMovies: Movie[] = [],
  featuredMovies: Movie[] = []
): Movie[] {
  const normGenre = (selectedGenre || 'All').trim().toLowerCase();

  // Combine both pools, avoiding duplicates
  const combinedMap = new Map<number, Movie>();
  [...catalogMovies, ...featuredMovies, ...FALLBACK_FEATURED_MOVIES].forEach((m) => {
    if (m && m.id && m.title) {
      combinedMap.set(m.id, m);
    }
  });

  const allMovies = Array.from(combinedMap.values());

  if (normGenre === 'all' || normGenre === '') {
    // Return all sorted by quality / downloads
    return allMovies.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
  }

  // Filter strictly or partially by genre
  const genreMatches = allMovies.filter((m) =>
    Array.isArray(m.genres) && m.genres.some((g) => g.toLowerCase() === normGenre)
  );

  if (genreMatches.length > 0) {
    // Sort highest rating and highest download count
    return genreMatches.sort((a, b) => {
      const scoreA = (a.rating || 0) * 100000 + (a.download_count || 0);
      const scoreB = (b.rating || 0) * 100000 + (b.download_count || 0);
      return scoreB - scoreA;
    });
  }

  // Fallback: return top rated movies
  return allMovies.slice(0, 10);
}
