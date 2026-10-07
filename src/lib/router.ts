import { useEffect, useMemo, useState } from 'react';

// Hash routing: works on any static host and the phone's back button just works.

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

export function navigate(to: string) {
  window.location.hash = to;
}

export const paths = {
  home: '/',
  games: (category?: string) => (category ? `/games?cat=${category}` : '/games'),
  game: (id: string) => `/games/${id}`,
  play: (id: string) => `/play/${id}`,
  players: (next?: string) => (next ? `/players?next=${encodeURIComponent(next)}` : '/players'),
  settings: '/settings',
};
