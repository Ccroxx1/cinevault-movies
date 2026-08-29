import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const baseProps = (size: number, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true
});

export const CopyIcon: React.FC<IconProps> = ({ size = 16, className = '', strokeWidth = 2 }) => (
  <svg {...baseProps(size, strokeWidth)} className={className}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const BookmarkPlusIcon: React.FC<IconProps> = ({ size = 16, className = '', strokeWidth = 2 }) => (
  <svg {...baseProps(size, strokeWidth)} className={className}>
    <path d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z" />
    <path d="M12 7v6M9 10h6" />
  </svg>
);

export const BookmarkIcon: React.FC<IconProps> = ({ size = 16, className = '', strokeWidth = 2 }) => (
  <svg {...baseProps(size, strokeWidth)} className={className}>
    <path d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z" />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 16, className = '', strokeWidth = 2 }) => (
  <svg {...baseProps(size, strokeWidth)} className={className}>
    <path d="m9 6 9 6-9 6V6Z" />
  </svg>
);
