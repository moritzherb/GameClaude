import '@fontsource-variable/archivo';
import '@fontsource-variable/big-shoulders-display';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { watchForUpdates } from './lib/update';
import { RoomProvider } from './net/RoomProvider';
import { AppProvider } from './state/AppState';

// An app, not a page: no pinching it bigger or smaller. iPhones ignore user-scalable=no, but not
// these gesture events (Safari only), and two-finger moves are kept from zooming as well.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1 && e.cancelable) e.preventDefault();
  },
  { passive: false },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <RoomProvider>
        <App />
      </RoomProvider>
    </AppProvider>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
  watchForUpdates();
}
