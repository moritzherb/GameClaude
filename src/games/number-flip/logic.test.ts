import { describe, expect, it } from 'vitest';
import { canGrow, dailyRolls, flaps, isMove, loseLives, moves, oneDieAllowed, ranking, score } from './logic';

describe('moves', () => {
  it('normal: any open flaps that add up to the roll', () => {
    expect(moves(flaps(9), [3, 4], 'normal')).toEqual([[1, 2, 4], [1, 6], [2, 5], [3, 4], [7]]);
    expect(moves([1, 2, 9], [3, 4], 'normal')).toEqual([]);
  });

  it('hard: only the total, or the two dice', () => {
    expect(moves(flaps(9), [3, 4], 'hard')).toEqual([[7], [3, 4]]);
    // A double only gives its total.
    expect(moves(flaps(9), [3, 3], 'hard')).toEqual([[6]]);
    // On 1–9, a 12 has no flap: only the dice.
    expect(moves(flaps(9), [6, 6], 'hard')).toEqual([]);
    expect(moves(flaps(9), [5, 6], 'hard')).toEqual([[5, 6]]);
    expect(moves(flaps(12), [6, 6], 'hard')).toEqual([[12]]);
    // One die: its own flap.
    expect(moves([1, 2, 5], [5], 'hard')).toEqual([[5]]);
  });

  it('checks picks', () => {
    expect(isMove(flaps(9), [3, 4], 'normal', [4, 3])).toBe(true);
    expect(isMove(flaps(9), [3, 4], 'hard', [1, 6])).toBe(false);
    expect(canGrow(flaps(9), [3, 4], 'normal', [1])).toBe(true);
    expect(canGrow(flaps(9), [3, 4], 'normal', [8])).toBe(false);
    expect(canGrow(flaps(9), [3, 4], 'hard', [1])).toBe(false);
  });
});

describe('the rest', () => {
  it('one die once everything above 6 is down', () => {
    expect(oneDieAllowed([1, 4, 6])).toBe(true);
    expect(oneDieAllowed([1, 7])).toBe(false);
    expect(oneDieAllowed([])).toBe(false);
  });

  it('scores what is left open', () => {
    expect(score([2, 5])).toBe(7);
    expect(score([])).toBe(0);
  });

  it('gives everyone the same daily dice, another day others', () => {
    expect(dailyRolls('2026-11-13', 9)).toEqual(dailyRolls('2026-11-13', 9));
    expect(dailyRolls('2026-11-13', 9)).not.toEqual(dailyRolls('2026-11-14', 9));
    expect(dailyRolls('2026-11-13', 9).flat().every((n) => n >= 1 && n <= 6)).toBe(true);
  });

  it('ranks and takes lives from the highest', () => {
    expect(ranking({ a: 3, b: 9, c: 3 })).toEqual({ best: ['a', 'c'], worst: ['b'] });
    expect(ranking({ a: 4, b: 4 })).toEqual({ best: ['a', 'b'], worst: [] });
    expect(loseLives({ a: 3, b: 1 }, { a: 2, b: 10 })).toEqual({ a: 3, b: 0 });
  });
});
