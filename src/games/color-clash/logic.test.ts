import { describe, expect, it } from 'vitest';
import { acceptOverload, callLast, catchLast, challengeOverload, draw, newDeck, newGame, pass, play, playable, type Card, type Game } from './logic';

let id = 1000;
const n = (color: Card['color'], value: number): Card => ({ id: id++, color, kind: 'number', value });
const a = (color: Card['color'], kind: Card['kind']): Card => ({ id: id++, color, kind });

/** A game with these hands, this top card and the given deck (drawn from its end). */
const game = (hands: Card[][], topCard: Card, deck: Card[] = []): Game => ({
  deck,
  discard: [topCard],
  hands,
  turn: 0,
  dir: 1,
  color: topCard.color ?? 'crimson',
  drawn: null,
  lastCard: null,
  calling: null,
  overload: null,
  winner: null,
  last: null,
});

describe('Color Clash', () => {
  it('has 108 cards and deals seven each', () => {
    const d = newDeck();
    expect(d.length).toBe(108);
    expect(new Set(d.map((c) => c.id)).size).toBe(108);
    const g = newGame(4);
    expect(g.hands.every((h) => h.length === 7 || h.length === 9)).toBe(true);
    expect(g.discard[0].kind).not.toBe('overload');
  });

  it('plays the active colour, the same number or the same action', () => {
    const g = game([[n('azure', 5), n('jade', 7), a('jade', 'block'), a(null, 'spectrum')]], n('crimson', 7));
    const [blue5, green7, greenBlock, wild] = g.hands[0];
    expect(playable(g, 0, blue5)).toBe(false);
    expect(playable(g, 0, green7)).toBe(true);
    expect(playable(g, 0, greenBlock)).toBe(false);
    expect(playable(g, 0, wild)).toBe(true);
  });

  it('allows an Overload only with nothing of the active colour', () => {
    const over = a(null, 'overload');
    expect(playable(game([[over, n('crimson', 1)]], n('crimson', 7)), 0, over)).toBe(false);
    expect(playable(game([[over, n('azure', 1)]], n('crimson', 7)), 0, over)).toBe(true);
  });

  it('blocks, turns round and burdens the next player', () => {
    const three = (top: Card, card: Card) => game([[card, n('jade', 1)], [n('jade', 2)], [n('jade', 3)]], top, [n('amber', 4), n('amber', 5)]);
    let c = a('crimson', 'block');
    expect(play(three(n('crimson', 1), c), 0, c.id).turn).toBe(2);
    c = a('crimson', 'turnaround');
    const g = play(three(n('crimson', 1), c), 0, c.id);
    expect(g.dir).toBe(-1);
    expect(g.turn).toBe(2);
    c = a('crimson', 'burden');
    const b = play(three(n('crimson', 1), c), 0, c.id);
    expect(b.hands[1].length).toBe(3);
    expect(b.turn).toBe(2);
  });

  it('makes a Turnaround a Block with two players', () => {
    const c = a('crimson', 'turnaround');
    const g = play(game([[c, n('jade', 1)], [n('jade', 2)]], n('crimson', 1)), 0, c.id);
    expect(g.turn).toBe(0);
  });

  it('needs a colour for a Spectrum and takes it', () => {
    const c = a(null, 'spectrum');
    const g0 = game([[c, n('jade', 1)], [n('jade', 2)]], n('crimson', 1));
    expect(play(g0, 0, c.id)).toBe(g0);
    expect(play(g0, 0, c.id, 'azure').color).toBe('azure');
  });

  it('draws one; a playable one may go down, else the turn passes', () => {
    const blue = n('azure', 3);
    let g = draw(game([[n('jade', 1)], [n('jade', 2)]], n('crimson', 1), [blue]), 0);
    expect(g.turn).toBe(1);
    const red = n('crimson', 9);
    g = draw(game([[n('jade', 1)], [n('jade', 2)]], n('crimson', 1), [red]), 0);
    expect(g.drawn).toBe(red.id);
    expect(pass(g, 0).turn).toBe(1);
    expect(play(g, 0, red.id).discard.at(-1)).toEqual(red);
  });

  it('lets an Overload be taken or challenged', () => {
    const over = a(null, 'overload');
    const deck = Array.from({ length: 12 }, (_, k) => n('amber', k % 9));
    // Played fairly (no red left): a challenge costs the challenger six.
    let g = play(game([[over, n('azure', 1)], [n('jade', 2)], [n('jade', 3)]], n('crimson', 1), deck), 0, over.id, 'jade');
    expect(g.overload?.target).toBe(1);
    expect(acceptOverload(g, 1).hands[1].length).toBe(5);
    const c = challengeOverload(g, 1);
    expect(c.hands[1].length).toBe(7);
    expect(c.turn).toBe(2);
    // Played with red still in hand (only possible here by building the state): the actor draws four.
    g = { ...game([[n('crimson', 4)], [n('jade', 2)], [n('jade', 3)]], over, deck), overload: { actor: 0, target: 1, fair: false }, turn: 1 };
    const u = challengeOverload(g, 1);
    expect(u.hands[0].length).toBe(5);
    expect(u.turn).toBe(1);
  });

  it('catches someone at one card who didn’t say so', () => {
    const red = n('crimson', 5);
    const deck = [n('amber', 1), n('amber', 2)];
    let g = play(game([[red, n('jade', 1)], [n('jade', 2)]], n('crimson', 1), deck), 0, red.id);
    expect(g.lastCard).toEqual({ seat: 0, called: false });
    expect(catchLast(g, 1).hands[0].length).toBe(3);
    // Said in time: nothing to catch.
    g = callLast(game([[red, n('jade', 1)], [n('jade', 2)]], n('crimson', 1), deck), 0);
    g = play(g, 0, red.id);
    expect(catchLast(g, 1).hands[0].length).toBe(1);
  });

  it('ends when a hand is empty', () => {
    const red = n('crimson', 5);
    const g = play(game([[red], [n('jade', 2)]], n('crimson', 1)), 0, red.id);
    expect(g.winner).toBe(0);
  });
});
