import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// PWA: register the offline-shell service worker in production builds
// only. Registration is best-effort — the app works fully without it,
// except offline opening. See public/sw.js (API calls are never cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration failures (e.g. insecure context, disabled SW).
    });
  });
}
