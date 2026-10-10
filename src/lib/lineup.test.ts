import { beforeEach, describe, expect, it } from 'vitest';
import { lineup, LINEUP_SIZE } from './lineup';

// Tests run without a browser: a plain stand-in for localStorage.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  get length() {
    return store.size;
  },
} as Storage;

const GAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const HOUR = 60 * 60 * 1000;

describe('line-up', () => {
  beforeEach(() => localStorage.clear());

  it('shows five different playable games', () => {
    const ids = lineup(GAMES, 0);
    expect(ids).toHaveLength(LINEUP_SIZE);
    expect(new Set(ids).size).toBe(LINEUP_SIZE);
    expect(ids.every((id) => GAMES.includes(id))).toBe(true);
  });

  it('stays the same for a few hours, then changes', () => {
    const first = lineup(GAMES, 0);
    expect(lineup(GAMES, 5 * HOUR)).toEqual(first);
    const later = lineup(GAMES, 7 * HOUR);
    // The three games left out last time all come in.
    expect(GAMES.filter((id) => !first.includes(id)).every((id) => later.includes(id))).toBe(true);
  });

  it('draws anew when a game in it is gone', () => {
    const first = lineup(GAMES, 0);
    const fewer = GAMES.filter((id) => id !== first[0]);
    const next = lineup(fewer, HOUR);
    expect(next).toHaveLength(LINEUP_SIZE);
    expect(next).not.toContain(first[0]);
  });

  it('copes with fewer games than places', () => {
    expect(lineup(['a', 'b'], 0).sort()).toEqual(['a', 'b']);
  });
});
