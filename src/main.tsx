import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { MovieComparisonProvider } from './context/MovieComparisonContext';
import './index.css';

// Filter out unhandled errors originating from third-party browser extensions (e.g., MetaMask, Foxified, crypto wallets, ad blockers)
if (typeof window !== 'undefined') {
  const isExtensionError = (message: string, context?: string) => {
    const combined = `${message || ''} ${context || ''}`.toLowerCase();
    return (
      combined.includes('script error') ||
      combined.includes('metamask') ||
      combined.includes('ethereum') ||
      combined.includes('ejbalbakoplchlghecdalmeeeajnimhm') ||
      combined.includes('inpage.js') ||
      combined.includes('inpage') ||
      combined.includes('solana') ||
      combined.includes('phantom') ||
      combined.includes('coinbase') ||
      combined.includes('failed to connect') ||
      combined.includes('websocket') ||
      combined.includes('[vite]') ||
      combined.includes('chrome-extension') ||
      combined.includes('moz-extension') ||
      combined.includes('safari-web-extension') ||
      combined.includes('safari-extension') ||
      combined.includes('chrome: call method') ||
      combined.includes('window message') ||
      combined.includes('ff-content') ||
      combined.includes('cldmemdnllncchfahbcnjijheaolemfk') ||
      combined.includes('foxified') ||
      combined.includes('message channel closed') ||
      combined.includes('listener indicated an asynchronous response') ||
      combined.includes('asynchronous response by returning true') ||
      combined.includes('objectmultiplex') ||
      combined.includes('orphaned data for stream') ||
      combined.includes('maxlistenersexceededwarning') ||
      combined.includes('permissions policy violation') ||
      combined.includes('getembedinfo')
    );
  };

  const prevOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const stack = error?.stack || '';
    if (isExtensionError(String(message || ''), `${source || ''} ${stack}`)) {
      return true;
    }
    if (typeof prevOnError === 'function') {
      return prevOnError(message, source, lineno, colno, error);
    }
  };

  const prevOnRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    const message = typeof reason === 'string' ? reason : reason?.message || '';
    const stack = reason?.stack || '';
    if (isExtensionError(message, stack)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return true;
    }
    if (typeof prevOnRejection === 'function') {
      return prevOnRejection.call(window, event);
    }
  };

  window.addEventListener(
    'error',
    (event) => {
      const stack = event.error && event.error.stack ? String(event.error.stack) : '';
      const file = event.filename || '';
      if (isExtensionError(event.message || '', `${file} ${stack}`)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        return true;
      }
    },
    true,
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message || '';
      const stack = reason?.stack || '';
      if (isExtensionError(message, stack)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
      }
    },
    true,
  );

  // Outdated chunk recovery and automatic reload
  window.addEventListener('vite:preloadError', () => {
    console.warn('[CineVault] New deployment detected or dynamic chunk load error. Refreshing to load latest version...');
    try {
      const lastReload = sessionStorage.getItem('cinevault_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem('cinevault_chunk_reload', String(now));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });

  // Automatic PWA service worker registration and periodic update checks
  if ('serviceWorker' in navigator) {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const updateSW = registerSW({
          onNeedRefresh() {
            console.info('[CineVault PWA] New version detected, updating service worker...');
            updateSW(true);
          },
          onOfflineReady() {
            console.info('[CineVault PWA] Offline cache initialized');
          },
        });

        // Check for updates periodically every 60 minutes
        setInterval(() => {
          updateSW();
        }, 60 * 60 * 1000);
      })
      .catch((err) => {
        console.debug('[CineVault PWA] Service worker registration note:', err);
      });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <MovieComparisonProvider>
          <App />
        </MovieComparisonProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

