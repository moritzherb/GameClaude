import { useCallback, useState } from 'react';

/**
 * A hand sorted the way a player sorts it: the colour (suit, faction) they hold most of on the left,
 * then the next, each low to high; cards of no colour (wild cards, Archmages, Fools) on the right.
 * Equal counts keep the game's own colour order (`order`).
 */
export function sortByColour<T>(cards: T[], colourOf: (c: T) => string | null, valueOf: (c: T) => number, order: readonly string[]): T[] {
  const count = new Map<string, number>();
  for (const c of cards) {
    const k = colourOf(c);
    if (k != null) count.set(k, (count.get(k) ?? 0) + 1);
  }
  const place = (k: string | null) => (k == null ? Infinity : -(count.get(k) ?? 0) * 100 + order.indexOf(k));
  return [...cards].sort((a, b) => place(colourOf(a)) - place(colourOf(b)) || valueOf(a) - valueOf(b));
}

const KEY = 'prost:sort-hand';

/** Whether this phone shows hands sorted (the round button by the hand); remembered for next time. */
export function useSortedHand(): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = useCallback(() => {
    setOn((was) => {
      try {
        localStorage.setItem(KEY, was ? '0' : '1');
      } catch {
        // Private mode: just for now.
      }
      return !was;
    });
  }, []);
  return [on, toggle];
}
