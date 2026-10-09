import { useEffect, useMemo, useState } from 'react';

// Hash routing: works on any static host.
//
// The history is kept flat: the home screen, and at most one screen on top of it.
// Swiping back (or the phone's back button) therefore always lands on the home
// screen, never in an old game.

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
const isHome = (hash: string) => hash === '' || hash === '#' || hash === '#/';

function go(hash: string, how: 'push' | 'replace', state: string | null) {
  if (how === 'push') history.pushState(state, '', hash);
  else history.replaceState(state, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function navigate(to: string) {
  const hash = `#${to}`;
  if (hash === window.location.hash) return;
  if (isHome(hash)) {
    // Step back onto the home entry instead of piling up a new one.
    if (history.state === ABOVE_HOME) history.back();
    else go(hash, 'replace', null);
    return;
  }
  // From home: one entry on top. Anywhere else: swap the screen on top.
  go(hash, isHome(window.location.hash) ? 'push' : 'replace', ABOVE_HOME);
}

if (typeof window !== 'undefined') {
  // Opened straight on a deeper screen (a join link, a reload mid-game): put home underneath.
  if (!isHome(window.location.hash) && history.state !== ABOVE_HOME) {
    const deep = window.location.hash;
    history.replaceState(null, '', '#/');
    history.pushState(ABOVE_HOME, '', deep);
  }
  // Swiping forward from home would reopen the last screen: bounce straight back.
  let lastHash = window.location.hash;
  window.addEventListener('popstate', () => {
    if (isHome(lastHash) && history.state === ABOVE_HOME) history.back();
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
