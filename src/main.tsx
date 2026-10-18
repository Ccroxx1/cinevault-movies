import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { MovieComparisonProvider } from './context/MovieComparisonContext';
import './index.css';

// Filter out unhandled errors originating from third-party browser extensions (e.g., MetaMask, crypto wallets, ad blockers)
if (typeof window !== 'undefined') {
  const isExtensionError = (message: string, context?: string) => {
    const combined = `${message || ''} ${context || ''}`.toLowerCase();
    return (
      combined.includes('metamask') ||
      combined.includes('ethereum') ||
      combined.includes('solana') ||
      combined.includes('phantom') ||
      combined.includes('coinbase') ||
      combined.includes('failed to connect') ||
      combined.includes('websocket') ||
      combined.includes('[vite]') ||
      combined.includes('country consent') ||
      combined.includes('sacountry') ||
      combined.includes('gatekeeper') ||
      combined.includes('ezoic') ||
      combined.includes('ezojs') ||
      combined.includes('profitableratecpmnetwork') ||
      combined.includes('adsterra') ||
      combined.includes('eagerdazzle') ||
      combined.includes('monetization not allowed') ||
      combined.includes('bad response') ||
      combined.includes('chrome-extension') ||
      combined.includes('moz-extension') ||
      combined.includes('safari-web-extension') ||
      combined.includes('sa.min.js') ||
      combined.includes('gatekeeperconsent') ||
      combined.includes('chrome: call method') ||
      combined.includes('window message') ||
      combined.includes('ff-content') ||
      combined.includes('cldmemdnllncchfahbcnjijheaolemfk')
    );
  };

  window.addEventListener('error', (event) => {
    const stack = (event.error && event.error.stack) ? String(event.error.stack) : '';
    const file = event.filename || '';
    if (isExtensionError(event.message || '', `${file} ${stack}`)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = typeof reason === 'string' ? reason : reason?.message || '';
    const stack = reason?.stack || '';
    if (isExtensionError(message, stack)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
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

