import { useEffect, useMemo, useState } from 'react';

// Hash routing: works on any static host.
//
// The history is kept flat: the home screen, and at most one screen on top of it.
// Swiping back (or the phone's back button) therefore always lands on the home
// screen, never in an old game. Swiping forward on the home screen opens All games.
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
    let shown = window.location.hash;
    const onChange = () => {
      // The app's own steps through the history can land on the screen already shown: stay put.
      if (window.location.hash === shown) return;
      shown = window.location.hash;
      setHash(shown);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return useMemo(() => parse(hash), [hash]);
}

/** Marks the history entry that sits on top of the home screen. */
const ABOVE_HOME = 'prost:above-home';
/** Home in the top entry (from an earlier version of the app): treated like any screen on top. */
const HOME_TOP = 'prost:home-top';
/** Marks a running game: nothing different lies behind or ahead of it. */
const GAME_ROOT = 'prost:game';
/** The same game in the entry above it (only there so that swiping forward goes nowhere new). */
const GAME_TOP = 'prost:game-top';
const ALL_GAMES = '#/games';
const isHome = (hash: string) => hash === '' || hash === '#' || hash === '#/';
const isGame = (hash: string) => /^#\/(play|online)\//.test(hash);
/** All games, with or without a category picked (not a game's own page). */
const isAllGames = (hash: string) => hash === ALL_GAMES || hash.startsWith(`${ALL_GAMES}?`);
/** A game waiting to fill the bottom entry too, once the step back onto it has happened. */
let pendingGame: string | null = null;
/** Where to go once the step back from the top game entry onto the bottom one has happened. */
let pendingNav: string | null = null;
/** Steps back the app takes itself, whose popstate is no news. */
let ownSteps = 0;

function go(hash: string, how: 'push' | 'replace', state: string | null) {
  if (how === 'push') history.pushState(state, '', hash);
  else history.replaceState(state, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Runs once the screen has been drawn (two frames later; a timer in case frames don't come). */
function afterPaint(fn: () => void) {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    fn();
  };
  requestAnimationFrame(() => requestAnimationFrame(once));
  window.setTimeout(once, 250);
}

/**
 * On the home screen (the bottom entry): put All games in the entry ahead, so swiping forward
 * opens it. Waits until home is on screen, and does nothing if something else happened meanwhile.
 */
function allGamesAhead() {
  afterPaint(() => {
    if (history.state !== null || !isHome(window.location.hash)) return;
    history.pushState(ABOVE_HOME, '', ALL_GAMES);
    ownSteps++;
    history.back();
  });
}

/*
 * The history never holds more than two entries, so swiping can't bring back an old screen:
 *   home                 [home, all games]   standing on home: swiping forward opens All games
 *   any other screen     [home, screen]
 *   a running game       [game, game]        standing on the first: nothing to swipe back to
 */
export function navigate(to: string) {
  const hash = `#${to}`;
  if (hash === window.location.hash) return;
  const state = history.state;

  // On the top game entry (swiped forward a moment ago): step onto the bottom one first.
  if (state === GAME_TOP) {
    pendingNav = to;
    history.back();
    return;
  }

  if (isGame(hash)) {
    if (state === GAME_ROOT) go(hash, 'replace', GAME_ROOT);
    else if (state === ABOVE_HOME || state === HOME_TOP) {
      // Top entry becomes the game, then step back and make the bottom one the game too.
      go(hash, 'replace', GAME_TOP);
      pendingGame = hash;
      history.back();
    } else {
      // On the bottom entry: the game takes it and the one above, and we stand on the bottom one.
      go(hash, 'replace', GAME_ROOT);
      history.pushState(GAME_TOP, '', hash);
      history.back();
    }
    return;
  }

  if (state === GAME_ROOT) {
    // Out of a game. iPhones show the last picture of an entry while you swipe back to it, and
    // the bottom entry last showed the game. So home goes on screen there first, then:
    go('#/', 'replace', null);
    // home: All games ahead of it; anything else: on top of home.
    if (isHome(hash)) allGamesAhead();
    else
      afterPaint(() => {
        if (history.state === null && isHome(window.location.hash)) go(hash, 'push', ABOVE_HOME);
      });
    return;
  }

  if (isHome(hash)) {
    // Back down to the home entry (the popstate puts All games ahead of it).
    if (state === ABOVE_HOME || state === HOME_TOP) history.back();
    else go(hash, 'replace', null);
    return;
  }
  // From the home entry: one entry on top. From the top one: swap it.
  go(hash, state === ABOVE_HOME || state === HOME_TOP ? 'replace' : 'push', ABOVE_HOME);
}

if (typeof window !== 'undefined') {
  // Reloaded mid-game: it stays a game entry.
  if (isGame(window.location.hash)) {
    if (history.state !== GAME_TOP) history.replaceState(GAME_ROOT, '', window.location.hash);
  }
  // Opened straight on a deeper screen (a join link): put home underneath.
  else if (!isHome(window.location.hash) && history.state !== ABOVE_HOME) {
    const deep = window.location.hash;
    history.replaceState(null, '', '#/');
    history.pushState(ABOVE_HOME, '', deep);
  }
  // Opened on the home screen: All games ahead.
  else if (isHome(window.location.hash) && history.state === null) allGamesAhead();
  let lastHash = window.location.hash;
  window.addEventListener('popstate', () => {
    if (ownSteps > 0) {
      ownSteps--;
      return;
    }
    // Stepped back onto the bottom entry to make it the game as well.
    if (pendingGame) {
      const hash = pendingGame;
      pendingGame = null;
      history.replaceState(GAME_ROOT, '', hash);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    // Swiped forward onto the top game entry: back onto the bottom one (it's the same game, so
    // nothing changes on screen), so there's still nothing to swipe back to.
    if (history.state === GAME_TOP) {
      history.back();
      return;
    }
    if (pendingNav) {
      const to = pendingNav;
      pendingNav = null;
      navigate(to);
      return;
    }
    // Back on home from another screen: All games ahead again (unless that's where we came from).
    if (history.state === null && isHome(window.location.hash)) {
      if (!isAllGames(lastHash)) allGamesAhead();
      return;
    }
    // Never step from a game onto a screen.
    if (isGame(lastHash) && history.state === ABOVE_HOME) history.back();
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
