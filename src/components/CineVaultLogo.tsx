import React from 'react';

interface CineVaultLogoProps {
  variant?: 'full' | 'header' | 'footer' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

/**
 * CineVault Emblem: Metallic Red 'C' & 'V' with Chrome Film Reel and 35mm Film Ribbon
 * Rendered as pure scalable SVG with metallic chrome & crimson gradients for crisp display at all resolutions.
 */
export const CineVaultEmblem: React.FC<{ size?: number; className?: string; idPrefix?: string }> = ({
  size = 40,
  className = '',
  idPrefix = 'cv'
}) => {
  const cRedGrad = `${idPrefix}-red-grad`;
  const cRedLight = `${idPrefix}-red-light`;
  const cSilverGrad = `${idPrefix}-silver-grad`;
  const cSilverInner = `${idPrefix}-silver-inner`;
  const cRibbonGrad = `${idPrefix}-ribbon-grad`;
  const cGlow = `${idPrefix}-glow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-[0_2px_10px_rgba(229,9,20,0.35)] ${className}`}
    >
      <defs>
        {/* Red Metallic 3D Gradient */}
        <linearGradient id={cRedGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF3355" />
          <stop offset="35%" stopColor="#E50914" />
          <stop offset="75%" stopColor="#B30012" />
          <stop offset="100%" stopColor="#550009" />
        </linearGradient>

        {/* Specular Highlight for Red 3D Bevels */}
        <linearGradient id={cRedLight} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFA6B5" />
          <stop offset="40%" stopColor="#FF2644" />
          <stop offset="100%" stopColor="#80000D" />
        </linearGradient>

        {/* Chrome / Brushed Silver Metallic Gradient */}
        <linearGradient id={cSilverGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#E2E8F0" />
          <stop offset="55%" stopColor="#94A3B8" />
          <stop offset="85%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Dark Chrome Inner Shadow */}
        <radialGradient id={cSilverInner} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#94A3B8" />
          <stop offset="90%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>

        {/* Film Ribbon Gradient */}
        <linearGradient id={cRibbonGrad} x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="30%" stopColor="#0F172A" />
          <stop offset="70%" stopColor="#334155" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id={cGlow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#E50914" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Red Ambient Underglow */}
      <circle cx="58" cy="56" r="44" fill="#E50914" opacity="0.15" />

      {/* === OUTER METALLIC RED 'C' ARC === */}
      <path
        d="M 68 18 
           C 40 16, 20 34, 20 60 
           C 20 86, 40 102, 68 100 
           C 74 99.5, 78 98, 80 96 
           C 76 92, 70 88, 64 87 
           C 46 86, 33 74, 33 60 
           C 33 46, 46 32, 64 31 
           C 72 30.5, 76 26, 80 22 
           C 76 20, 72 18.5, 68 18 Z"
        fill={`url(#${cRedGrad})`}
        stroke="#FF5577"
        strokeWidth="1.2"
      />

      {/* 3D Bevel Highlight Edge on 'C' */}
      <path
        d="M 72 19.5 
           C 44 18, 23 35, 23 60 
           C 23 83, 42 98, 66 97"
        fill="none"
        stroke="#FFAAB8"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* === METALLIC RED 'V' WITH FILM SPROCKETS === */}
      {/* Left arm of V (nestled behind film reel) */}
      <path
        d="M 60 40 L 74 88 L 84 88 L 68 36 Z"
        fill={`url(#${cRedGrad})`}
        opacity="0.95"
      />

      {/* Right arm of V (filmstrip style with sprocket holes) */}
      <path
        d="M 74 88 L 94 30 L 108 30 L 84 88 Z"
        fill={`url(#${cRedGrad})`}
        stroke="#FF5577"
        strokeWidth="1"
      />

      {/* Specular edge on 'V' */}
      <path
        d="M 94 30 L 108 30 L 84 88"
        fill="none"
        stroke="#FFAAB8"
        strokeWidth="1.2"
        opacity="0.85"
      />

      {/* Film sprocket cutouts in the right arm of 'V' */}
      <g fill="#080808" stroke="#334155" strokeWidth="0.5">
        <rect x="94.5" y="36" width="7" height="4.5" rx="1" transform="rotate(-18 94.5 36)" />
        <rect x="90" y="46" width="7" height="4.5" rx="1" transform="rotate(-18 90 46)" />
        <rect x="85.5" y="56" width="7" height="4.5" rx="1" transform="rotate(-18 85.5 56)" />
        <rect x="81" y="66" width="7" height="4.5" rx="1" transform="rotate(-18 81 66)" />
        <rect x="76.5" y="76" width="7" height="4.5" rx="1" transform="rotate(-18 76.5 76)" />
      </g>

      {/* === 35MM CELLULOID FILM RIBBON ROLLING FORWARD === */}
      <path
        d="M 45 68 
           C 55 76, 68 84, 88 84 
           L 84 94 
           C 62 94, 48 86, 38 76 Z"
        fill={`url(#${cRibbonGrad})`}
        stroke="#64748B"
        strokeWidth="0.8"
      />
      {/* Sprocket holes on film ribbon */}
      <g fill="#050505">
        <rect x="44" y="72" width="2.5" height="3" rx="0.5" transform="rotate(20 44 72)" />
        <rect x="52" y="76" width="2.5" height="3" rx="0.5" transform="rotate(15 52 76)" />
        <rect x="61" y="79" width="2.5" height="3" rx="0.5" transform="rotate(10 61 79)" />
        <rect x="71" y="81" width="2.5" height="3" rx="0.5" transform="rotate(5 71 81)" />
        <rect x="80" y="82" width="2.5" height="3" rx="0.5" transform="rotate(0 80 82)" />

        {/* Bottom row sprockets */}
        <rect x="42" y="78" width="2.5" height="3" rx="0.5" transform="rotate(20 42 78)" />
        <rect x="50" y="82" width="2.5" height="3" rx="0.5" transform="rotate(15 50 82)" />
        <rect x="59" y="85" width="2.5" height="3" rx="0.5" transform="rotate(10 59 85)" />
        <rect x="69" y="87" width="2.5" height="3" rx="0.5" transform="rotate(5 69 87)" />
        <rect x="78" y="88" width="2.5" height="3" rx="0.5" transform="rotate(0 78 88)" />
      </g>
      {/* Frame separator lines on ribbon */}
      <line x1="56" y1="75" x2="54" y2="86" stroke="#94A3B8" strokeWidth="0.8" opacity="0.6" />
      <line x1="66" y1="78" x2="65" y2="89" stroke="#94A3B8" strokeWidth="0.8" opacity="0.6" />
      <line x1="76" y1="80" x2="75" y2="91" stroke="#94A3B8" strokeWidth="0.8" opacity="0.6" />

      {/* === CHROME METALLIC 6-HOLE FILM REEL === */}
      <g filter={`url(#${cGlow})`}>
        {/* Outer Reel Ring */}
        <circle
          cx="52"
          cy="50"
          r="23"
          fill={`url(#${cSilverGrad})`}
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />

        {/* Inner Groove Ring */}
        <circle
          cx="52"
          cy="50"
          r="20"
          fill={`url(#${cSilverInner})`}
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* 6 Circular Cutouts in Reel */}
        {/* 12 o'clock */}
        <circle cx="52" cy="37" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" strokeWidth="0.7" />
        {/* 2 o'clock */}
        <circle cx="63" cy="43.5" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" strokeWidth="0.7" />
        {/* 4 o'clock */}
        <circle cx="63" cy="56.5" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" strokeWidth="0.7" />
        {/* 6 o'clock */}
        <circle cx="52" cy="63" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" strokeWidth="0.7" />
        {/* 8 o'clock */}
        <circle cx="41" cy="56.5" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" strokeWidth="0.7" />
        {/* 10 o'clock */}
        <circle cx="41" cy="43.5" r="4.2" fill="#0A0A0A" stroke="#CBD5E1" strokeWidth="0.7" />

        {/* Central Chrome Spindle Hub */}
        <circle cx="52" cy="50" r="6" fill={`url(#${cSilverGrad})`} stroke="#FFFFFF" strokeWidth="0.8" />
        <circle cx="52" cy="50" r="2.4" fill="#0A0A0A" stroke="#94A3B8" strokeWidth="0.5" />

        {/* 5 Tiny Perforation Dots Around Center */}
        <circle cx="52" cy="46" r="0.8" fill="#0A0A0A" />
        <circle cx="55.8" cy="48.8" r="0.8" fill="#0A0A0A" />
        <circle cx="54.4" cy="53" r="0.8" fill="#0A0A0A" />
        <circle cx="49.6" cy="53" r="0.8" fill="#0A0A0A" />
        <circle cx="48.2" cy="48.8" r="0.8" fill="#0A0A0A" />

        {/* Top-left Gloss Glare on Reel */}
        <path
          d="M 37 38 C 42 32, 52 30, 62 34 C 54 33, 44 36, 37 38 Z"
          fill="#FFFFFF"
          opacity="0.8"
        />
      </g>
    </svg>
  );
};

/**
 * CineVault Browse / Taskbar Icon:
 * Distinct metallic ruby-red & silver cinematic icon designed specifically for crisp small-size rendering (14px to 24px)
 * in navigation bars, tabs, taskbars, and quick-access buttons.
 */
export const CineVaultBrowseIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="cv-browse-red" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#FF3B56" />
          <stop offset="60%" stopColor="#E50914" />
          <stop offset="100%" stopColor="#80000C" />
        </linearGradient>
        <linearGradient id="cv-browse-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Clapperboard Body with Metallic Red Glow */}
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="15"
        rx="3"
        fill="url(#cv-browse-red)"
        stroke="#FF6B81"
        strokeWidth="1"
      />

      {/* Top Clapper Striped Slate */}
      <path
        d="M 2.5 8.5 L 21.5 8.5"
        stroke="#0A0A0A"
        strokeWidth="1.2"
      />

      {/* Silver Diagonal Clapper Stripes */}
      <path
        d="M 6 5.5 L 4 8.5 M 10 5.5 L 8 8.5 M 14 5.5 L 12 8.5 M 18 5.5 L 16 8.5"
        stroke="url(#cv-browse-silver)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Center Cinematic Play Triangle in Beveled Silver */}
      <path
        d="M 10.5 11.5 L 15.5 14.5 L 10.5 17.5 Z"
        fill="url(#cv-browse-silver)"
        stroke="#FFFFFF"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Full CineVault By Sasuu Brand Logo Component:
 * - Includes Chrome 'CINE' + Ruby Red 'VAULT' with 3D metallic gradient styling.
 * - Flanked '— BY SASUU —' sub-title with red horizontal divider bars.
 * - Fits perfectly in header, footer, hero banners, and drawer panels.
 */
export const CineVaultLogo: React.FC<CineVaultLogoProps> = ({
  variant = 'header',
  size = 'md',
  className = '',
  showTagline = false
}) => {
  const emblemSizes = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64
  };

  const currentEmblemSize = emblemSizes[size] || 36;

  if (variant === 'icon') {
    return <CineVaultEmblem size={currentEmblemSize} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none group ${className}`}>
      {/* 3D Film Reel & 'CV' Metallic Red/Silver Emblem */}
      <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105">
        <CineVaultEmblem size={currentEmblemSize} />
      </div>

      {/* Cinematic Brand Typography: Chrome CINE + Red VAULT + BY SASUU */}
      <div className="flex flex-col justify-center leading-none">
        {/* Top Wordmark: CINE (Chrome) VAULT (Ruby Red) */}
        <div className="flex items-center tracking-tight font-black font-display text-base sm:text-lg md:text-xl">
          {/* Metallic Brushed Chrome "CINE" */}
          <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">
            CINE
          </span>
          {/* Metallic Glossy Crimson "VAULT" */}
          <span className="bg-gradient-to-b from-[#FF4D6D] via-[#E50914] to-[#800010] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(229,9,20,0.5)] tracking-wider">
            VAULT
          </span>
        </div>

        {/* Sub-Wordmark: — BY SASUU — */}
        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
          {/* Left Red Accent Line */}
          <span className="h-[1.5px] w-2 sm:w-3 bg-gradient-to-r from-transparent to-[#E50914] rounded-full" />
          
          <span className="text-[8px] sm:text-[9.5px] font-black tracking-[0.2em] uppercase text-neutral-300/90 font-mono">
            BY SASUU
          </span>

          {/* Right Red Accent Line */}
          <span className="h-[1.5px] w-2 sm:w-3 bg-gradient-to-l from-transparent to-[#E50914] rounded-full" />
        </div>

        {/* Optional Slogan */}
        {showTagline && (
          <div className="text-[7.5px] sm:text-[8.5px] text-neutral-400 font-bold uppercase tracking-[0.18em] mt-1 hidden sm:block">
            <span className="text-neutral-300">Your Vault. </span>
            <span className="text-[#FF3355]">Endless Movies.</span>
          </div>
        )}
      </div>
    </div>
  );
};
