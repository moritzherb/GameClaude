import { describe, expect, it } from 'vitest';
import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';
import { allCards, apply, canPlay, choosable, deal, fits, zone, type Act, type Game, type Side } from './logic';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });
const key = (x: Card) => `${x.value}${x.suit}`;

/** A game in play where seat 0 is up; seat 1 holds some filler. */
function playing(me: Partial<Side>, over: Partial<Game> = {}): Game {
  const g = deal(2, 1, newDeck());
  const side = (s: Partial<Side>): Side => ({ hand: [], up: [null, null, null], down: [null, null, null], ready: true, ...s });
  return {
    ...g,
    phase: 'play',
    sides: [side(me), side({ hand: [c(5, 'hearts'), c(6, 'hearts'), c(8, 'hearts')], down: [c(4, 'hearts'), null, null] })],
    stock: [c(9, 'diamonds'), c(11, 'diamonds'), c(12, 'diamonds')],
    turn: 0,
    ...over,
  };
}

/** Does the game hold every one of the 52 cards exactly once? */
function complete(g: Game) {
  const all = allCards(g).map(key);
  return all.length === 52 && new Set(all).size === 52 && newDeck().every((x) => all.includes(key(x)));
}

describe('Palace', () => {
  it('deals face-down cards first, then six hand cards, one at a time, starting left of the dealer', () => {
    const deck = newDeck();
    const g = deal(3, 1, deck);
    // Left of seat 1 is seat 2, then seat 0, then the dealer.
    expect(g.sides[2].down[0]).toEqual(deck[0]);
    expect(g.sides[0].down[0]).toEqual(deck[1]);
    expect(g.sides[1].down[0]).toEqual(deck[2]);
    expect(g.sides[2].down[1]).toEqual(deck[3]);
    expect(g.sides[2].hand[0]).toEqual(deck[9]);
    for (const s of g.sides) {
      expect(s.down).toHaveLength(3);
      expect(s.hand).toHaveLength(6);
    }
    expect(g.stock).toHaveLength(52 - 27);
    expect(g.turn).toBe(2);
    expect(complete(g)).toBe(true);
  });

  it('everyone puts three hand cards face up; play starts once all are ready', () => {
    let g = deal(2, 0, newDeck());
    const up0 = g.sides[0].hand.slice(0, 3);
    expect(apply(g, 0, { t: 'setup', up: [up0[0], up0[0], up0[1]] })).toBe(g);
    expect(apply(g, 0, { t: 'setup', up: [up0[0], g.sides[1].hand[0], up0[1]] })).toBe(g);
    g = apply(g, 0, { t: 'setup', up: up0 });
    expect(g.sides[0].up).toEqual(up0);
    expect(g.sides[0].hand).toHaveLength(3);
    expect(g.phase).toBe('setup');
    g = apply(g, 1, { t: 'setup', up: g.sides[1].hand.slice(3) });
    expect(g.phase).toBe('play');
    expect(g.turn).toBe(1);
    expect(complete(g)).toBe(true);
  });

  it('same value or higher; several of one value at once; draw back up to three', () => {
    let g = playing({ hand: [c(8), c(8, 'hearts'), c(5)] }, { pile: [c(6)], need: { kind: 'min', v: 6 }, top: 6 });
    expect(apply(g, 0, { t: 'play', cards: [c(5)] })).toBe(g);
    expect(apply(g, 0, { t: 'play', cards: [c(8), c(5)] })).toBe(g);
    g = apply(g, 0, { t: 'play', cards: [c(8), c(8, 'hearts')] });
    expect(g.pile).toHaveLength(3);
    expect(g.need).toEqual({ kind: 'min', v: 8 });
    expect(g.sides[0].hand).toEqual([c(5), c(9, 'diamonds'), c(11, 'diamonds')]);
    expect(g.turn).toBe(1);
  });

  it('7: the next player has to play 7 or lower, then it’s 7 or higher again', () => {
    let g = playing({ hand: [c(7), c(4), c(4, 'hearts')] }, { need: { kind: 'min', v: 5 }, top: 5 });
    g = apply(g, 0, { t: 'play', cards: [c(7)] });
    expect(g.need).toEqual({ kind: 'max7' });
    expect(fits(g.need, 8)).toBe(false);
    expect(fits(g.need, 6)).toBe(true);
    g = apply({ ...g, turn: 0 }, 0, { t: 'play', cards: [c(4)] });
    expect(g.need).toEqual({ kind: 'min', v: 7 });
    // A 7 only goes on 7 or lower.
    expect(fits({ kind: 'min', v: 8 }, 7)).toBe(false);
  });

  it('10 and four of a kind clear the pile; draw up, then play again', () => {
    let g = playing({ hand: [c(10), c(5), c(6)] }, { pile: [c(13), c(14)], need: { kind: 'min', v: 14 }, top: 14 });
    g = apply(g, 0, { t: 'play', cards: [c(10)] });
    expect(g.pile).toEqual([]);
    expect(g.burned).toHaveLength(3);
    expect(g.turn).toBe(0);
    expect(g.again).toBe(true);
    expect(g.sides[0].hand).toHaveLength(3);
    expect(g.need).toEqual({ kind: 'any' });

    const four = [c(4), c(4, 'hearts'), c(4, 'clubs'), c(4, 'diamonds')];
    g = playing({ hand: [...four, c(6)] }, { pile: [c(13)], need: { kind: 'min', v: 13 }, top: 13 });
    expect(canPlay(g, 0)).toBe(true);
    expect(apply(g, 0, { t: 'play', cards: four.slice(0, 3) })).toBe(g);
    g = apply(g, 0, { t: 'play', cards: four });
    expect(g.pile).toEqual([]);
    expect(g.turn).toBe(0);
  });

  it('four of a value in a row on the pile clear it, played one after the other too', () => {
    const queens = [c(12, 'hearts'), c(12, 'clubs'), c(12, 'diamonds')];
    let g = playing({ hand: [c(12), c(5), c(6)] }, { pile: [c(4, 'clubs'), ...queens], need: { kind: 'min', v: 12 }, top: 12 });
    g = apply(g, 0, { t: 'play', cards: [c(12)] });
    expect(g.pile).toEqual([]);
    expect(g.burned).toHaveLength(5);
    expect(g.turn).toBe(0);
    expect(g.again).toBe(true);
    expect(g.sides[0].hand).toHaveLength(3);

    // Two at once onto two.
    g = playing({ hand: [c(9), c(9, 'hearts'), c(5)] }, { pile: [c(9, 'clubs'), c(9, 'diamonds')], need: { kind: 'min', v: 9 }, top: 9 });
    expect(apply(g, 0, { t: 'play', cards: [c(9), c(9, 'hearts')] }).pile).toEqual([]);

    // A 3 in between breaks the row: Q Q 3 Q is not four of a kind.
    g = playing({ hand: [c(12), c(5), c(6)] }, { pile: [c(12, 'hearts'), c(12, 'clubs'), c(3, 'clubs')], need: { kind: 'min', v: 12 }, top: 12 });
    g = apply(g, 0, { t: 'play', cards: [c(12)] });
    expect(g.pile).toHaveLength(4);
    expect(g.turn).toBe(1);
  });

  it('2: start again from 2, play again without drawing first', () => {
    let g = playing({ hand: [c(2), c(5), c(6)] }, { pile: [c(13)], need: { kind: 'min', v: 13 }, top: 13 });
    g = apply(g, 0, { t: 'play', cards: [c(2)] });
    expect(g.pile).toHaveLength(2);
    expect(g.need).toEqual({ kind: 'min', v: 2 });
    expect(g.turn).toBe(0);
    expect(g.sides[0].hand).toEqual([c(5), c(6)]);
    g = apply(g, 0, { t: 'play', cards: [c(5)] });
    expect(g.sides[0].hand).toHaveLength(3);
    expect(g.turn).toBe(1);
  });

  it('3 copies the card below it, specials included', () => {
    let g = playing({ hand: [c(3), c(3, 'hearts'), c(9)] }, { pile: [c(9, 'clubs')], need: { kind: 'min', v: 9 }, top: 9 });
    g = apply(g, 0, { t: 'play', cards: [c(3)] });
    expect(g.need).toEqual({ kind: 'min', v: 9 });
    expect(g.turn).toBe(1);

    g = playing({ hand: [c(3), c(8), c(9)] }, { pile: [c(7, 'clubs')], need: { kind: 'max7' }, top: 7 });
    g = apply(g, 0, { t: 'play', cards: [c(3)] });
    expect(g.need).toEqual({ kind: 'max7' });

    g = playing({ hand: [c(3), c(8), c(9)] }, { pile: [c(2, 'clubs')], need: { kind: 'min', v: 2 }, top: 2 });
    g = apply(g, 0, { t: 'play', cards: [c(3)] });
    expect(g.turn).toBe(0);
    expect(g.again).toBe(true);
  });

  it('can’t play: take the pile, or risk the top card of the stock', () => {
    const base = playing({ hand: [c(4), c(5), c(6)] }, { pile: [c(12, 'clubs'), c(13, 'clubs')], need: { kind: 'min', v: 13 }, top: 13 });
    expect(canPlay(base, 0)).toBe(false);
    expect(apply(base, 0, { t: 'play', cards: [c(6)] })).toBe(base);

    const took = apply(base, 0, { t: 'take' });
    expect(took.sides[0].hand).toHaveLength(5);
    expect(took.pile).toEqual([]);
    expect(took.turn).toBe(1);

    // Risk: the top of the stock is a 9 – too low for the King. Pile and the 9 go to the hand.
    const unlucky = apply(base, 0, { t: 'risk' });
    expect(unlucky.sides[0].hand).toHaveLength(6);
    expect(unlucky.sides[0].hand).toContainEqual(c(9, 'diamonds'));
    expect(unlucky.log.at(-1)).toMatchObject({ k: 'take', how: 'risk', failed: c(9, 'diamonds') });

    const lucky = apply({ ...base, stock: [c(14, 'diamonds'), c(5, 'diamonds')] }, 0, { t: 'risk' });
    expect(lucky.pile.at(-1)).toEqual(c(14, 'diamonds'));
    expect(lucky.sides[0].hand).toHaveLength(3);
    expect(lucky.turn).toBe(1);

    // Risking is allowed even when you could play (to keep your good cards); taking the pile isn't.
    const could = { ...base, need: { kind: 'any' as const } };
    expect(apply(could, 0, { t: 'risk' }).pile.at(-1)).toEqual(c(9, 'diamonds'));
    expect(apply(could, 0, { t: 'take' })).toBe(could);
    const empty = { ...base, stock: [] };
    expect(apply(empty, 0, { t: 'risk' })).toBe(empty);
  });

  it('then the face-up cards, then face-down ones blind; the hand always comes first', () => {
    let g = playing({ hand: [], up: [c(8), c(8, 'hearts'), null], down: [c(4), c(13), null] }, { stock: [], pile: [c(6, 'clubs')], need: { kind: 'min', v: 6 }, top: 6 });
    expect(zone(g.sides[0])).toBe('up');
    expect(choosable(g.sides[0])).toHaveLength(2);
    g = apply(g, 0, { t: 'play', cards: [c(8), c(8, 'hearts')] });
    expect(g.sides[0].up).toEqual([null, null, null]);
    expect(zone(g.sides[0])).toBe('down');

    // Blind: the King fits on the 8s.
    g = apply({ ...g, turn: 0 }, 0, { t: 'blind', i: 1 });
    expect(g.pile.at(-1)).toEqual(c(13));
    // Blind: the 4 doesn't fit on the King: pile and 4 to the hand.
    g = apply({ ...g, turn: 0 }, 0, { t: 'blind', i: 0 });
    expect(g.sides[0].hand).toHaveLength(5);
    expect(zone(g.sides[0])).toBe('hand');
    expect(g.turn).toBe(1);
  });

  it('can’t play a face-up card: take the pile (no risking without a stock)', () => {
    const g = playing({ hand: [], up: [c(4), null, null], down: [c(5), null, null] }, { stock: [], pile: [c(9, 'clubs')], need: { kind: 'min', v: 9 }, top: 9 });
    expect(canPlay(g, 0)).toBe(false);
    expect(apply(g, 0, { t: 'risk' })).toBe(g);
    const took = apply(g, 0, { t: 'take' });
    expect(took.sides[0].hand).toEqual([c(9, 'clubs')]);
    expect(took.sides[0].up).toEqual([c(4), null, null]);
  });

  it('the first player with no cards left wins', () => {
    const g = apply(playing({ hand: [], up: [null, null, null], down: [c(13), null, null] }, { stock: [], pile: [c(6, 'clubs')], need: { kind: 'min', v: 6 }, top: 6 }), 0, {
      t: 'blind',
      i: 0,
    });
    expect(g.phase).toBe('over');
    expect(g.winner).toBe(0);
    // Not even a 10 gets you another turn once you're out.
    const ten = apply(playing({ hand: [c(10)] }, { stock: [] }), 0, { t: 'play', cards: [c(10)] });
    expect(ten.phase).toBe('over');
    expect(ten.again).toBe(false);
  });

  it('only the player whose turn it is moves', () => {
    const g = playing({ hand: [c(5), c(6), c(8)] });
    expect(apply(g, 1, { t: 'play', cards: [c(5, 'hearts')] })).toBe(g);
  });

  it('random games always hold all 52 cards, each once, and end', () => {
    for (let run = 0; run < 300; run++) {
      const players = 2 + (run % 4);
      let g = deal(players, run % players);
      for (let p = 0; p < players; p++) g = apply(g, p, { t: 'setup', up: shuffle(g.sides[p].hand).slice(0, 3) });
      expect(g.phase).toBe('play');
      let moves = 0;
      while (g.phase === 'play' && moves < 3000) {
        const who = g.turn;
        const s = g.sides[who];
        const from = choosable(s);
        const z = zone(s);
        let act: Act;
        if (z === 'down') act = { t: 'blind', i: s.down.findIndex(Boolean) };
        else if (canPlay(g, who)) {
          const ok = from.filter((x) => fits(g.need, x.value, from.filter((y) => y.value === x.value).length));
          // Mostly the lowest card that fits, with all its twins.
          const pickCard = Math.random() < 0.8 ? [...ok].sort((a, b) => a.value - b.value)[0] : shuffle(ok)[0];
          const twins = from.filter((y) => y.value === pickCard.value);
          act = { t: 'play', cards: fits(g.need, pickCard.value) ? twins.slice(0, 1 + Math.floor(Math.random() * twins.length)) : twins };
        } else act = g.stock.length && Math.random() < 0.5 ? { t: 'risk' } : { t: 'take' };
        const after = apply(g, who, act);
        expect(after).not.toBe(g);
        g = after;
        expect(complete(g)).toBe(true);
        g.sides.forEach((x, i) => {
          if (g.stock.length && !(g.again && i === g.turn)) expect(x.hand.length).toBeGreaterThanOrEqual(3);
        });
        moves++;
      }
      expect(g.phase).toBe('over');
    }
  });
});
