/*
 * The home-screen app can stay open in the background for days, so a new version
 * wouldn't show up until it's fully closed. Whenever the app comes back to the front,
 * check whether a newer build is online – but never in the middle of a game. A newer one is
 * fetched into the offline cache right away (its page and files) and loaded the next time the app
 * goes to the background, so the phone never shows a black screen while it loads; an iPhone
 * coming back then finds it ready.
 */

const MIN_GAP_MS = 15_000;
/** Also look now and then while the app stays open outside a game. */
const POLL_MS = 90_000;
let lastCheck = 0;

/** The script of the build that's running now. */
const runningScript = () => document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null;

/** The address to load the newer build from, once it is ready on the phone. */
let pending: string | null = null;

/** The newer build's script if one is online (and its files), else null. */
async function newerBuildOnline(): Promise<{ script: string; html: string } | null> {
  // A slow party Wi-Fi mustn't keep the check hanging (and land the reload later, maybe in a game).
  const abort = new AbortController();
  const timer = window.setTimeout(() => abort.abort(), 5000);
  try {
    const res = await fetch(`./?check=${Date.now()}`, { cache: 'no-store', signal: abort.signal });
    if (!res.ok) return null;
    const html = await res.text();
    const online = html.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];
    const running = runningScript();
    return online && running && online !== running ? { script: online, html } : null;
  } catch {
    return null; // Offline: keep what we have.
  } finally {
    window.clearTimeout(timer);
  }
}

/** In a game, or in a room with other phones: a reload would cut everyone off. */
const busy = () => {
  if (/^#\/(play|online)\//.test(location.hash)) return true;
  try {
    return !!sessionStorage.getItem(ROOM_KEY);
  } catch {
    return false;
  }
};

/** The build a reload was last made for in this tab, and when. */
const RELOADED_KEY = 'prost:reloaded-for';
const RETRY_RELOAD_MS = 2 * 60_000;
/** Set by the room code (src/net/RoomProvider.tsx) while this phone is in a room. */
const ROOM_KEY = 'prost:room';

async function check() {
  if (pending || document.visibilityState !== 'visible' || busy() || Date.now() - lastCheck < MIN_GAP_MS) return;
  lastCheck = Date.now();
  const found = await newerBuildOnline();
  if (!found) return;
  const online = found.script;
  try {
    // Reloaded for this build a moment ago and still got the old page (a server handing out the
    // old copy for a few more minutes): don't go round in circles, try again a bit later.
    const last = JSON.parse(sessionStorage.getItem(RELOADED_KEY) ?? 'null') as { for: string; at: number } | null;
    if (last?.for === online && Date.now() - last.at < RETRY_RELOAD_MS) return;
    sessionStorage.setItem(RELOADED_KEY, JSON.stringify({ for: online, at: Date.now() }));
  } catch {
    /* storage blocked: reload anyway */
  }
  // A new address for the page, so no cache on the way can hand out the old copy again.
  const build = online.replace(/^.*\/|\.js$/g, '');
  const url = `${location.pathname}?build=${encodeURIComponent(build)}`;
  // Onto the phone first: the page (the service worker keeps it under this address) and its
  // script and styles, so loading it later needs no network.
  try {
    const files = [...found.html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
    await Promise.all([url, ...files].map((f) => fetch(f).then((r) => r.ok || Promise.reject(new Error(f)))));
  } catch {
    return; // Not all there (a slow network): next time.
  }
  pending = url;
  // Already in the background (or a game started meanwhile): on the next way out.
  if ((document.visibilityState as string) === 'hidden') reload();
}

/** Onto the newer build, now the app isn't in sight (and not mid-game). */
function reload() {
  if (!pending || busy()) return;
  location.replace(`${pending}${location.hash}`);
}

export function watchForUpdates() {
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? reload() : check()));
  // Leaving a game is a good moment too.
  window.addEventListener('hashchange', check);
  // An update that lands while the app is open (and was checked a moment too early) still arrives.
  window.setInterval(check, POLL_MS);
  check();
}
