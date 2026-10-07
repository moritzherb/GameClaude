import { describe, expect, it } from 'vitest';
import type { Card } from '../../lib/cards';
import { buildPyramid, dealTiebreak, flipTiebreak, layMatches, mostCards, pyramidCardCount, pyramidRows, rowOfFlip, rowSips } from './pyramid';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });

describe('pyramid shape', () => {
  it('counts cards and rows', () => {
    expect(pyramidCardCount(5)).toBe(15);
    expect(pyramidCardCount(3)).toBe(6);
    expect(pyramidRows(5)).toEqual([5, 4, 3, 2, 1]);
  });

  it('maps flips to rows, bottom row first', () => {
    expect([0, 4, 5, 8, 9, 11, 12, 13, 14].map((i) => rowOfFlip(i, 5))).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4]);
  });

  it('sips per row: normal 1-2-3-4-5, tipsy doubles', () => {
    expect([0, 1, 2, 3, 4].map((r) => rowSips(r, false))).toEqual([1, 2, 3, 4, 5]);
    expect([0, 1, 2, 3, 4].map((r) => rowSips(r, true))).toEqual([1, 2, 4, 8, 16]);
  });
});

describe('buildPyramid', () => {
  it('takes cards from the leftover deck', () => {
    const deck = Array.from({ length: 20 }, (_, i) => c((i % 13) + 2));
    const { cards, toppedUp } = buildPyramid(deck, 5);
    expect(cards).toEqual(deck.slice(0, 15));
    expect(toppedUp).toBe(false);
  });

  it('adds a fresh deck when too few cards are left', () => {
    const { cards, toppedUp } = buildPyramid([c(2), c(3)], 5, () => Array.from({ length: 52 }, () => c(9)));
    expect(cards).toHaveLength(15);
    expect(cards.slice(0, 2)).toEqual([c(2), c(3)]);
    expect(toppedUp).toBe(true);
  });
});

describe('laying cards', () => {
  it('removes every matching value from every hand', () => {
    const hands = [[c(7), c(7, 'hearts'), c(3)], [c(9)], [c(7, 'clubs')]];
    const { laid, left } = layMatches(hands, c(7, 'diamonds'));
    expect(laid.map((l) => l.length)).toEqual([2, 0, 1]);
    expect(left).toEqual([[c(3)], [c(9)], []]);
  });

  it('finds who holds the most cards', () => {
    expect(mostCards([[c(2)], [c(3), c(4)], []])).toEqual([1]);
    expect(mostCards([[c(2), c(5)], [c(3), c(4)], []])).toEqual([0, 1]);
    expect(mostCards([[], []])).toEqual([0, 1]);
  });
});

describe('tiebreaker', () => {
  it('first value to show up is safe, last one left drives', () => {
    let s = dealTiebreak(['a', 'b', 'c'], [c(5), c(9), c(12), c(2), c(9, 'hearts'), c(5, 'clubs')]);
    let r = flipTiebreak(s);
    expect(r.safe).toEqual([]);
    expect(r.outcome).toEqual({ kind: 'continue' });
    s = r.state;
    r = flipTiebreak(s); // 9 → b safe
    expect(r.safe).toEqual(['b']);
    expect(r.outcome).toEqual({ kind: 'continue' });
    r = flipTiebreak(r.state); // 5 → a safe, c drives
    expect(r.safe).toEqual(['a']);
    expect(r.outcome).toEqual({ kind: 'driver', id: 'c' });
  });

  it('redoes when the last players are cleared together', () => {
    const s = dealTiebreak(['a', 'b'], [c(5), c(5, 'hearts'), c(5, 'clubs'), c(9)]);
    expect(flipTiebreak(s).outcome).toEqual({ kind: 'redo', ids: ['a', 'b'] });
  });

  it('redoes when the deck runs dry', () => {
    const s = dealTiebreak(['a', 'b'], [c(5), c(6), c(9)]);
    expect(flipTiebreak(s).outcome).toEqual({ kind: 'redo', ids: ['a', 'b'] });
  });
});
