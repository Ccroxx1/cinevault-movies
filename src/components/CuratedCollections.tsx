import React from 'react';
import { Award, Rocket, Flame, Skull, Trophy, ChevronRight } from 'lucide-react';
import { FilterParams } from '../types';

export interface MoodCollection {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
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
    icon: Trophy,
    accentColor: 'from-amber-600/30 to-amber-950/40 border-amber-500/40 text-amber-400',
    badge: '★ 8.5+ Rated',
    filters: {
      minimum_rating: 8.5,
      sort_by: 'rating',
      order_by: 'desc',
      genre: 'All',
      year: 'All',
      page: 1
    },
    previewImages: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578836537282-3171d77f8632?q=80&w=300&auto=format&fit=crop'
    ]
  },
  {
    id: 'sci-fi-odyssey',
    title: 'Mind-Bending Sci-Fi',
    subtitle: 'Cosmic journeys, multiverse twists, and dystopian futures',
    icon: Rocket,
    accentColor: 'from-cyan-600/30 to-blue-950/40 border-cyan-500/40 text-cyan-400',
    badge: 'Sci-Fi Universe',
    filters: {
      genre: 'Sci-Fi',
      minimum_rating: 7.5,
      sort_by: 'download_count',
      order_by: 'desc',
      page: 1
    },
    previewImages: [
      'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300&auto=format&fit=crop'
    ]
  },
  {
    id: 'cult-action-era',
    title: 'Golden Age Cult Action',
    subtitle: 'High-octane blockbusters & legendary explosions from the 90s & 2000s',
    icon: Flame,
    accentColor: 'from-rose-600/30 to-rose-950/40 border-rose-500/40 text-rose-400',
    badge: '1990 - 2005 Era',
    filters: {
      genre: 'Action',
      year: '1990-2005',
      minimum_rating: 7.0,
      sort_by: 'download_count',
      order_by: 'desc',
      page: 1
    },
    previewImages: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop'
    ]
  },
  {
    id: 'late-night-thrillers',
    title: 'Late Night Thriller & Horror',
    subtitle: 'Psychological tension, edge-of-your-seat suspense & supernatural dread',
    icon: Skull,
    accentColor: 'from-purple-600/30 to-purple-950/40 border-purple-500/40 text-purple-400',
    badge: 'Midnight Cinema',
    filters: {
      genre: 'Mystery',
      minimum_rating: 7.0,
      sort_by: 'seeds',
      order_by: 'desc',
      page: 1
    },
    previewImages: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=300&auto=format&fit=crop'
    ]
  },
  {
    id: 'oscar-award-winners',
    title: 'Award Season & Oscar Winners',
    subtitle: 'Captivating storytelling, best cinematography & profound performances',
    icon: Award,
    accentColor: 'from-emerald-600/30 to-emerald-950/40 border-emerald-500/40 text-emerald-400',
    badge: 'Award Winners',
    filters: {
      genre: 'Drama',
      minimum_rating: 8.0,
      sort_by: 'rating',
      order_by: 'desc',
      page: 1
    },
    previewImages: [
      'https://images.unsplash.com/photo-1578836537282-3171d77f8632?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop'
    ]
  }
];

interface CuratedCollectionsProps {
  onSelectCollection: (filters: Partial<FilterParams>, title: string) => void;
  activeCollectionId?: string | null;
}

export const CuratedCollections = React.memo<CuratedCollectionsProps>(({
  onSelectCollection,
  activeCollectionId
}) => {
  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-display font-black text-white flex items-center gap-2">
            Curated Mood Playlists & Collections
          </h2>
          <p className="text-xs text-neutral-400">
            Hand-picked thematic collections tuned for every cinematic mood
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {MOOD_COLLECTIONS.map((col) => {
          const Icon = col.icon;
          const isActive = activeCollectionId === col.id;

          return (
            <button
              key={col.id}
              onClick={() => onSelectCollection(col.filters, col.title)}
              className={`group text-left p-4 rounded-2xl bg-gradient-to-b ${col.accentColor} border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                isActive ? 'ring-2 ring-rose-500 shadow-rose-950/50' : 'hover:border-white/30'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white">
                    {col.badge}
                  </span>
                  <div className="p-1.5 rounded-lg bg-black/40 text-white group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="font-display font-bold text-sm sm:text-base text-white line-clamp-1 group-hover:text-rose-300 transition-colors">
                  {col.title}
                </h3>

                <p className="text-[11px] text-neutral-300/80 line-clamp-2 leading-relaxed">
                  {col.subtitle}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs font-semibold text-white/90 group-hover:text-white">
                <span className="flex items-center gap-1 text-[11px]">
                  <span>Explore Vault</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
});
