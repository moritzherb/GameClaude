import { load, save } from '../lib/storage';

/**
 * Host: this room's saved game (after a reload, or coming back to the game screen), read right
 * away, so the first state the guests get is the real one and not an empty one.
 */
export function savedFor<T>(storeKey: string, field: string, isHost: boolean, code: string | null): T | null {
  if (!isHost || !code) return null;
  const saved = load<Record<string, unknown> | null>(storeKey, null);
  return saved && saved.code === code && field in saved ? (saved[field] as T) : null;
}

/** Where the room games keep the host's saved copy (see each game's STORE_KEY and useShared). */
const GAME_STORES = ['speed:match', 'palace:match', 'hose-runter:game', 'ftd:session', 'tr:shared', 'fk:shared'];

/** The host ended the game for everyone: starting one again starts fresh. */
export function forgetSavedGames() {
  for (const key of GAME_STORES) save(key, null);
}
