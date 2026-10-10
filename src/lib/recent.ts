import { load, save } from './storage';

const KEY = 'recent-games';
const KEEP = 3;

/** The games played last, newest first (ids). */
export function recentGames(): string[] {
  const list = load<unknown>(KEY, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').slice(0, KEEP) : [];
}

/** Remember that a game was just started. */
export function markPlayed(id: string) {
  save(KEY, [id, ...recentGames().filter((x) => x !== id)].slice(0, KEEP));
}
