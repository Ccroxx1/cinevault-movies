import { useEffect } from 'react';

export interface UseGlobalShortcutsOptions {
  onSearchFocus: () => void;
  onOpenSpinner: () => void;
  onCloseModals: () => void;
  onNavigateBrowse: () => void;
  onNavigateWatchlist: () => void;
  onNavigateSeries: () => void;
  onOpenCineBot?: () => void;
  onToggleShortcutsModal?: () => void;
  isAnyModalOpen?: boolean;
}

function isInputElement(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName ? el.tagName.toUpperCase() : '';
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    Boolean(el.isContentEditable) ||
    el.getAttribute('role') === 'textbox' ||
    el.getAttribute('role') === 'searchbox' ||
    el.getAttribute('role') === 'combobox'
  );
}

/**
 * Global Keyboard Shortcut Hook
 * Manages hotkeys across the entire application:
 * - 'S' or '/': Focus instant search
 * - 'R': Open Movie Night Spinner (random movie generator)
 * - 'Esc': Close active modals, dialogs, or clear search focus
 * - 'B' / 'H': Navigate to Browse Catalog
 * - 'W': Navigate to Saved Watchlist
 * - 'T': Navigate to TV Series Catalog
 * - 'C': Open CineBot AI Concierge
 * - '?': Open Keyboard Shortcuts Guide
 */
export function useGlobalShortcuts({
  onSearchFocus,
  onOpenSpinner,
  onCloseModals,
  onNavigateBrowse,
  onNavigateWatchlist,
  onNavigateSeries,
  onOpenCineBot,
  onToggleShortcutsModal,
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const targetEl = e.target as HTMLElement | null;
      const editingInput = isInputElement(activeEl) || isInputElement(targetEl);

      // 1. 'Escape' works everywhere to close active dialogs or blur active input fields
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (editingInput) {
          activeEl?.blur();
          targetEl?.blur();
        }
        onCloseModals();
        return;
      }

      // 2. Strict guard: never trigger letter shortcuts if user is typing in an input or textarea
      if (editingInput) {
        return;
      }

      // 3. Strict guard: never intercept OS or browser modifier key combinations (e.g. Cmd+R, Ctrl+R, Ctrl+S)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // 4. Do not hijack keys if active element is a video or embedded media iframe
      if (
        activeEl?.tagName === 'VIDEO' ||
        activeEl?.tagName === 'IFRAME' ||
        targetEl?.tagName === 'VIDEO' ||
        targetEl?.tagName === 'IFRAME' ||
        document.querySelector('[data-trailer-modal]')
      ) {
        return;
      }

      const key = e.key;

      switch (key) {
        // 'S' or '/' -> Focus Search
        case 's':
        case 'S':
        case '/': {
          e.preventDefault();
          onSearchFocus();
          break;
        }

        // 'R' -> Random movie / Movie Night Spinner
        case 'r':
        case 'R': {
          e.preventDefault();
          onOpenSpinner();
          break;
        }

        // 'B' or 'H' -> Browse catalog / Home
        case 'b':
        case 'B':
        case 'h':
        case 'H': {
          e.preventDefault();
          onNavigateBrowse();
          break;
        }

        // 'W' -> Watchlist
        case 'w':
        case 'W': {
          e.preventDefault();
          onNavigateWatchlist();
          break;
        }

        // 'T' -> TV Series Catalog
        case 't':
        case 'T': {
          e.preventDefault();
          onNavigateSeries();
          break;
        }

        // 'C' -> CineBot AI Concierge
        case 'c':
        case 'C': {
          if (onOpenCineBot) {
            e.preventDefault();
            onOpenCineBot();
          }
          break;
        }

        // '?' -> Keyboard shortcuts guide
        case '?': {
          if (onToggleShortcutsModal) {
            e.preventDefault();
            onToggleShortcutsModal();
          }
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSearchFocus,
    onOpenSpinner,
    onCloseModals,
    onNavigateBrowse,
    onNavigateWatchlist,
    onNavigateSeries,
    onOpenCineBot,
    onToggleShortcutsModal,
  ]);
}
