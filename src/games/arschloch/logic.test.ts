import { describe, expect, it } from 'vitest';
import type { Card } from '../../lib/cards';
import { ACE, call, cardCount, draw, lowestClaim, newGame, options, play, shortDeck, type Game } from './logic';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });

/** A game where seat 0 is up, with these hands and an empty circle (unless given). */
function playing(hands: Card[][], over: Partial<Game> = {}): Game {
  return { ...newGame(hands.length, 0, []), hands, ...over };
}

describe('Arschloch', () => {
  it('starts with all 32 cards (7 to Ace) in the circle; with an empty hand you draw, then play', () => {
    let g = newGame(3);
    expect(g.ring).toHaveLength(32);
    expect(new Set(g.ring.map((x) => `${x!.value}${x!.suit}`)).size).toBe(32);
    expect(options(g, 0)).toEqual({ call: false, draw: true, play: false, mustCall: false });
    expect(draw(g, 1, 0)).toBe(g); // not their turn
    const card = g.ring[5]!;
    g = draw(g, 0, 5);
    expect(g.ring[5]).toBeNull();
    expect(g.hands[0]).toEqual([card]);
    expect(options(g, 0).draw).toBe(false);
    g = play(g, 0, card, 9);
    expect(g.pile).toEqual([{ card, claim: 9, by: 0 }]);
    expect(g.turn).toBe(1);
    expect(cardCount(g)).toBe(32);
  });

  it('says the same value or higher; you may lie', () => {
    let g = playing([[c(7)], [c(8)], [c(9)]], { pile: [{ card: c(10), claim: 10, by: 2 }], canCall: true });
    expect(lowestClaim(g)).toBe(10);
    expect(play(g, 0, c(7), 9)).toBe(g);
    g = play(g, 0, c(7), 10);
    expect(g.pile.at(-1)).toEqual({ card: c(7), claim: 10, by: 0 });
    g = play(g, 1, c(8), ACE);
    expect(lowestClaim(g)).toBe(ACE);
  });

  it('a lie turned over: the liar takes the pile and drinks a sip per card; the caller carries on', () => {
    let g = playing([[c(7)], [c(8), c(12)], [c(9)]]);
    g = play(g, 0, c(7), 13); // a lie
    expect(options(g, 1).call).toBe(true);
    g = call(g, 1);
    expect(g.hands[0]).toEqual([c(7)]);
    expect(g.pile).toHaveLength(0);
    expect(g.sips[0].drunk).toBe(1);
    expect(g.turn).toBe(1);
    expect(options(g, 1).call).toBe(false);
    expect(lowestClaim(g)).toBe(7);
    expect(g.log.at(-1)).toMatchObject({ k: 'call', by: 1, of: 0, lied: true, taker: 0, cards: 1 });
  });

  it('the truth turned over: the caller takes the pile', () => {
    let g = playing([[c(7), c(10)], [c(8)], [c(9)]]);
    g = play(g, 0, c(10), 10);
    g = play(g, 1, c(8), 10); // a lie, believed
    g = call(g, 2); // seat 2 turns over seat 1's card: a lie
    expect(g.hands[1]).toEqual([c(8), c(10)]);
    expect(g.sips[1].drunk).toBe(2);
    let h = playing([[c(7)], [c(8)], [c(9)]]);
    h = play(h, 0, c(7), 7);
    h = call(h, 1);
    expect(h.hands[1]).toEqual([c(7), c(8)]);
    expect(h.turn).toBe(1);
  });

  it('only the next player may turn a card over, and only before drawing or playing', () => {
    let g = newGame(3, 0);
    g = draw(g, 0, 0);
    g = play(g, 0, g.hands[0][0], 8);
    expect(call(g, 2)).toBe(g);
    const drawn = draw(g, 1, 1);
    expect(options(drawn, 1).call).toBe(false);
    expect(call(drawn, 1)).toBe(drawn);
  });

  it('four of a kind go out of the game and hand out 2 sips; four Jacks make the Arschloch', () => {
    let g = playing([[c(12, 'hearts')], [c(12), c(12, 'clubs'), c(12, 'diamonds'), c(7)], [c(9)]]);
    g = play(g, 0, c(12, 'hearts'), 12);
    g = call(g, 1); // the truth: seat 1 takes the queen, has four
    expect(g.hands[1]).toEqual([c(7)]);
    expect(g.burned).toEqual([{ by: 1, value: 12 }]);
    expect(g.sips[1].given).toBe(2);
    expect(g.log.at(-1)).toMatchObject({ k: 'quad', by: 1, value: 12 });
    expect(g.log.map((e) => e.n)).toEqual([1, 2, 3]);

    let h = playing([[c(11, 'hearts')], [c(11), c(11, 'clubs'), c(11, 'diamonds')], [c(9)]]);
    h = play(h, 0, c(11, 'hearts'), 11);
    h = call(h, 1);
    expect(h.phase).toBe('over');
    expect(h.loser).toBe(1);
  });

  it('nothing left to play or draw: turning over is a must; nobody can do anything: skipped', () => {
    let g = playing([[c(9)], [], [c(8)]]);
    g = play(g, 0, c(9), 9);
    expect(options(g, 1)).toEqual({ call: true, draw: false, play: false, mustCall: true });
    g = call(g, 1); // the truth: seat 1 takes it and carries on
    expect(g.turn).toBe(1);
    g = play(g, 1, c(9), 12);
    g = call(g, 2); // a lie: seat 1 takes it back; seat 2 carries on
    expect(g.turn).toBe(2);
    g = play(g, 2, c(8), 8);
    // Seat 0 has nothing: turning over is all they can do.
    expect(options(g, 0).mustCall).toBe(true);
  });

  it('random games keep every card and always end with an Arschloch', () => {
    for (let run = 0; run < 400; run++) {
      const n = 2 + (run % 7);
      let g = newGame(n, run % n);
      let moves = 0;
      while (g.phase === 'play' && moves < 5000) {
        const who = g.turn;
        const o = options(g, who);
        const before = g;
        if (o.call && (o.mustCall || Math.random() < 0.3)) g = call(g, who);
        else if (o.draw) {
          const slots = g.ring.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
          g = draw(g, who, slots[Math.floor(Math.random() * slots.length)]);
        } else if (o.play) {
          const hand = g.hands[who];
          const card = hand[Math.floor(Math.random() * hand.length)];
          const low = lowestClaim(g);
          const claim = Math.random() < 0.6 && card.value >= low ? card.value : low + Math.floor(Math.random() * (ACE - low + 1));
          g = play(g, who, card, claim);
        }
        expect(g).not.toBe(before);
        expect(cardCount(g)).toBe(shortDeck().length);
        moves++;
      }
      expect(g.phase).toBe('over');
      expect(g.hands[g.loser!].filter((x) => x.value === 11)).toHaveLength(4);
    }
  });
});
