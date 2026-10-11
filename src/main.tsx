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
// these gesture events (Safari only); and two-finger moves are kept from zooming as well. That last
// one only listens while two fingers are down: a listener that may stop touch moves makes the phone
// wait for the app before every bit of scrolling.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
const noPinch = (e: TouchEvent) => {
  if (e.touches.length > 1 && e.cancelable) e.preventDefault();
};
document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length > 1) document.addEventListener('touchmove', noPinch, { passive: false });
  },
  { passive: true },
);
const fingersUp = (e: TouchEvent) => {
  if (e.touches.length < 2) document.removeEventListener('touchmove', noPinch);
};
document.addEventListener('touchend', fingersUp, { passive: true });
document.addEventListener('touchcancel', fingersUp, { passive: true });

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
