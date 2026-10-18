import React from 'react';
import { X, Command, Search, Dices, Bookmark, Tv, Bot, Film, Sparkles } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerSearch?: () => void;
  onTriggerSpinner?: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Navigation',
    items: [
      { keys: ['S', '/'], description: 'Focus instant search bar', icon: Search },
      { keys: ['B', 'H'], description: 'Go to Browse Catalog (Home)', icon: Film },
      { keys: ['W'], description: 'Open Saved Watchlist', icon: Bookmark },
      { keys: ['T'], description: 'Browse TV Series Catalog', icon: Tv },
    ]
  },
  {
    title: 'Discovery & Tools',
    items: [
      { keys: ['R'], description: 'Movie Night Spinner (Random movie)', icon: Dices },
      { keys: ['C'], description: 'Open CineBot AI Concierge', icon: Bot },
      { keys: ['←', '→'], description: 'Previous / Next slide in Hero Banner' },
    ]
  },
  {
    title: 'Modals & Dialogs',
    items: [
      { keys: ['Esc'], description: 'Close any open modal or unfocus search' },
      { keys: ['?'], description: 'Toggle this keyboard shortcuts guide' },
    ]
  }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onTriggerSearch,
  onTriggerSpinner
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0e0e12] border border-white/15 rounded-3xl shadow-2xl overflow-hidden text-neutral-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
                Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-neutral-400">
                Navigate CineVault swiftly with your keyboard
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {section.title}
              </h3>

              <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                {section.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                        <span className="text-neutral-300 text-xs truncate">
                          {item.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {item.keys.map((key) => (
                          <kbd
                            key={key}
                            className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-mono font-bold text-white bg-neutral-800/90 border border-white/20 rounded-md shadow-inner"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick interactive test strip */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-400 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
            <span>Tip: Press <kbd className="px-1 text-[10px] font-mono bg-neutral-800 rounded border border-white/10">?</kbd> anywhere to open this cheatsheet.</span>
            <div className="flex items-center gap-2">
              {onTriggerSpinner && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTriggerSpinner();
                  }}
                  className="px-2.5 py-1 text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer font-semibold"
                >
                  Spin Now (R)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/[0.01] flex items-center justify-between text-[11px] text-neutral-400">
          <span>Shortcuts are disabled while editing search or form fields.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
