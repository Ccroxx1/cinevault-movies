import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 rounded-xl bg-amber-800 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-amber-400/50"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>Offline Mode — Using cached library data & saved watchlist.</span>
    </div>
  );
};
