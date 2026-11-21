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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-dialog-surface cv-surface-elevated border relative w-full max-w-lg rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b cv-border cv-surface-muted">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl cv-nav-soft-active">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-sm sm:text-base font-bold cv-text tracking-tight">
                Keyboard Shortcuts
              </h2>
              <p className="text-[11px] cv-text-muted">
                Navigate CineVault swiftly with your keyboard
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 cv-btn-secondary rounded-full transition-colors cursor-pointer"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider cv-text-muted">
                {section.title}
              </h3>

              <div className="rounded-2xl cv-card border overflow-hidden">
                {section.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border-b last:border-b-0 cv-border-subtle transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {Icon && <Icon className="w-3.5 h-3.5 cv-text-muted shrink-0" />}
                        <span className="cv-text-secondary text-xs truncate">
                          {item.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {item.keys.map((key) => (
                          <kbd
                            key={key}
                            className="cv-kbd inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-mono font-bold border rounded-md shadow-inner"
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
          <div className="pt-2 flex items-center justify-between text-[11px] cv-text-muted cv-surface-muted border p-3 rounded-xl">
            <span>Tip: Press <kbd className="cv-kbd px-1 text-[10px] font-mono rounded border">?</kbd> anywhere to open this cheatsheet.</span>
            <div className="flex items-center gap-2">
              {onTriggerSpinner && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTriggerSpinner();
                  }}
                  className="px-2.5 py-1 cv-rating-badge rounded-lg transition-colors cursor-pointer font-semibold"
                >
                  Spin Now (R)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t cv-border cv-surface-muted flex items-center justify-between text-[11px] cv-text-muted">
          <span>Shortcuts are disabled while editing search or form fields.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg cv-btn-primary font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
