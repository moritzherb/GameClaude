/*
 * The home-screen app can stay open in the background for days, so a new version
 * wouldn't show up until it's fully closed. Whenever the app comes back to the front,
 * check whether a newer build is online and load it – but never in the middle of a game.
 */

const MIN_GAP_MS = 60_000;
let lastCheck = 0;

/** The script of the build that's running now. */
const runningScript = () => document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null;

async function newerBuildOnline() {
  try {
    const res = await fetch(`./?check=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const online = (await res.text()).match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];
    const running = runningScript();
    return !!online && !!running && online !== running;
  } catch {
    return false; // Offline: keep what we have.
  }
}

const inGame = () => /^#\/(play|online)\//.test(location.hash);

async function check() {
  if (document.visibilityState !== 'visible' || inGame() || Date.now() - lastCheck < MIN_GAP_MS) return;
  lastCheck = Date.now();
  if (await newerBuildOnline()) location.reload();
}

export function watchForUpdates() {
  document.addEventListener('visibilitychange', check);
  // Leaving a game is a good moment too.
  window.addEventListener('hashchange', check);
  check();
}
