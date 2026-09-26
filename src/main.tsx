import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { MovieComparisonProvider } from './context/MovieComparisonContext';
import './index.css';

// Filter out unhandled errors originating from third-party browser extensions (e.g., MetaMask, crypto wallets, ad blockers)
if (typeof window !== 'undefined') {
  const isExtensionError = (message: string, filename?: string) => {
    const lowerMsg = (message || '').toLowerCase();
    const lowerFile = (filename || '').toLowerCase();
    return (
      lowerMsg.includes('metamask') ||
      lowerMsg.includes('ethereum') ||
      lowerMsg.includes('solana') ||
      lowerMsg.includes('phantom') ||
      lowerMsg.includes('coinbase') ||
      lowerMsg.includes('failed to connect') ||
      lowerMsg.includes('websocket') ||
      lowerMsg.includes('[vite]') ||
      lowerMsg.includes('country consent') ||
      lowerMsg.includes('sacountry') ||
      lowerMsg.includes('gatekeeper') ||
      lowerMsg.includes('ezoic') ||
      lowerMsg.includes('ezojs') ||
      lowerMsg.includes('profitableratecpmnetwork') ||
      lowerMsg.includes('adsterra') ||
      lowerMsg.includes('eagerdazzle') ||
      lowerMsg.includes('monetization not allowed') ||
      lowerMsg.includes('bad response') ||
      lowerFile.includes('chrome-extension') ||
      lowerFile.includes('moz-extension') ||
      lowerFile.includes('safari-web-extension') ||
      lowerFile.includes('sa.min.js') ||
      lowerFile.includes('sacountry') ||
      lowerFile.includes('gatekeeperconsent') ||
      lowerFile.includes('ezoic') ||
      lowerFile.includes('profitableratecpmnetwork') ||
      lowerFile.includes('adsterra') ||
      lowerFile.includes('eagerdazzle') ||
      lowerFile.includes('ezojs')
    );
  };

  window.addEventListener('error', (event) => {
    if (isExtensionError(event.message || '', event.filename || '')) {
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

