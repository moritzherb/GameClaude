import { useEffect, useMemo, useState } from 'react';

// Hash routing: works on any static host.
//
// The history is kept flat: the home screen, and at most one screen on top of it.
// Swiping back (or the phone's back button) therefore always lands on the home
// screen, never in an old game.
//
// A running game has nothing underneath it at all: there's no swiping back out of it by
// accident (that would just end it). The X in the corner is the way out.

export interface Route {
  segments: string[];
  query: URLSearchParams;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { segments: path.split('/').filter(Boolean), query: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return useMemo(() => parse(hash), [hash]);
}

/** Marks the history entry that sits on top of the home screen. */
const ABOVE_HOME = 'prost:above-home';
/** Home again in the top entry (after leaving a screen): nothing different lies ahead of it. */
const HOME_TOP = 'prost:home-top';
/** Marks a running game: nothing different lies behind or ahead of it. */
const GAME_ROOT = 'prost:game';
const isHome = (hash: string) => hash === '' || hash === '#' || hash === '#/';
const isGame = (hash: string) => /^#\/(play|online)\//.test(hash);
/** A game waiting to fill the bottom entry too, once the step back onto it has happened. */
let pendingGame: string | null = null;

function go(hash: string, how: 'push' | 'replace', state: string | null) {
  if (how === 'push') history.pushState(state, '', hash);
  else history.replaceState(state, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/*
 * The history never holds more than two entries, and never a different screen ahead of the one
 * you're on, so swiping can't flash an old screen:
 *   home                 [home]            or [home, home]
 *   any other screen     [home, screen]
 *   a running game       [game, game]      standing on the first: nothing to swipe back to
 */
export function navigate(to: string) {
  const hash = `#${to}`;
  if (hash === window.location.hash) return;
  const state = history.state;

  if (isGame(hash)) {
    if (state === GAME_ROOT) go(hash, 'replace', GAME_ROOT);
    else if (state === ABOVE_HOME || state === HOME_TOP) {
      // Top entry becomes the game, then step back and make the bottom one the game too.
      go(hash, 'replace', GAME_ROOT);
      pendingGame = hash;
      history.back();
    } else {
      // On the bottom entry: the game takes it and the one above, and we stand on the bottom one.
      go(hash, 'replace', GAME_ROOT);
      history.pushState(GAME_ROOT, '', hash);
      history.back();
    }
    return;
  }

  if (state === GAME_ROOT) {
    // Out of a game: home at the bottom again, and whatever comes next on top of it.
    history.replaceState(null, '', '#/');
    if (isHome(hash)) go(hash, 'push', HOME_TOP);
    else go(hash, 'push', ABOVE_HOME);
    return;
  }

  if (isHome(hash)) {
    // Home in the top entry, so the screen just left isn't waiting ahead.
    go(hash, 'replace', state === ABOVE_HOME || state === HOME_TOP ? HOME_TOP : null);
    return;
  }
  // From the bottom home entry: one entry on top. From the top one: swap it.
  go(hash, state === ABOVE_HOME || state === HOME_TOP ? 'replace' : 'push', ABOVE_HOME);
}

if (typeof window !== 'undefined') {
  // Reloaded mid-game: it stays a game entry.
  if (isGame(window.location.hash)) history.replaceState(GAME_ROOT, '', window.location.hash);
  // Opened straight on a deeper screen (a join link): put home underneath.
  else if (!isHome(window.location.hash) && history.state !== ABOVE_HOME) {
    const deep = window.location.hash;
    history.replaceState(null, '', '#/');
    history.pushState(ABOVE_HOME, '', deep);
  }
  let lastHash = window.location.hash;
  window.addEventListener('popstate', () => {
    // Stepped back onto the bottom entry to make it the game as well.
    if (pendingGame) {
      const hash = pendingGame;
      pendingGame = null;
      history.replaceState(GAME_ROOT, '', hash);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    // Swiped back from a screen onto home: drop the screen ahead, so swiping forward can't
    // bring it back for a moment.
    if (history.state === null && isHome(window.location.hash) && !isHome(lastHash) && !isGame(lastHash)) {
      history.pushState(HOME_TOP, '', '#/');
      return;
    }
    // An old entry from before (e.g. an earlier version): never step forward onto a screen.
    if ((isHome(lastHash) || isGame(lastHash)) && history.state === ABOVE_HOME) history.back();
  });
  window.addEventListener('hashchange', () => {
    lastHash = window.location.hash;
  });
}

export const paths = {
  home: '/',
  games: (category?: string) => (category ? `/games?cat=${category}` : '/games'),
  game: (id: string) => `/games/${id}`,
  play: (id: string) => `/play/${id}`,
  players: (next?: string) => (next ? `/players?next=${encodeURIComponent(next)}` : '/players'),
  settings: '/settings',
  room: '/room',
  online: (id: string) => `/online/${id}`,
  join: (code: string) => `/join/${code}`,
};
