import { describe, expect, it } from 'vitest';
import { newGame, play, slap, slapRule, take, cardCount, type Card, type Game } from './logic';

const c = (value: number, suit: Card['suit'] = 'hearts'): Card => ({ value, suit });
const J = c(0, 'joker');

/** A game with these piles (top first) and this middle. */
const game = (piles: Card[][], middle: Card[] = [], turn = 0): Game => ({
  piles,
  middle,
  turn,
  tries: 0,
  challenger: null,
  claim: null,
  out: piles.map(() => false),
  jokers: true,
  last: null,
  winner: null,
});

describe('Egyptian Rat Screw', () => {
  it('deals every card out, one at a time, starting left of the dealer', () => {
    const g = newGame(3, true);
    expect(cardCount(g)).toBe(54);
    expect(g.piles.map((p) => p.length).sort()).toEqual([18, 18, 18]);
    expect(g.turn).toBe(1);
    expect(newGame(4, false).piles.map((p) => p.length)).toEqual([13, 13, 13, 13]);
  });

  it('knows every slap rule', () => {
    expect(slapRule([c(5), c(5)])).toBe('double');
    expect(slapRule([c(5), c(7), c(5)])).toBe('sandwich');
    expect(slapRule([c(9), c(3), c(4), c(9)])).toBe('top-bottom');
    expect(slapRule([c(3), c(7)])).toBe('tens');
    expect(slapRule([c(14), c(13), c(9)])).toBe('tens');
    expect(slapRule([c(5), c(6), c(7), c(8)])).toBe('run');
    expect(slapRule([c(12), c(13), c(14), c(2)])).toBe('run');
    expect(slapRule([c(8), c(7), c(6), c(5)])).toBe('run');
    expect(slapRule([c(12), c(13)])).toBe('marriage');
    expect(slapRule([c(13), c(12)])).toBe('marriage');
    expect(slapRule([c(4), J])).toBe('joker');
    expect(slapRule([c(4), c(9)])).toBeNull();
    expect(slapRule([c(11), c(2)])).toBeNull();
  });

  it('plays in turn, a number card passing the turn on', () => {
    const g = play(game([[c(2)], [c(3)]]), 0);
    expect(g.middle).toEqual([c(2)]);
    expect(g.turn).toBe(1);
    expect(play(g, 0)).toBe(g);
  });

  it('gives the next player as many tries as the face card says, then the pile to whoever played it', () => {
    let g = game([[c(13), c(2)], [c(3), c(4), c(5), c(6)]]);
    g = play(g, 0);
    expect(g.turn).toBe(1);
    expect(g.tries).toBe(3);
    g = play(g, 1);
    g = play(g, 1);
    expect(g.claim).toBeNull();
    g = play(g, 1);
    expect(g.claim).toBe(0);
    g = take(g, 0);
    expect(g.piles[0]).toEqual([c(2), c(13), c(3), c(4), c(5)]);
    expect(g.turn).toBe(0);
  });

  it('passes the challenge on when it is answered with a face card', () => {
    let g = game([[c(11), c(2)], [c(4), c(12)], [c(5)]]);
    g = play(g, 0);
    expect(g.tries).toBe(1);
    g = play(g, 1);
    expect(g.claim).toBe(0);
    g = game([[c(11)], [c(12)], [c(5), c(6)]]);
    g = play(play(g, 0), 1);
    expect(g.turn).toBe(2);
    expect(g.tries).toBe(2);
    expect(g.challenger).toBe(1);
  });

  it('wins the pile for the first right slap, and a wrong one costs a card under the pile', () => {
    let g = game([[c(9)], [c(5)], [c(6)]], [c(4), c(4)], 2);
    g = slap(g, 1);
    expect(g.piles[1]).toEqual([c(5), c(4), c(4)]);
    expect(g.turn).toBe(1);
    g = game([[c(9)], [c(5)]], [c(3), c(4)]);
    g = slap(g, 0);
    expect(g.piles[0]).toEqual([]);
    expect(g.middle).toEqual([c(9), c(3), c(4)]);
  });

  it('lets a player without cards slap in, and puts them out after a wrong slap', () => {
    let g = game([[], [c(5), c(6)]], [c(8), c(8)], 1);
    g = slap(g, 0);
    expect(g.piles[0].length).toBe(2);
    g = game([[], [c(5)]], [c(8), c(3)], 1);
    g = slap(g, 0);
    expect(g.out[0]).toBe(true);
  });

  it('ends when one player holds every card', () => {
    let g = game([[c(2)], []], [c(7), c(7)], 0);
    g = slap(g, 0);
    expect(g.winner).toBe(0);
  });
});
