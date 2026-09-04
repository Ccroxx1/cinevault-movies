import React, { createContext, useContext, useState, useEffect } from 'react';
import { ColorMode } from '../types';

interface ThemeContextType {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const COLOR_MODES: {
  id: ColorMode;
  name: string;
  tagline: string;
  accentHex: string;
  bgHex: string;
  dotColor: string;
}[] = [
  {
    id: 'black',
    name: 'Black',
    tagline: 'OLED / Deep Cinema Black',
    accentHex: '#E50914',
    bgHex: '#050505',
    dotColor: 'bg-black border border-white/40'
  },
  {
    id: 'white',
    name: 'White',
    tagline: 'High-Contrast Bright Light',
    accentHex: '#E11D48',
    bgHex: '#F8FAFC',
    dotColor: 'bg-white border border-neutral-300 shadow-sm'
  },
  {
    id: 'blue-black',
    name: 'Blue-Black',
    tagline: 'Midnight Navy Atmosphere',
    accentHex: '#38BDF8',
    bgHex: '#060B17',
    dotColor: 'bg-[#060B17] border border-sky-400'
  }
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    try {
      const saved = localStorage.getItem('cinevault_color_mode') as ColorMode | null;
      if (saved && (saved === 'black' || saved === 'white' || saved === 'blue-black')) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'black';
  });

  const setColorMode = (mode: ColorMode) => {
    setColorModeState(mode);
    try {
      localStorage.setItem('cinevault_color_mode', mode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', colorMode);

    // Sync classList for Tailwind / dark mode support
    root.classList.remove('theme-black', 'theme-white', 'theme-blue-black', 'dark', 'light');

    if (colorMode === 'white') {
      root.classList.add('light', 'theme-white');
    } else if (colorMode === 'blue-black') {
      root.classList.add('dark', 'theme-blue-black');
    } else {
      root.classList.add('dark', 'theme-black');
    }

    // Sync meta theme-color for mobile address bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (colorMode === 'white') {
        metaThemeColor.setAttribute('content', '#ffffff');
      } else if (colorMode === 'blue-black') {
        metaThemeColor.setAttribute('content', '#060B17');
      } else {
        metaThemeColor.setAttribute('content', '#050505');
      }
    }
  }, [colorMode]);

  return (
    <ThemeContext.Provider value={{ colorMode, setColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
