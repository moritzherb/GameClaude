import { describe, expect, it } from 'vitest';
import { newDeck, type Card } from '../../lib/cards';
import { deal, draw, faceDown, newGame, nextRound, place, takeDiscard, toss, usable, type Game } from './logic';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });

/** A game in the place phase where player 0 holds `hand` and has these face-down cards. */
function holding(hand: Card, slots: Card[], up: number[] = []): Game {
  const g = newGame(1, newDeck());
  return { ...g, turn: 0, hand, phase: 'place', sides: [slots.map((card, i) => ({ card, up: up.includes(i) })), g.sides[1]], sizes: [slots.length, 10] };
}

describe('Trash', () => {
  it('deals 10 each, starting with the player who isn’t dealing; they start', () => {
    const deck = newDeck();
    const g = newGame(1, deck);
    expect(g.sides[0]).toHaveLength(10);
    expect(g.sides[1]).toHaveLength(10);
    expect(g.sides[0][0].card).toEqual(deck[0]);
    expect(g.sides[1][0].card).toEqual(deck[1]);
    expect(g.stock).toHaveLength(32);
    expect(g.turn).toBe(0);
  });

  it('a card goes into its slot and the card under it is played next', () => {
    let g = holding(c(3), [c(9), c(12), c(1 + 4), c(2), c(6), c(7), c(8), c(10), c(13), c(13)]);
    g = place(g);
    expect(g.sides[0][2]).toEqual({ card: c(3), up: true });
    expect(g.hand).toEqual(c(5));
    g = place(g);
    expect(g.sides[0][4].up).toBe(true);
    expect(g.hand).toEqual(c(6));
  });

  it('Aces go into slot 1; Queens and Kings are useless', () => {
    const g = holding(c(14), Array.from({ length: 10 }, () => c(12)));
    expect(usable(g, 0, c(14))).toBe(true);
    expect(usable(g, 0, c(12))).toBe(false);
    expect(usable(g, 0, c(13))).toBe(false);
    expect(place(g).sides[0][0].up).toBe(true);
  });

  it('a Jack goes into whichever face-down slot you pick', () => {
    let g = holding(c(11), Array.from({ length: 10 }, () => c(13)), [0]);
    expect(place(g)).toBe(g); // a slot has to be chosen
    expect(place(g, 0)).toBe(g); // already face up
    g = place(g, 7);
    expect(g.sides[0][7]).toEqual({ card: c(11), up: true });
  });

  it('an unusable card goes on the discard pile and the turn passes', () => {
    let g = holding(c(4), Array.from({ length: 10 }, () => c(13)), [3]);
    expect(place(g)).toBe(g);
    g = toss(g);
    expect(g.discard.at(-1)).toEqual(c(4));
    expect(g.turn).toBe(1);
    expect(g.phase).toBe('draw');
  });

  it('cards above your slot count are useless too', () => {
    const g = holding(c(10), Array.from({ length: 9 }, () => c(13)));
    expect(usable(g, 0, c(10))).toBe(false);
    expect(usable(g, 0, c(9))).toBe(true);
  });

  it('you may take the discard only if you can use it', () => {
    let g = newGame(0, newDeck());
    g = { ...g, discard: [c(13)] };
    expect(takeDiscard(g)).toBe(g);
    g = { ...g, discard: [c(13), { ...g.sides[1][4].card, value: 5 }] };
    expect(takeDiscard(g).hand?.value).toBe(5);
  });

  it('draws from the stock, reshuffling the discard pile when it runs out', () => {
    let g = newGame(1, newDeck());
    g = { ...g, stock: [], discard: [c(2), c(3), c(4)] };
    g = draw(g, (x) => [...x]);
    expect(g.hand).toEqual(c(2));
    expect(g.stock).toEqual([c(3)]);
    expect(g.discard).toEqual([c(4)]);
  });

  it('turning everything over wins the round; the winner gets one fewer, deals, the loser starts', () => {
    let g = holding(c(14), [c(2), c(13)]);
    g = place(place(g));
    expect(g.phase).toBe('round-over');
    expect(g.winner).toBe(0);
    g = nextRound(g, newDeck());
    expect(g.sizes).toEqual([1, 10]);
    expect(g.sides[0]).toHaveLength(1);
    expect(g.dealer).toBe(0);
    expect(g.turn).toBe(1);
    expect(g.round).toBe(2);
  });

  it('winning a round with one card wins the game', () => {
    const g = place(holding(c(14), [c(13)]));
    expect(g.phase).toBe('game-over');
    expect(g.winner).toBe(0);
    expect(faceDown(g, 0)).toBe(0);
  });

  it('deals uneven sizes', () => {
    const g = deal([7, 10], 1, 3, newDeck());
    expect(g.sides[0]).toHaveLength(7);
    expect(g.sides[1]).toHaveLength(10);
    expect(g.stock).toHaveLength(52 - 17);
  });
});
