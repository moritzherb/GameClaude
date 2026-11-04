import { load, save } from '../lib/storage';
import type { Platform } from '../lib/platform';

/** Where the games sit on the home screen, as the user arranged them (one order per phone look). */
const key = (os: Platform) => `home-order-${os}`;

/** The stored order, kept to the games there are (new games go at the end); none stored: null. */
export function loadOrder(os: Platform, games: string[]): string[] | null {
  const raw = load<unknown>(key(os), null);
  if (!Array.isArray(raw)) return null;
  return arrange(raw, games);
}

export function saveOrder(os: Platform, ids: string[]) {
  save(key(os), ids);
}

/** `ids` cleaned: only games there are, each once, and the ones missing appended in their order. */
export function arrange(ids: unknown[], games: string[]): string[] {
  const known = new Set(games);
  const kept = [...new Set(ids.filter((x): x is string => typeof x === 'string' && known.has(x)))];
  return [...kept, ...games.filter((g) => !kept.includes(g))];
}

/** The list with the item at `from` taken out and put in at `to` (the others move up or down). */
export function moveTo<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** The games taken off the home screen (the "−" while the apps wiggle): still in the library, search and drawer. */
const hiddenKey = (os: Platform) => `home-hidden-${os}`;

export function loadHidden(os: Platform): string[] {
  const raw = load<unknown>(hiddenKey(os), []);
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
}

export function saveHidden(os: Platform, ids: string[]) {
  save(hiddenKey(os), ids);
}

/** Settings: the home screens as they first were (every game back, the first order). */
export function resetHome() {
  for (const os of ['ios', 'android'] as Platform[]) {
    save(key(os), null);
    save(hiddenKey(os), []);
  }
}
