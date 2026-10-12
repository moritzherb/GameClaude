import { describe, expect, it } from 'vitest';
import type { Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';
import { allCards, canPlay, giveBack, hasPlay, newGame, nextRound, pass, play, ranksFrom, shortDeck, type Game } from './logic';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });
const key = (x: Card) => `${x.value}${x.suit}`;

/** Does the game hold all 32 cards, each once? */
function complete(g: Game) {
  const all = allCards(g).map(key);
  return all.length === 32 && new Set(all).size === 32 && shortDeck().every((x) => all.includes(key(x)));
}

/** A game in play with these hands, seat 0 up, nothing on the table. */
function playing(hands: Card[][], over: Partial<Game> = {}): Game {
  return { ...newGame(hands.length), hands, turn: 0, ...over };
}

describe('President', () => {
  it('deals all 32 cards (7 to Ace); whoever holds the 7 of clubs starts', () => {
    for (const n of [3, 4, 5, 6]) {
      const g = newGame(n);
      expect(complete(g)).toBe(true);
      const sizes = g.hands.map((h) => h.length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(g.hands[g.turn].some((x) => x.value === 7 && x.suit === 'clubs')).toBe(true);
    }
  });

  it('plays the same number of cards, one higher value; passing costs a sip', () => {
    let g = playing([[c(8), c(8, 'hearts'), c(12)], [c(9), c(9, 'hearts'), c(7)], [c(10), c(11), c(13)]]);
    expect(canPlay(g, 1, [c(9)])).toBe(false); // not their turn
    g = play(g, 0, [c(8), c(8, 'hearts')]);
    expect(g.turn).toBe(1);
    expect(canPlay(g, 1, [c(9)])).toBe(false); // one card on a pair
    expect(canPlay(g, 1, [c(9), c(9, 'hearts')])).toBe(true);
    g = play(g, 1, [c(9), c(9, 'hearts')]);
    expect(hasPlay(g, 2)).toBe(false);
    g = pass(g, 2);
    expect(g.sips[2].drunk).toBe(1);
    expect(g.turn).toBe(0);
    g = pass(g, 0);
    // Everyone else passed: seat 1 closes the trick, hands out a sip and leads.
    expect(g.trick).toHaveLength(0);
    expect(g.sips[1].given).toBe(1);
    expect(g.turn).toBe(1);
    expect(g.log.at(-1)).toEqual({ k: 'close', by: 1 });
  });

  it('an Ace closes the trick right away', () => {
    let g = playing([[c(13), c(7)], [c(14), c(8)], [c(9), c(10)]]);
    g = play(g, 0, [c(13)]);
    g = play(g, 1, [c(14)]);
    expect(g.trick).toHaveLength(0);
    expect(g.turn).toBe(1);
    expect(g.sips[1].given).toBe(1);
  });

  it('out of cards: out, and the round ends when one player is left (the Arschloch)', () => {
    let g = playing([[c(10)], [c(11), c(7)], [c(12), c(8)]]);
    g = play(g, 0, [c(10)]);
    expect(g.out).toEqual([0]);
    g = play(g, 1, [c(11)]);
    g = play(g, 2, [c(12)]);
    // Seat 0 is out: seat 1 is next, passes; the trick closes, seat 2 leads.
    expect(g.turn).toBe(1);
    g = pass(g, 1);
    expect(g.turn).toBe(2);
    g = play(g, 2, [c(8)]);
    expect(g.phase).toBe('done');
    expect(g.out).toEqual([0, 2, 1]);
    expect(ranksFrom(g.out)).toEqual(['president', 'arschloch', 'citizen']);
    // End of round: the Arschloch drinks 3, the President hands out 3 (plus the sips before).
    expect(g.sips[1].drunk).toBe(1 + 3);
    expect(g.sips[0].given).toBe(3);
  });

  it('ranks with 4 and more: President, Vice, citizens, Vice Arschloch, Arschloch', () => {
    expect(ranksFrom([2, 0, 3, 1])).toEqual(['vice', 'arschloch', 'president', 'vice-arschloch']);
    expect(ranksFrom([4, 3, 2, 1, 0])).toEqual(['arschloch', 'vice-arschloch', 'citizen', 'vice', 'president']);
  });

  it('next round: the Arschloch’s 2 best go to the President, who gives any 2 back; the Arschloch starts', () => {
    const done: Game = { ...newGame(4), phase: 'done', out: [2, 0, 3, 1] };
    const g = nextRound(done);
    expect(complete(g)).toBe(true);
    expect(g.phase).toBe('exchange');
    expect(g.turn).toBe(1);
    // The President (seat 2) got the two best cards in the Arschloch's hand.
    const asshole = g.hands[1];
    expect(g.got[2]).toHaveLength(2);
    expect(Math.min(...g.got[2].map((x) => x.value))).toBeGreaterThanOrEqual(Math.max(...asshole.map((x) => x.value)));
    expect(g.got[0]).toHaveLength(1);
    expect(g.owed).toEqual([
      { from: 2, to: 1, n: 2 },
      { from: 0, to: 3, n: 1 },
    ]);
    // Play only starts once both have given back.
    const back = g.hands[2].slice(0, 2);
    let h = giveBack(g, 2, back.slice(0, 1));
    expect(h).toBe(g);
    h = giveBack(g, 2, back);
    expect(h.phase).toBe('exchange');
    expect(back.every((x) => h.hands[1].some((y) => key(y) === key(x)))).toBe(true);
    h = giveBack(h, 0, [h.hands[0][0]]);
    expect(h.phase).toBe('play');
    expect(complete(h)).toBe(true);
    expect(h.hands.map((x) => x.length)).toEqual(g.hands.map((x, s) => x.length + (s === 1 ? 2 : s === 3 ? 1 : s === 2 ? -2 : -1)));
  });

  it('random games keep all 32 cards and always end; ranks every round', () => {
    for (let run = 0; run < 400; run++) {
      const n = 3 + (run % 4);
      let g = newGame(n);
      for (let round = 0; round < 3; round++) {
        if (round) {
          g = nextRound(g);
          while (g.phase === 'exchange') g = giveBack(g, g.owed[0].from, shuffle(g.hands[g.owed[0].from]).slice(0, g.owed[0].n));
        }
        let moves = 0;
        while (g.phase === 'play' && moves < 500) {
          const who = g.turn;
          const top = g.trick.at(-1);
          const counts = new Map<number, Card[]>();
          for (const x of g.hands[who]) counts.set(x.value, [...(counts.get(x.value) ?? []), x]);
          const options = [...counts.values()].filter((cs) => (top ? cs[0].value > top.cards[0].value && cs.length >= top.cards.length : true));
          const before = g;
          if (options.length && (!top || Math.random() < 0.8)) {
            const cs = options[Math.floor(Math.random() * options.length)];
            g = play(g, who, cs.slice(0, top ? top.cards.length : 1 + Math.floor(Math.random() * cs.length)));
          } else g = pass(g, who);
          expect(g).not.toBe(before);
          expect(complete(g)).toBe(true);
          moves++;
        }
        expect(g.phase).toBe('done');
        expect(new Set(g.out).size).toBe(n);
      }
    }
    // Hundreds of whole games: give a slow machine time.
  }, 30_000);
});
