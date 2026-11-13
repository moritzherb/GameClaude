import { describe, expect, it } from 'vitest';
import { bid, chooseTrump, legal, maxRounds, newDeck, newGame, playCard, points, takeTrick, trickWinner, type Card, type Game, type Played } from './logic';

const num = (faction: 'fire' | 'water' | 'nature' | 'astral', rank: number, id = rank + faction.length * 100): Card => ({ id, kind: 'number', faction, rank });
const mage = (id: number): Card => ({ id, kind: 'archmage' });
const fool = (id: number): Card => ({ id, kind: 'fool' });
const p = (seat: number, card: Card): Played => ({ seat, card });

describe('fantasy trick-taking', () => {
  it('has 60 distinct cards: 52 numbers, 4 Archmages, 4 Fools', () => {
    const d = newDeck();
    expect(d.length).toBe(60);
    expect(new Set(d.map((c) => c.id)).size).toBe(60);
    expect(d.filter((c) => c.kind === 'archmage').length).toBe(4);
    expect(d.filter((c) => c.kind === 'fool').length).toBe(4);
  });

  it('plays 20, 15, 12, 10 rounds for 3 to 6 players', () => {
    expect([3, 4, 5, 6].map(maxRounds)).toEqual([20, 15, 12, 10]);
  });

  it('deals N cards in round N and turns one for trump', () => {
    const g = newGame(4);
    expect(g.round).toBe(1);
    expect(g.hands.every((h) => h.length === 1)).toBe(true);
    expect(g.dealer).toBe(0);
    // An Archmage turned up: the dealer picks trump first; else bidding starts left of the dealer.
    expect(g.turn).toBe(g.phase === 'trump' ? 0 : 1);
  });

  it('takes trump from a number, none from a Fool, the dealer’s pick from an Archmage', () => {
    // The deck is dealt from its end: 3 players, round 1, then the turned card.
    const base = Array.from({ length: 56 }, (_, i) => num('water', (i % 13) + 1, 500 + i));
    let g = newGame(3, false, [...base, num('fire', 9, 1), num('nature', 2, 2), num('nature', 3, 3), num('nature', 4, 4)]);
    expect(g.turned?.kind).toBe('number');
    g = newGame(3, false, [...base, fool(1), num('nature', 2, 2), num('nature', 3, 3), num('nature', 4, 4)]);
    expect(g.trump).toBeNull();
    g = newGame(3, false, [...base, mage(1), num('nature', 2, 2), num('nature', 3, 3), num('nature', 4, 4)]);
    expect(g.phase).toBe('trump');
    g = chooseTrump(g, g.dealer, 'astral');
    expect(g.trump).toBe('astral');
    expect(g.phase).toBe('bidding');
  });

  it('decides tricks: Archmage, then trump, then the lead faction; all Fools: the first', () => {
    expect(trickWinner([p(0, num('fire', 5)), p(1, mage(1)), p(2, mage(2))], 'water')).toBe(1);
    expect(trickWinner([p(0, num('fire', 13)), p(1, num('water', 2)), p(2, num('fire', 3))], 'water')).toBe(1);
    expect(trickWinner([p(0, num('fire', 3)), p(1, num('nature', 13)), p(2, num('fire', 9))], 'water')).toBe(2);
    expect(trickWinner([p(0, fool(1)), p(1, num('nature', 2)), p(2, num('fire', 9))], null)).toBe(1);
    expect(trickWinner([p(0, fool(1)), p(1, fool(2)), p(2, fool(3))], null)).toBe(0);
  });

  it('makes you follow the lead faction unless you play an Archmage or a Fool', () => {
    const g: Game = { ...newGame(3), phase: 'playing', turn: 1, trick: [p(0, num('fire', 5))], hands: [[], [num('fire', 2, 900), num('water', 9, 901), fool(902), mage(903)], []] };
    const [fire, water, f, m] = g.hands[1];
    expect(legal(g, 1, fire)).toBe(true);
    expect(legal(g, 1, water)).toBe(false);
    expect(legal(g, 1, f)).toBe(true);
    expect(legal(g, 1, m)).toBe(true);
  });

  it('locks bids from 0 to N in turn', () => {
    // A number turned up (not an Archmage, which would have the dealer pick trump first).
    const base = Array.from({ length: 56 }, (_, i) => num('water', (i % 13) + 1, 500 + i));
    let g = newGame(3, false, [...base, num('fire', 9, 1), num('nature', 2, 2), num('nature', 3, 3), num('nature', 4, 4)]);
    expect(bid(g, g.turn, 2)).toBe(g);
    g = bid(g, 1, 1);
    expect(bid(g, 1, 0)).toBe(g);
    g = bid(bid(g, 2, 0), 0, 0);
    expect(g.phase).toBe('playing');
  });

  it('scores 20 + 10 per trick for an exact bid, −10 per trick off otherwise', () => {
    expect(points(2, 2)).toBe(40);
    expect(points(2, 4)).toBe(-20);
    expect(points(0, 0)).toBe(20);
  });

  it('settles the round after the last trick', () => {
    let g: Game = { ...newGame(3), phase: 'playing', turn: 1, trump: null, bids: [0, 1, 0], hands: [[num('fire', 2, 1)], [num('fire', 9, 2)], [num('fire', 4, 3)]] };
    g = playCard(g, 1, 2);
    g = playCard(g, 2, 3);
    g = playCard(g, 0, 1);
    // The trick waits on the table for its winner; nothing more can be played.
    expect(g.taking).toBe(1);
    expect(g.trick.length).toBe(3);
    expect(g.won).toEqual([0, 0, 0]);
    g = takeTrick(g);
    expect(g.won).toEqual([0, 1, 0]);
    expect(g.trick).toEqual([]);
    expect(g.gained).toEqual([20, 30, 20]);
    expect(g.phase).toBe('summary');
  });

  it('lets no card go down while a trick waits to be taken; its winner leads next', () => {
    let g: Game = { ...newGame(3), phase: 'playing', turn: 0, trump: null, bids: [0, 1, 0], hands: [[num('fire', 2, 1), num('water', 2, 11)], [num('fire', 9, 2), num('water', 3, 12)], [num('fire', 4, 3), num('water', 4, 13)]] };
    g = playCard(playCard(playCard(g, 0, 1), 1, 2), 2, 3);
    expect(g.turn).toBe(1);
    expect(legal(g, 1, g.hands[1][0])).toBe(false);
    g = takeTrick(g);
    expect(g.lastTrick?.winner).toBe(1);
    expect(g.phase).toBe('playing');
    expect(legal(g, 1, g.hands[1][0])).toBe(true);
  });

  it('deals each round anew', () => {
    const g = newGame(3);
    expect(g.dealId).toBeGreaterThan(0);
  });
});
