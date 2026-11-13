import '@fontsource-variable/archivo';
import '@fontsource-variable/big-shoulders-display';
import './styles/global.css';
import './styles/pop.css';
import './styles/apple.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { watchAppHeight } from './lib/appHeight';
import { watchBoxes } from './lib/boxes';
import { watchTyping } from './lib/forgetTyping';
import { isNative, toNative, watchScreens } from './lib/native';
import { BOOT_GROUND, SPLASH_MS, fadeBoot } from './lib/launch';
import { coverTop } from './lib/themeColor';
import { watchForUpdates } from './lib/update';
import ErrorBoundary from './components/ErrorBoundary';
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

/**
 * Wait for the two fonts before the first picture (they're on their way already, see
 * vite.config.ts): drawn first in a stand-in font, every headline would jump a moment later.
 * Never longer than a second, though: on a slow first visit the app shows up anyway.
 */
function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  const fonts = Promise.all([document.fonts.load('1em "Big Shoulders Display Variable"'), document.fonts.load('1em "Archivo Variable"')]);
  return Promise.race([fonts, new Promise((done) => window.setTimeout(done, 1000))]).catch(() => {});
}

// While the start-up screen shows, the strip under the clock stays its dark (the home screen
// underneath already lays its wallpaper's colour there); it goes along as the screen fades.
if (document.getElementById('boot')) coverTop(BOOT_GROUND);

// The window's real height for the CSS (an iPhone home-screen app gets 100dvh wrong).
watchAppHeight();

// The game tables' sizes for the CSS (instead of container queries, see lib/boxes.ts): watching
// before the first render, so the first picture has them.
watchBoxes();
// No "Undo Typing" when the phone is shaken (lib/forgetTyping.ts).
watchTyping();

void fontsReady().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* Even a crash outside a screen (in what holds the room or the settings) shows a way out
          instead of a dark page with nothing to press. */}
      <ErrorBoundary>
        <AppProvider>
          <RoomProvider>
            <App />
          </RoomProvider>
        </AppProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
  // The store app keeps its splash screen up until the first screen is drawn.
  if (isNative) requestAnimationFrame(() => requestAnimationFrame(() => toNative({ type: 'ready' })));
  requestAnimationFrame(() => requestAnimationFrame(hideBoot));
});

/**
 * The start-up screen (index.html): the turning die stays as long as a game's splash (from when it
 * first showed), then fades into the app. The store app has had its own splash: it goes at once.
 */
function hideBoot() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  const shown = (window as { __bootAt?: number }).__bootAt ?? 0;
  const wait = isNative ? 0 : Math.max(0, SPLASH_MS - (performance.now() - shown));
  window.setTimeout(() => fadeBoot(boot), wait);
}

// The store app brings its own copy of the app (and its updates come through the store).
if (isNative) watchScreens();
else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
  watchForUpdates();
}
