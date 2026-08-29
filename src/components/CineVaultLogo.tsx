import React from 'react';

interface CineVaultLogoProps {
  variant?: 'full' | 'header' | 'footer' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

/**
 * CineVault brand logo. The logo is restored while the rest of the UI remains text-only.
 */
export const CineVaultEmblem: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => (
  <img
    src="/favicon.svg"
    width={size}
    height={size}
    alt="CineVault"
    className={`shrink-0 rounded-xl ${className}`}
  />
);

// Kept for compatibility with existing imports; the browse UI itself remains text-only.
export const CineVaultBrowseIcon: React.FC<{ size?: number; className?: string }> = () => null;

export const CineVaultLogo: React.FC<CineVaultLogoProps> = ({
  variant = 'header',
  size = 'md',
  className = '',
  showTagline = false
}) => {
  const emblemSizes = { sm: 28, md: 36, lg: 48, xl: 64 };
  const emblemSize = emblemSizes[size];

  if (variant === 'icon') {
    return <CineVaultEmblem size={emblemSize} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      <CineVaultEmblem size={emblemSize} />
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center tracking-tight font-black font-display text-base sm:text-lg md:text-xl">
          <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent tracking-wider">CINE</span>
          <span className="bg-gradient-to-b from-[#FF4D6D] via-[#E50914] to-[#800010] bg-clip-text text-transparent tracking-wider">VAULT</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
          <span className="h-[1.5px] w-2 sm:w-3 bg-gradient-to-r from-transparent to-[#E50914] rounded-full" />
          <span className="text-[8px] sm:text-[9.5px] font-black tracking-[0.2em] uppercase text-neutral-300/90 font-mono">BY SASUU</span>
          <span className="h-[1.5px] w-2 sm:w-3 bg-gradient-to-l from-transparent to-[#E50914] rounded-full" />
        </div>
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
