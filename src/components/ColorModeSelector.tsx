import React, { useState, useRef, useEffect } from 'react';
import { useTheme, COLOR_MODES } from '../context/ThemeContext';
import { ColorMode } from '../types';
import { Palette, Check, Moon, Sun, Sparkles } from 'lucide-react';

interface ColorModeSelectorProps {
  variant?: 'dropdown' | 'inline' | 'compact';
  className?: string;
}

export const ColorModeSelector: React.FC<ColorModeSelectorProps> = ({
  variant = 'dropdown',
  className = ''
}) => {
  const { colorMode, setColorMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getModeIcon = (mode: ColorMode, size = 15) => {
    switch (mode) {
      case 'white':
        return <Sun size={size} className="cv-rating" />;
      case 'blue-black':
        return <Sparkles size={size} className="text-sky-400" />;
      case 'black':
      default:
        return <Moon size={size} className="text-rose-400" />;
    }
  };

  const currentConfig = COLOR_MODES.find((m) => m.id === colorMode) || COLOR_MODES[0];

  // Inline variant for mobile menu drawer or settings panels
  if (variant === 'inline') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider cv-text-muted flex items-center gap-1.5">
            <Palette size={13} />
            <span>Color Mode</span>
          </span>
          <span className="text-[11px] font-mono cv-text-accent font-semibold">
            {currentConfig.name}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_MODES.map((mode) => {
            const isActive = colorMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setColorMode(mode.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-colors cursor-pointer select-none text-center ${
                  isActive
                    ? 'cv-nav-soft-active shadow-xs'
                    : 'cv-btn-secondary'
                }`}
                title={mode.tagline}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={`w-3.5 h-3.5 rounded-full ${mode.dotColor}`} />
                  {getModeIcon(mode.id, 14)}
                </div>
                <span className="text-xs font-bold leading-none">{mode.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Dropdown variant for header
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer select-none ${
          isOpen
            ? 'cv-nav-soft-active shadow-xs'
            : 'cv-btn-secondary'
        }`}
        title={`Current color mode: ${currentConfig.name}. Click to change theme.`}
        aria-label={`Color Mode: ${currentConfig.name}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`hidden sm:inline-block w-2.5 h-2.5 rounded-full ${currentConfig.dotColor}`} />
          {getModeIcon(colorMode, 14)}
          <span className="hidden sm:inline font-medium capitalize">{currentConfig.name}</span>
        </div>
      </button>

      {isOpen && (
        <div
          className="cv-surface-elevated absolute top-full right-0 mt-2 w-56 p-2 border rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-2.5 py-1.5 mb-1 border-b cv-border flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider cv-text-muted flex items-center gap-1.5">
              <Palette size={12} />
              <span>Theme Mode</span>
            </span>
          </div>

          <div className="space-y-1">
            {COLOR_MODES.map((mode) => {
              const isSelected = colorMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setColorMode(mode.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'cv-nav-soft-active font-bold'
                      : 'cv-nav-pill'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3.5 h-3.5 rounded-full ${mode.dotColor}`} />
                    <div className="flex flex-col">
                      <span>{mode.name}</span>
                      <span className="text-[10px] cv-text-muted font-normal">{mode.tagline}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={15} className="cv-text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
