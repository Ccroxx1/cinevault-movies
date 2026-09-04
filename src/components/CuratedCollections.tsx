import React from 'react';
import { FilterParams } from '../types';

export interface MoodCollection {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
  badge: string;
  filters: Partial<FilterParams>;
  previewImages: string[];
}

export const MOOD_COLLECTIONS: MoodCollection[] = [
  {
    id: 'imdb-top-vault',
    title: 'IMDb Top Rated Classics',
    subtitle: 'Critically acclaimed masterworks with IMDb ratings 8.5+',
    accentColor: 'from-amber-600/30 to-amber-950/40 border-amber-500/40 text-amber-400',
    badge: ' 8.5+ Rated',
    filters: { minimum_rating: 8.5, sort_by: 'rating', order_by: 'desc', genre: 'All', year: 'All', page: 1 },
    previewImages: []
  },
  {
    id: 'sci-fi-odyssey',
    title: 'Mind-Bending Sci-Fi',
    subtitle: 'Cosmic journeys, multiverse twists, and dystopian futures',
    accentColor: 'from-cyan-600/30 to-blue-950/40 border-cyan-500/40 text-cyan-400',
    badge: 'Sci-Fi Universe',
    filters: { genre: 'Sci-Fi', minimum_rating: 7.5, sort_by: 'download_count', order_by: 'desc', page: 1 },
    previewImages: []
  },
  {
    id: 'cult-action-era',
    title: 'Golden Age Cult Action',
    subtitle: 'High-octane blockbusters and legendary explosions from the 90s & 2000s',
    accentColor: 'from-rose-600/30 to-rose-950/40 border-rose-500/40 text-rose-400',
    badge: '1990 - 2005 Era',
    filters: { genre: 'Action', year: '1990-2005', minimum_rating: 7.0, sort_by: 'download_count', order_by: 'desc', page: 1 },
    previewImages: []
  },
  {
    id: 'late-night-thrillers',
    title: 'Late Night Thriller & Horror',
    subtitle: 'Psychological tension, edge-of-your-seat suspense & supernatural dread',
    accentColor: 'from-purple-600/30 to-purple-950/40 border-purple-500/40 text-purple-400',
    badge: 'Midnight Cinema',
    filters: { genre: 'Mystery', minimum_rating: 7.0, sort_by: 'seeds', order_by: 'desc', page: 1 },
    previewImages: []
  },
  {
    id: 'oscar-award-winners',
    title: 'Award Season & Oscar Winners',
    subtitle: 'Captivating storytelling, best cinematography & profound performances',
    accentColor: 'from-emerald-600/30 to-emerald-950/40 border-emerald-500/40 text-emerald-400',
    badge: 'Award Winners',
    filters: { genre: 'Drama', minimum_rating: 8.0, sort_by: 'rating', order_by: 'desc', page: 1 },
    previewImages: []
  }
];

interface CuratedCollectionsProps {
  onSelectCollection: (filters: Partial<FilterParams>, title: string) => void;
  activeCollectionId?: string | null;
}

export const CuratedCollections: React.FC<CuratedCollectionsProps> = ({
  onSelectCollection,
  activeCollectionId
}) => {
  return (
    <section className="space-y-4 pt-2" aria-labelledby="collections-heading">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="collections-heading" className="text-lg sm:text-xl font-display font-black text-white">
            Curated Mood Playlists & Collections
          </h2>
          <p className="text-xs text-neutral-400">
            Hand-picked thematic collections tuned for every cinematic mood
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {MOOD_COLLECTIONS.map((col) => {
          const isActive = activeCollectionId === col.id;
          return (
            <button
              key={col.id}
              onClick={() => onSelectCollection(col.filters, col.title)}
              className={`group text-left p-4 rounded-2xl bg-gradient-to-b ${col.accentColor} border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between cursor-pointer overflow-hidden ${isActive ? 'ring-2 ring-rose-500' : 'hover:border-white/30'}`}
            >
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-white">
                  {col.badge}
                </span>
                <h3 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-rose-300 transition-colors">
                  {col.title}
                </h3>
                <p className="text-[11px] text-neutral-300/80 line-clamp-2 leading-relaxed">
                  {col.subtitle}
                </p>
              </div>
              <div className="pt-4 flex items-center justify-between text-xs font-semibold text-white/90">
                <span className="text-[11px]">Explore Vault</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
