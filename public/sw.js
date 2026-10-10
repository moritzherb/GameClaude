// Tiny offline cache: party basements rarely have good Wi-Fi.
const CACHE = 'prost-v7';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Drop cached build files the current page no longer uses (each deploy brings new ones). */
function pruneOldAssets(html) {
  const used = new Set([...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map((m) => new URL(m[1], self.location.href).href));
  if (!used.size) return;
  caches.open(CACHE).then((c) =>
    // Only the page's own script and styles (fonts are loaded by the styles and rarely change).
    c.keys().then((reqs) => Promise.all(reqs.filter((r) => /\/assets\/[^/]+\.(js|css)$/.test(r.url) && !used.has(r.url)).map((r) => c.delete(r)))),
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // The app's update check asks the network directly; don't cache those.
  if (request.cache === 'no-store') return;

  // Pages: network first (checked with the server, not the browser cache) so updates
  // arrive, cache as fallback when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          // Only a good page replaces the offline copy (never an error page).
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            res.clone().text().then(pruneOldAssets, () => {});
          }
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./'))),
    );
    return;
  }

  // Everything else (hashed JS/CSS, fonts, icons): cache first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
