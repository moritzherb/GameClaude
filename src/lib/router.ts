import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// Hash routing: works on any static host.
//
// The history is kept flat: the home screen, and at most one screen on top of it.
// Swiping back (or the phone's back button) therefore always lands on the home
// screen, never in an old game, and nothing ever lies ahead: there's no swiping forward (to the
// left) anywhere. All games opens with its button.
//
// A running game has nothing underneath it at all: there's no swiping back out of it by
// accident (that would just end it). The X in the corner is the way out. Home is the same: nothing
// underneath it, so no swiping at all there (only pulling down to reload).

/**
 * A real repaint (a dot nobody can see, drawn for two frames), not just a layer change: iPhones
 * show their picture of the screen during a swipe and drop it once the page paints something new.
 * Now and once more after the swipe has surely ended.
 */
function repaint() {
  const nudge = () => {
    const dot = document.createElement('i');
    dot.style.cssText = 'position:absolute;left:0;top:0;width:2px;height:2px;background:rgba(128,128,128,0.02);pointer-events:none';
    document.body.appendChild(dot);
    requestAnimationFrame(() => requestAnimationFrame(() => dot.remove()));
  };
  nudge();
  window.setTimeout(nudge, 400);
}

export interface Route {
  segments: string[];
  query: URLSearchParams;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { segments: path.split('/').filter(Boolean), query: new URLSearchParams(query) };
}

/** Where each screen was scrolled to when it was left, for swiping back to it. */
const scrolls = new Map<string, number>();
/** Home has more than one address ('', '#', '#/'). */
const screenKey = (hash: string) => (hash === '' || hash === '#' ? '#/' : hash);

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    // What the first render showed (the address may have changed since, before this listened).
    let shown = hash;
    const onChange = () => {
      // The app's own steps through the history can land on the screen already shown: stay put.
      if (window.location.hash === shown) return;
      // Still the old screen on display: remember how far down it was.
      scrolls.set(screenKey(shown), window.scrollY);
      shown = window.location.hash;
      setHash(shown);
    };
    window.addEventListener('hashchange', onChange);
    onChange();
    return () => window.removeEventListener('hashchange', onChange);
    // Only once: later changes come in through the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Once the new screen is in place (before it's painted): from the top, or, swiped back to a screen,
  // where it was, just like the picture the phone showed while swiping.
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const back = document.documentElement.classList.contains('nav-back');
    window.scrollTo(0, back ? (scrolls.get(screenKey(hash)) ?? 0) : 0);
    // iPhones show their picture of the screen while swiping back and drop it once the page paints
    // something new: make sure that happens.
    if (back) repaint();
  }, [hash]);
  return useMemo(() => parse(hash), [hash]);
}

/** Marks the history entry that sits on top of the home screen. */
const ABOVE_HOME = 'prost:above-home';
/** Home again in the top entry (after leaving a screen): nothing lies ahead of it. */
const HOME_TOP = 'prost:home-top';
/** Marks a running game: nothing different lies behind or ahead of it. */
const GAME_ROOT = 'prost:game';
/** The same game in the entry above it (only there so that swiping forward goes nowhere new). */
const GAME_TOP = 'prost:game-top';
const isHome = (hash: string) => hash === '' || hash === '#' || hash === '#/';
const isGame = (hash: string) => /^#\/(play|online)\//.test(hash);
/** A game waiting to fill the bottom entry too, once the step back onto it has happened. */
let pendingGame: string | null = null;
/** Where to go once the step back from the top game entry onto the bottom one has happened. */
let pendingNav: string | null = null;
/** The app's own step back from the top home entry onto the bottom one: not a swipe. */
let settling = false;

/**
 * Home, like a running game, stands on the bottom entry with nothing behind it (no swiping back)
 * and only home again ahead (swiping forward goes nowhere new, and steps right back). From home
 * in the top entry: step down onto the bottom one, which is home too.
 */
function settleHome() {
  if (history.state !== HOME_TOP || !isHome(window.location.hash)) return;
  settling = true;
  history.back();
}

/**
 * Came back by swiping (or the back button): the phone already slid the screen in from its picture,
 * so screens skip their entrance animation then (it would play a second time). Any step of the app's
 * own brings them back.
 */
const cameBack = (on: boolean) => document.documentElement.classList.toggle('nav-back', on);

function go(hash: string, how: 'push' | 'replace', state: string | null) {
  cameBack(false);
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

/*
 * The history never holds more than two entries, and never anything ahead of the one you're on,
 * so swiping can't bring back an old screen (or show one the phone has no picture of):
 *   home                 [home] or [home, home]  standing on the first: nothing to swipe back to
 *   any other screen     [home, screen]
 *   a running game       [game, game]      standing on the first: nothing to swipe back to
 */
export function navigate(to: string) {
  const hash = `#${to}`;
  if (hash === window.location.hash) return;
  const state = history.state;

  // Stepping down onto the bottom home entry right now: go on from there.
  if (settling) {
    pendingNav = to;
    return;
  }

  // On the top game entry (swiped forward a moment ago): step onto the bottom one first.
  if (state === GAME_TOP) {
    pendingNav = to;
    history.back();
    return;
  }

  // The phone keeps a picture of each entry from when it was last left, and shows it while you swipe
  // onto that entry. So the entry ahead is only left once the game is on screen: its picture is the
  // game too (not the rules page you started from), and swiping forward shows nothing new.
  if (isGame(hash)) {
    if (state === GAME_ROOT) go(hash, 'replace', GAME_ROOT);
    else if (state === ABOVE_HOME || state === HOME_TOP) {
      // Top entry becomes the game, then (once it's drawn) step back and make the bottom one the game too.
      go(hash, 'replace', GAME_TOP);
      pendingGame = hash;
      afterPaint(() => {
        if (pendingGame === hash && history.state === GAME_TOP) history.back();
      });
    } else {
      // On the bottom entry: the game takes it and (once it's drawn) the one above, and we stand on the bottom one.
      go(hash, 'replace', GAME_ROOT);
      afterPaint(() => {
        if (history.state !== GAME_ROOT || window.location.hash !== hash) return;
        history.pushState(GAME_TOP, '', hash);
        history.back();
      });
    }
    return;
  }

  if (state === GAME_ROOT) {
    // Out of a game. iPhones show the last picture of an entry while you swipe back to it, and
    // the bottom entry last showed the game. So home goes on screen there first, then:
    go('#/', 'replace', null);
    // …and the game's second entry (ahead) is replaced: by home again (standing on the bottom
    // one), or the next screen.
    afterPaint(() => {
      if (history.state !== null || !isHome(window.location.hash)) return;
      if (isHome(hash)) {
        history.pushState(HOME_TOP, '', '#/');
        settleHome();
      } else go(hash, 'push', ABOVE_HOME);
    });
    return;
  }

  if (isHome(hash)) {
    // Home in the top entry, so the screen just left isn't waiting ahead; once it's drawn, down
    // onto the bottom entry (home as well), so there's nothing to swipe back to.
    go(hash, 'replace', state === ABOVE_HOME || state === HOME_TOP ? HOME_TOP : null);
    afterPaint(settleHome);
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
  let lastHash = window.location.hash;
  window.addEventListener('popstate', () => {
    // The app's own step down onto the bottom home entry: the same screen, nothing to do.
    if (settling) {
      settling = false;
      if (pendingNav) {
        const to = pendingNav;
        pendingNav = null;
        navigate(to);
      }
      return;
    }
    if (!pendingGame && !pendingNav && history.state !== GAME_TOP && history.state !== HOME_TOP) cameBack(true);
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
      // Make sure the phone drops its picture of the swipe.
      repaint();
      return;
    }
    if (pendingNav) {
      const to = pendingNav;
      pendingNav = null;
      navigate(to);
      return;
    }
    // Swiped forward from home onto the top home entry: back down (it's home too, so nothing
    // changes on screen), so there's still nothing to swipe back to.
    if (history.state === HOME_TOP) {
      settleHome();
      repaint();
      return;
    }
    // Swiped back onto home from a screen: drop what's ahead (home again instead, standing on the
    // bottom entry), so there's never anything to swipe forward (left) to, nor back.
    if (history.state === null && isHome(window.location.hash) && !isGame(lastHash) && !isHome(lastHash)) {
      // Not right away: changing the history while the iPhone finishes its swipe can leave its
      // picture of the screen stuck on top of the page.
      window.setTimeout(() => {
        if (history.state !== null || !isHome(window.location.hash)) return;
        history.pushState(HOME_TOP, '', '#/');
        settleHome();
      }, 600);
      return;
    }
    // An old entry ahead (from an earlier version of the app): never step forward onto a screen.
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
  profile: '/profile',
  room: '/room',
  online: (id: string) => `/online/${id}`,
  join: (code: string) => `/join/${code}`,
};
