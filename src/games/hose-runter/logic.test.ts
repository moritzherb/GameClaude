import { describe, expect, it } from 'vitest';
import type { Card, Suit } from '../../lib/cards';
import { applyAction, canStop, deal, endRound, hoseDeck, newGame, scoreHand, viewFor, type GameState } from './logic';

const c = (value: number, suit: Suit = 'spades'): Card => ({ value, suit });
const players = ['a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase(), avatar: '🙂', color: '#fff' }));

/** A deck whose first cards are dealt in order: left of dealer first, dealer last, then the rest. */
function stacked(...cards: Card[]) {
  const rest = hoseDeck().filter((x) => !cards.some((y) => y.value === x.value && y.suit === x.suit));
  return [...cards, ...rest];
}

function gameWithDealer(dealerId: string, deck: Card[]): GameState {
  const g = newGame(players, deck);
  return deal({ ...g, dealerId }, deck);
}

describe('scoring', () => {
  it('uses 32 cards from 7 to ace', () => {
    const d = hoseDeck();
    expect(d).toHaveLength(32);
    expect(Math.min(...d.map((x) => x.value))).toBe(7);
  });

  it('adds up only one suit', () => {
    expect(scoreHand([c(7, 'hearts'), c(10, 'hearts'), c(8, 'diamonds')])).toEqual({ points: 17, kind: 'suit' });
    expect(scoreHand([c(13, 'clubs'), c(12, 'clubs'), c(14, 'hearts')])).toEqual({ points: 20, kind: 'suit' });
    expect(scoreHand([c(7, 'hearts'), c(8, 'clubs'), c(9, 'spades')])).toEqual({ points: 9, kind: 'suit' });
  });

  it('31 is Hose runter', () => {
    expect(scoreHand([c(10, 'hearts'), c(13, 'hearts'), c(14, 'hearts')])).toEqual({ points: 31, kind: 'hose' });
  });

  it('three of a kind is 30½, three aces is Feuer', () => {
    expect(scoreHand([c(7, 'hearts'), c(7, 'clubs'), c(7, 'spades')])).toEqual({ points: 30.5, kind: 'triple' });
    expect(scoreHand([c(12, 'hearts'), c(12, 'clubs'), c(12, 'spades')])).toEqual({ points: 30.5, kind: 'triple' });
    expect(scoreHand([c(14, 'hearts'), c(14, 'clubs'), c(14, 'spades')])).toEqual({ points: 33, kind: 'feuer' });
  });
});

describe('dealing and the dealer’s choice', () => {
  // Dealer a: b gets cards 1-3, c gets 4-6, a gets 7-9, then 10-12 are next.
  const deck = stacked(
    c(7, 'hearts'), c(8, 'hearts'), c(9, 'clubs'), // b
    c(7, 'clubs'), c(8, 'clubs'), c(9, 'diamonds'), // c
    c(7, 'spades'), c(8, 'spades'), c(9, 'spades'), // a (dealer)
    c(10, 'diamonds'), c(12, 'diamonds'), c(13, 'clubs'), // next three
  );

  it('deals left of the dealer first, dealer last', () => {
    const g = gameWithDealer('a', deck);
    expect(g.phase).toBe('dealer');
    expect(g.hands.b).toEqual([c(7, 'hearts'), c(8, 'hearts'), c(9, 'clubs')]);
    expect(g.hands.a).toEqual([c(7, 'spades'), c(8, 'spades'), c(9, 'spades')]);
    expect(g.turnId).toBe('a');
  });

  it('keep: next three go to the middle, play starts left of the dealer', () => {
    const g = applyAction(gameWithDealer('a', deck), 'a', { type: 'keep' });
    expect(g.middle).toEqual([c(10, 'diamonds'), c(12, 'diamonds'), c(13, 'clubs')]);
    expect(g.hands.a).toEqual([c(7, 'spades'), c(8, 'spades'), c(9, 'spades')]);
    expect(g.phase).toBe('turns');
    expect(g.turnId).toBe('b');
  });

  it('toss: dealer’s cards go to the middle, dealer must take the next three', () => {
    const g = applyAction(gameWithDealer('a', deck), 'a', { type: 'toss' });
    expect(g.middle).toEqual([c(7, 'spades'), c(8, 'spades'), c(9, 'spades')]);
    expect(g.hands.a).toEqual([c(10, 'diamonds'), c(12, 'diamonds'), c(13, 'clubs')]);
  });

  it('only the dealer can choose', () => {
    const g = gameWithDealer('a', deck);
    expect(applyAction(g, 'b', { type: 'keep' })).toBe(g);
  });
});

describe('turns', () => {
  const deck = stacked(
    c(7, 'hearts'), c(8, 'hearts'), c(9, 'clubs'), // b
    c(7, 'clubs'), c(8, 'clubs'), c(9, 'diamonds'), // c
    c(7, 'spades'), c(8, 'spades'), c(9, 'spades'), // a (dealer)
    c(10, 'hearts'), c(12, 'diamonds'), c(13, 'clubs'), // middle
  );
  const start = () => applyAction(gameWithDealer('a', deck), 'a', { type: 'keep' });

  it('swap one card with the middle', () => {
    const g = applyAction(start(), 'b', { type: 'swap1', hand: 2, middle: 0 });
    expect(g.hands.b).toEqual([c(7, 'hearts'), c(8, 'hearts'), c(10, 'hearts')]);
    expect(g.middle[0]).toEqual(c(9, 'clubs'));
    expect(g.turnId).toBe('c');
    expect(g.log.at(-1)).toEqual({ by: 'b', kind: 'swap1', gave: c(9, 'clubs'), took: c(10, 'hearts') });
  });

  it('swap all three', () => {
    const g = applyAction(start(), 'b', { type: 'swapAll' });
    expect(g.hands.b).toEqual([c(10, 'hearts'), c(12, 'diamonds'), c(13, 'clubs')]);
    expect(g.middle).toEqual([c(7, 'hearts'), c(8, 'hearts'), c(9, 'clubs')]);
  });

  it('only the player whose turn it is can act', () => {
    const g = start();
    expect(applyAction(g, 'c', { type: 'swapAll' })).toBe(g);
  });

  it('no Stop in the first round of turns', () => {
    let g = start();
    expect(canStop(g, 'b')).toBe(false);
    expect(applyAction(g, 'b', { type: 'stop' })).toBe(g);
    g = applyAction(g, 'b', { type: 'swapAll' });
    g = applyAction(g, 'c', { type: 'swapAll' });
    g = applyAction(g, 'a', { type: 'swapAll' });
    expect(canStop(g, 'b')).toBe(true);
    expect(viewFor(g, 'b').firstLap).toBe(false);
  });

  it('after a Stop everyone else gets one more turn, then the round ends', () => {
    let g = start();
    g = applyAction(g, 'b', { type: 'swapAll' });
    g = applyAction(g, 'c', { type: 'swapAll' });
    g = applyAction(g, 'a', { type: 'swapAll' });
    g = applyAction(g, 'b', { type: 'stop' });
    expect(g.stopperId).toBe('b');
    expect(g.turnId).toBe('c');
    g = applyAction(g, 'c', { type: 'swap1', hand: 0, middle: 0 });
    expect(g.phase).toBe('turns');
    g = applyAction(g, 'a', { type: 'swap1', hand: 0, middle: 0 });
    expect(g.phase).toBe('reveal');
    expect(g.result?.endedBy).toBe('stop');
  });

  it('Hose runter ends the round at once', () => {
    const d = stacked(
      c(10, 'hearts'), c(13, 'hearts'), c(7, 'clubs'), // b needs the ace of hearts
      c(7, 'diamonds'), c(8, 'clubs'), c(9, 'diamonds'), // c
      c(7, 'spades'), c(8, 'spades'), c(9, 'spades'), // a
      c(14, 'hearts'), c(12, 'diamonds'), c(8, 'diamonds'), // middle
    );
    let g = applyAction(gameWithDealer('a', d), 'a', { type: 'keep' });
    g = applyAction(g, 'b', { type: 'swap1', hand: 2, middle: 0 });
    expect(g.phase).toBe('reveal');
    expect(g.result).toMatchObject({ endedBy: 'hose', by: 'b' });
    // c: 9♦ + 7♦ = 16, a: 7+8+9♠ = 24 → c loses a life
    expect(g.result?.losers).toEqual(['c']);
  });

  it('being dealt Feuer ends the round right after the dealer’s choice', () => {
    const d = stacked(
      c(14, 'hearts'), c(14, 'clubs'), c(14, 'spades'), // b
      c(7, 'diamonds'), c(8, 'clubs'), c(9, 'diamonds'), // c
      c(7, 'spades'), c(8, 'spades'), c(9, 'spades'), // a
    );
    const g = applyAction(gameWithDealer('a', d), 'a', { type: 'keep' });
    expect(g.result).toMatchObject({ endedBy: 'feuer', by: 'b' });
  });
});

describe('lives', () => {
  const at = (lives: Record<string, number>, extraLifeGiven = false): GameState => {
    const g = newGame(players, stacked());
    return {
      ...g,
      extraLifeGiven,
      phase: 'turns',
      seats: g.seats.map((s) => ({ ...s, lives: lives[s.id] })),
      hands: { a: [c(7, 'hearts'), c(8, 'clubs'), c(9, 'spades')], b: [c(7, 'clubs'), c(8, 'hearts'), c(9, 'diamonds')], c: [c(14, 'hearts'), c(13, 'hearts'), c(12, 'clubs')] },
    };
  };

  it('everyone tied for lowest loses a life', () => {
    const r = endRound(at({ a: 5, b: 5, c: 5 }), null);
    expect(r.result?.losers.sort()).toEqual(['a', 'b']);
    expect(r.seats.map((s) => s.lives)).toEqual([4, 4, 5]);
  });

  it('the first player to hit 0 gets one extra life, later ones are out', () => {
    let r = endRound(at({ a: 1, b: 3, c: 5 }), null);
    expect(r.result?.extraLife).toEqual(['a']);
    expect(r.seats.find((s) => s.id === 'a')).toMatchObject({ lives: 1, out: false });
    expect(r.extraLifeGiven).toBe(true);

    r = endRound(at({ a: 1, b: 1, c: 5 }, true), null);
    expect(r.result?.out.sort()).toEqual(['a', 'b']);
    expect(r.phase).toBe('over');
    expect(r.winnerId).toBe('c');
  });

  it('players who are out are skipped for dealing and turns', () => {
    const g = newGame(players, stacked());
    const s: GameState = { ...g, phase: 'reveal', dealerId: 'a', seats: g.seats.map((x) => (x.id === 'b' ? { ...x, out: true, lives: 0 } : x)) };
    const n = applyAction(s, 'a', { type: 'next' });
    expect(n.dealerId).toBe('c');
    expect(Object.keys(n.hands).sort()).toEqual(['a', 'c']);
    expect(n.round).toBe(s.round + 1);
  });
});

describe('what each phone sees', () => {
  it('your own cards only', () => {
    const g = newGame(players);
    expect(viewFor(g, 'b').hand).toEqual(g.hands.b);
    expect(JSON.stringify(viewFor(g, 'b'))).not.toContain(JSON.stringify(g.hands.c));
    expect(viewFor(g, 'spectator').hand).toEqual([]);
  });
});
