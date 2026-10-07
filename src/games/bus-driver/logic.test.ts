import { describe, expect, it } from 'vitest';
import type { Card } from '../../lib/cards';
import { judge } from './logic';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });

describe('judge', () => {
  it('round 1: red or black, 1 sip', () => {
    expect(judge(0, [], { q: 'color', color: 'red' }, c(5, 'hearts'))).toEqual({ outcome: 'correct', sips: 1 });
    expect(judge(0, [], { q: 'color', color: 'red' }, c(5, 'clubs'))).toEqual({ outcome: 'wrong', sips: 1 });
    expect(judge(0, [], { q: 'color', color: 'black' }, c(5, 'spades'))).toEqual({ outcome: 'correct', sips: 1 });
  });

  it('round 2: higher or lower, 2 sips, same value drinks 4', () => {
    const hand = [c(8)];
    expect(judge(1, hand, { q: 'higher-lower', dir: 'higher' }, c(14))).toEqual({ outcome: 'correct', sips: 2 });
    expect(judge(1, hand, { q: 'higher-lower', dir: 'higher' }, c(2))).toEqual({ outcome: 'wrong', sips: 2 });
    expect(judge(1, hand, { q: 'higher-lower', dir: 'lower' }, c(2))).toEqual({ outcome: 'correct', sips: 2 });
    expect(judge(1, hand, { q: 'higher-lower', dir: 'lower' }, c(8, 'hearts'))).toEqual({ outcome: 'same', sips: 4 });
  });

  it('round 3: inside or outside, 3 sips, hitting a boundary drinks 6', () => {
    const hand = [c(10), c(4)];
    expect(judge(2, hand, { q: 'inside-outside', where: 'inside' }, c(7))).toEqual({ outcome: 'correct', sips: 3 });
    expect(judge(2, hand, { q: 'inside-outside', where: 'inside' }, c(12))).toEqual({ outcome: 'wrong', sips: 3 });
    expect(judge(2, hand, { q: 'inside-outside', where: 'outside' }, c(2))).toEqual({ outcome: 'correct', sips: 3 });
    expect(judge(2, hand, { q: 'inside-outside', where: 'outside' }, c(4))).toEqual({ outcome: 'same', sips: 6 });
    // Two equal cards: nothing is inside.
    expect(judge(2, [c(9), c(9)], { q: 'inside-outside', where: 'outside' }, c(3))).toEqual({ outcome: 'correct', sips: 3 });
  });

  it('round 4: got the suit already, 4 sips', () => {
    const hand = [c(3, 'hearts'), c(9, 'spades'), c(12, 'hearts')];
    expect(judge(3, hand, { q: 'have-it', has: true }, c(5, 'spades'))).toEqual({ outcome: 'correct', sips: 4 });
    expect(judge(3, hand, { q: 'have-it', has: true }, c(5, 'clubs'))).toEqual({ outcome: 'wrong', sips: 4 });
    expect(judge(3, hand, { q: 'have-it', has: false }, c(5, 'diamonds'))).toEqual({ outcome: 'correct', sips: 4 });
  });

  it('round 5 (risky): exact suit, 5 sips', () => {
    expect(judge(4, [], { q: 'suit', suit: 'clubs' }, c(5, 'clubs'))).toEqual({ outcome: 'correct', sips: 5 });
    expect(judge(4, [], { q: 'suit', suit: 'clubs' }, c(5, 'hearts'))).toEqual({ outcome: 'wrong', sips: 5 });
  });
});
