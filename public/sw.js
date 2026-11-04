// Tiny offline cache: party basements rarely have good Wi-Fi.
const CACHE = 'prost-v7';
/** How long a page may take from the network before the copy on the phone opens instead (ms). */
const SLOW_MS = 1000;

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
  // arrive, cache as fallback when offline. A slow network (a party basement) mustn't leave the
  // screen black while the app starts: after a moment the copy on the phone opens, and the fresh
  // page still lands in the cache for next time. Not for the app's reload onto a new build
  // (?build=…): that one has to be the new page.
  if (request.mode === 'navigate') {
    const fresh = fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      // Only a good page replaces the offline copy (never an error page).
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    });
    const offline = () => caches.match(request).then((r) => r || caches.match('./'));
    const patient = new URL(request.url).searchParams.has('build');
    event.respondWith(
      new Promise((resolve) => {
        let done = false;
        const answer = (res, served) => {
          if (done || !res) return;
          done = true;
          // Old build files can go once the fresh page is the one showing (not while an older copy runs).
          if (served === 'fresh' && res.ok) res.clone().text().then(pruneOldAssets, () => {});
          resolve(res);
        };
        const timer = patient ? 0 : setTimeout(() => offline().then((r) => answer(r, 'cached')), SLOW_MS);
        fresh.then(
          (res) => {
            clearTimeout(timer);
            answer(res, 'fresh');
          },
          () => {
            clearTimeout(timer);
            offline().then((r) => answer(r || Response.error(), 'cached'));
          },
        );
      }),
    );
    event.waitUntil(fresh.catch(() => {}));
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
