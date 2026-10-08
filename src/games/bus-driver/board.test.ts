import { describe, expect, it } from 'vitest';
import type { Card } from '../../lib/cards';
import { allowedSlots, answerBoard, startBoard } from './board';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });
const extra = Array.from({ length: 20 }, (_, i) => c((i % 13) + 2, 'clubs'));

describe('diamond 1-2-3-2-1', () => {
  // rows: [5♥] [9, 3] [12, 8, 2] [14, 7] [10]
  const deck = [c(5, 'hearts'), c(9), c(3), c(12), c(8), c(2), c(14), c(7), c(10), ...extra];

  it('lays out the diamond', () => {
    const s = startBoard('diamond', deck);
    expect(s.cards.map((r) => r.length)).toEqual([1, 2, 3, 2, 1]);
  });

  it('only allows the cards above the path', () => {
    let s = startBoard('diamond', deck);
    expect(allowedSlots(s)).toEqual([0]);
    s = answerBoard(s, 0, { q: 'color', color: 'red' })!.state;
    expect(allowedSlots(s)).toEqual([0, 1]);
    s = answerBoard(s, 1, { q: 'higher-lower', dir: 'lower' })!.state; // right: 3 < 5
    expect(allowedSlots(s)).toEqual([1, 2]);
    s = answerBoard(s, 2, { q: 'higher-lower', dir: 'lower' })!.state; // 2 < 3, right card of the 3-row
    expect(allowedSlots(s)).toEqual([1]); // right card in the 3-row → only the right card above
    s = answerBoard(s, 1, { q: 'higher-lower', dir: 'higher' })!.state; // 7 > 2
    expect(allowedSlots(s)).toEqual([0]);
    const last = answerBoard(s, 0, { q: 'higher-lower', dir: 'higher' })!; // 10 > 7
    expect(last.outcome).toBe('correct');
    expect(last.state.done).toBe(true);
    expect(last.state.drunk).toBe(0);
  });

  it('follows the road: middle of the 3-row may go either way, the edges only one way', () => {
    let s = startBoard('diamond', deck);
    s = answerBoard(s, 0, { q: 'color', color: 'red' })!.state;
    s = answerBoard(s, 0, { q: 'higher-lower', dir: 'higher' })!.state; // left: 9 > 5
    expect(allowedSlots(s)).toEqual([0, 1]);
    const left = answerBoard(s, 0, { q: 'higher-lower', dir: 'higher' })!.state; // Q > 9, left card
    expect(allowedSlots(left)).toEqual([0]);
    const middle = answerBoard(s, 1, { q: 'higher-lower', dir: 'lower' })!.state; // 8 < 9, middle card
    expect(allowedSlots(middle)).toEqual([0, 1]);
  });

  it('rejects a card off the path or the wrong question', () => {
    let s = startBoard('diamond', deck);
    s = answerBoard(s, 0, { q: 'color', color: 'red' })!.state;
    s = answerBoard(s, 0, { q: 'higher-lower', dir: 'higher' })!.state; // left: 9 > 5
    expect(answerBoard(s, 2, { q: 'higher-lower', dir: 'higher' })).toBe(null);
    expect(answerBoard(s, 0, { q: 'color', color: 'red' })).toBe(null);
  });

  it('a miss costs the row number and covers every turned card', () => {
    let s = startBoard('diamond', deck);
    s = answerBoard(s, 0, { q: 'color', color: 'red' })!.state;
    s = answerBoard(s, 0, { q: 'higher-lower', dir: 'higher' })!.state; // 9 > 5
    const miss = answerBoard(s, 1, { q: 'higher-lower', dir: 'higher' })!; // 8 < 9 → wrong
    expect(miss.outcome).toBe('wrong');
    expect(miss.sips).toBe(3);
    expect(miss.state.drunk).toBe(3);
    expect(miss.state.attempt).toBe(2);
    expect(miss.state.path).toEqual([]);
    // the three turned cards are covered by the next deck cards; the rest stays
    expect(miss.state.cards[0][0]).toEqual(extra[0]);
    expect(miss.state.cards[1]).toEqual([extra[1], c(3)]);
    expect(miss.state.cards[2]).toEqual([c(12), extra[2], c(2)]);
    expect(miss.shown.up[2][1]).toBe(true);
  });

  it('same value counts as a miss with double sips', () => {
    const s0 = startBoard('diamond', [c(5, 'hearts'), c(5, 'clubs'), c(3), ...extra]);
    const s = answerBoard(s0, 0, { q: 'color', color: 'red' })!.state;
    const miss = answerBoard(s, 0, { q: 'higher-lower', dir: 'higher' })!;
    expect(miss.outcome).toBe('same');
    expect(miss.sips).toBe(4);
  });
});

describe('zigzag 1-2-1-2-1', () => {
  // rows: [5♥] [9, 3] [K♦] [2, 14] [7♠]
  const deck = [c(5, 'hearts'), c(9), c(3), c(13, 'diamonds'), c(2), c(14), c(7), ...extra];

  it('asks red/black on single cards and higher/lower on pairs', () => {
    let s = startBoard('zigzag', deck);
    s = answerBoard(s, 0, { q: 'color', color: 'red' })!.state;
    expect(allowedSlots(s)).toEqual([0, 1]);
    s = answerBoard(s, 1, { q: 'higher-lower', dir: 'lower' })!.state; // 3 < 5
    expect(allowedSlots(s)).toEqual([0]);
    s = answerBoard(s, 0, { q: 'color', color: 'red' })!.state; // K♦
    s = answerBoard(s, 1, { q: 'higher-lower', dir: 'higher' })!.state; // A > K
    const last = answerBoard(s, 0, { q: 'color', color: 'black' })!; // 7♠
    expect(last.state.done).toBe(true);
  });

  it('wrong at row 5 costs 5 sips', () => {
    let s = startBoard('zigzag', deck);
    s = answerBoard(s, 0, { q: 'color', color: 'red' })!.state;
    s = answerBoard(s, 1, { q: 'higher-lower', dir: 'lower' })!.state;
    s = answerBoard(s, 0, { q: 'color', color: 'red' })!.state;
    s = answerBoard(s, 1, { q: 'higher-lower', dir: 'higher' })!.state;
    const miss = answerBoard(s, 0, { q: 'color', color: 'red' })!;
    expect(miss.sips).toBe(5);
    expect(miss.state.path).toEqual([]);
  });

  it('shuffles a new deck when it runs out, without cards already on the board', () => {
    const s0 = startBoard('zigzag', [c(5, 'hearts'), c(9), c(3), c(13, 'diamonds'), c(2), c(14), c(7)]);
    const miss = answerBoard(s0, 0, { q: 'color', color: 'black' }, () => [c(9), c(11, 'hearts')])!;
    expect(miss.reshuffled).toBe(true);
    expect(miss.state.cards[0][0]).toEqual(c(11, 'hearts'));
  });
});
