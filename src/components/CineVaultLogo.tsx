import React from 'react';

interface CineVaultLogoProps {
  variant?: 'full' | 'header' | 'footer' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const CineVaultEmblem: React.FC<{ size?: number; className?: string; idPrefix?: string }> = ({ className = '' }) => (
  <span aria-hidden="true" className={`hidden ${className}`} />
);

export const CineVaultBrowseIcon: React.FC<{ size?: number; className?: string }> = ({ className = '' }) => (
  <span aria-hidden="true" className={`hidden ${className}`} />
);

export const CineVaultLogo: React.FC<CineVaultLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showTagline = false
}) => {
  const sizeClass = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-2xl' }[size];
  const isCompact = variant === 'icon' || variant === 'badge';
  return (
    <span className={`inline-flex flex-col leading-none ${sizeClass} font-black tracking-tight text-white ${className}`}>
      <span>{isCompact ? 'CineVault' : 'CineVault'}</span>
      {showTagline && !isCompact && (
        <span className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-neutral-500">MOVIES BY SASUU</span>
      )}
    </span>
  );
};
