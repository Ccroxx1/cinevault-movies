import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie } from '../types';

interface MovieComparisonContextType {
  comparisonList: Movie[];
  addToComparison: (movie: Movie) => boolean;
  removeFromComparison: (movieId: number) => void;
  clearComparison: () => void;
  isInComparison: (movieId: number) => boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const MovieComparisonContext = createContext<MovieComparisonContextType | undefined>(undefined);

const STORAGE_KEY = 'cinevault_comparison_list';

export const MovieComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [comparisonList, setComparisonList] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparisonList));
    } catch {}
  }, [comparisonList]);

  const addToComparison = (movie: Movie): boolean => {
    if (comparisonList.some((m) => m.id === movie.id)) {
      return true; // already in
    }
    if (comparisonList.length >= 3) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cinevault_toast', {
            detail: {
              type: 'info',
              title: 'Comparison Limit Reached',
              description: 'You can compare up to 3 movies side-by-side. Please remove one first.',
            },
          })
        );
      }
      return false;
    }
    setComparisonList((prev) => [...prev, movie]);
    return true;
  };

  const removeFromComparison = (movieId: number) => {
    setComparisonList((prev) => prev.filter((m) => m.id !== movieId));
  };

  const clearComparison = () => {
    setComparisonList([]);
  };

  const isInComparison = (movieId: number) => {
    return comparisonList.some((m) => m.id === movieId);
  };

  return (
    <MovieComparisonContext.Provider
      value={{
        comparisonList,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isInComparison,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </MovieComparisonContext.Provider>
  );
};

const defaultContext: MovieComparisonContextType = {
  comparisonList: [],
  addToComparison: () => false,
  removeFromComparison: () => {},
  clearComparison: () => {},
  isInComparison: () => false,
  isOpen: false,
  setIsOpen: () => {},
};

export function useMovieComparison() {
  const context = useContext(MovieComparisonContext);
  return context || defaultContext;
}
