import { load, save } from './storage';

const KEY = 'lineup';
/** How many games the home screen shows. */
export const LINEUP_SIZE = 5;
/** A new random line-up every few hours. */
const FRESH_MS = 6 * 60 * 60 * 1000;

/**
 * The games on the home screen: a random handful of the playable ones, kept for a few hours so
 * the list doesn't jump around every time the app opens, then drawn anew (or right away with
 * `fresh`, when home is pulled down).
 */
export function lineup(playable: string[], now = Date.now(), rand: () => number = Math.random, fresh = false): string[] {
  const saved = load<{ at: number; ids: string[] } | null>(KEY, null);
  const ids = saved?.ids.filter((id) => playable.includes(id)) ?? [];
  const want = Math.min(LINEUP_SIZE, playable.length);
  if (!fresh && saved && now - saved.at < FRESH_MS && now >= saved.at && ids.length === want) return ids;
  // Draw anew, preferring games that weren't in the last line-up.
  const shuffled = (list: string[]) =>
    list
      .map((id) => ({ id, r: rand() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.id);
  const unseen = shuffled(playable.filter((id) => !ids.includes(id)));
  const next = [...unseen, ...shuffled(ids)].slice(0, want);
  save(KEY, { at: now, ids: next });
  return next;
}
