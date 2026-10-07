import { describe, expect, it } from 'vitest';
import type { Card } from '../../lib/cards';
import { answerRide, startRide } from './ride';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });

describe('bus ride', () => {
  it('advances on correct answers and finishes after the last question', () => {
    let s = startRide([c(5, 'hearts'), c(9), c(7, 'clubs'), c(2, 'hearts'), c(3, 'diamonds')]);
    s = answerRide(s, { q: 'color', color: 'red' }, 5).state;
    s = answerRide(s, { q: 'higher-lower', dir: 'higher' }, 5).state;
    s = answerRide(s, { q: 'inside-outside', where: 'inside' }, 5).state;
    s = answerRide(s, { q: 'have-it', has: true }, 5).state;
    expect(s.streak).toHaveLength(4);
    expect(s.done).toBe(false);
    s = answerRide(s, { q: 'suit', suit: 'diamonds' }, 5).state;
    expect(s.done).toBe(true);
    expect(s.drunk).toBe(0);
    expect(s.attempt).toBe(1);
  });

  it('ends after 4 questions when the suit question is off', () => {
    let s = startRide([c(5, 'hearts'), c(9), c(7, 'clubs'), c(2, 'hearts')]);
    s = answerRide(s, { q: 'color', color: 'red' }, 4).state;
    s = answerRide(s, { q: 'higher-lower', dir: 'higher' }, 4).state;
    s = answerRide(s, { q: 'inside-outside', where: 'inside' }, 4).state;
    s = answerRide(s, { q: 'have-it', has: true }, 4).state;
    expect(s.done).toBe(true);
  });

  it('a wrong answer costs the question number in sips and restarts', () => {
    let s = startRide([c(5, 'hearts'), c(9), c(12), c(4)]);
    s = answerRide(s, { q: 'color', color: 'red' }, 5).state;
    s = answerRide(s, { q: 'higher-lower', dir: 'higher' }, 5).state;
    const step = answerRide(s, { q: 'inside-outside', where: 'inside' }, 5); // 12 is outside 5..9
    expect(step.result).toEqual({ outcome: 'wrong', sips: 3 });
    expect(step.shown).toHaveLength(3);
    expect(step.state.streak).toEqual([]);
    expect(step.state.attempt).toBe(2);
    expect(step.state.drunk).toBe(3);
    // Next card starts the run again at question 1.
    expect(answerRide(step.state, { q: 'color', color: 'black' }, 5).state.streak).toEqual([c(4)]);
  });

  it('same value counts as a miss with double sips', () => {
    let s = startRide([c(8, 'hearts'), c(8, 'clubs')]);
    s = answerRide(s, { q: 'color', color: 'red' }, 5).state;
    const step = answerRide(s, { q: 'higher-lower', dir: 'higher' }, 5);
    expect(step.result).toEqual({ outcome: 'same', sips: 4 });
    expect(step.state.drunk).toBe(4);
    expect(step.state.streak).toEqual([]);
  });

  it('shuffles a new deck when it runs out, without the cards of the current run', () => {
    let s = startRide([c(5, 'hearts')]);
    s = answerRide(s, { q: 'color', color: 'red' }, 5).state;
    const step = answerRide(s, { q: 'higher-lower', dir: 'higher' }, 5, () => [c(5, 'hearts'), c(10)]);
    expect(step.reshuffled).toBe(true);
    expect(step.card).toEqual(c(10));
    expect(step.state.streak).toEqual([c(5, 'hearts'), c(10)]);
  });
});
