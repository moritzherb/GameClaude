import { describe, expect, it } from 'vitest';
import { callLast, draw, newDeck, newGame, pass, play, playable, take, type Card, type Game } from './logic';

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
  penalty: null,
  winner: null,
  events: [],
  seq: 0,
});

describe('Color Clash', () => {
  it('has 108 cards and deals seven each', () => {
    const d = newDeck();
    expect(d.length).toBe(108);
    expect(new Set(d.map((c) => c.id)).size).toBe(108);
    const g = newGame(4);
    expect(g.hands.every((h) => h.length === 7)).toBe(true);
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
    const three = (top: Card, card: Card) => game([[card, n('jade', 1), n('jade', 9)], [n('jade', 2)], [n('jade', 3)]], top, [n('amber', 4), n('amber', 5)]);
    let c = a('crimson', 'block');
    expect(play(three(n('crimson', 1), c), 0, c.id).turn).toBe(2);
    c = a('crimson', 'turnaround');
    const g = play(three(n('crimson', 1), c), 0, c.id);
    expect(g.dir).toBe(-1);
    expect(g.turn).toBe(2);
    c = a('crimson', 'burden');
    const b = play(three(n('crimson', 1), c), 0, c.id);
    expect(b.penalty).toEqual({ kind: 'burden', n: 2 });
    expect(b.turn).toBe(1);
    // Taken: two cards, and then it's still their turn to play.
    const t = take(b, 1);
    expect(t.hands[1].length).toBe(3);
    expect(t.turn).toBe(1);
    expect(t.penalty).toBe(null);
    expect(t.events).toEqual([{ k: 'take', by: 1, n: 2 }]);
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

  it('passes an Overload on with another, the penalty growing, until someone takes it', () => {
    const o = () => a(null, 'overload');
    const [o1, o2, o3] = [o(), o(), o()];
    const deck = Array.from({ length: 20 }, (_, k) => n('amber', k % 9));
    let g = game([[o1, n('azure', 1)], [o2, a('jade', 'burden'), n('jade', 2)], [o3, n('jade', 3)], [n('azure', 4)]], n('crimson', 1), deck);
    g = play(g, 0, o1.id, 'jade');
    expect(g.penalty).toEqual({ kind: 'overload', n: 4 });
    // Only another Overload answers it, whatever the colour: no Burden on it.
    expect(playable(g, 1, g.hands[1][1])).toBe(false);
    expect(playable(g, 1, o2)).toBe(true);
    expect(draw(g, 1)).toBe(g);
    g = play(g, 1, o2.id, 'azure');
    expect(g.penalty?.n).toBe(8);
    g = play(g, 2, o3.id, 'azure');
    expect(g.penalty?.n).toBe(12);
    expect(g.turn).toBe(3);
    g = take(g, 3);
    expect(g.hands[3].length).toBe(13);
    expect(g.turn).toBe(3);
    expect(playable(g, 3, g.hands[3][0])).toBe(true);
  });

  it('stacks a Burden on a Burden, never an Overload on a Burden', () => {
    const b1 = a('crimson', 'burden');
    const b2 = a('azure', 'burden');
    const over = a(null, 'overload');
    const deck = Array.from({ length: 10 }, (_, k) => n('amber', k % 9));
    let g = play(game([[b1, n('jade', 1)], [b2, over, n('jade', 2)], [n('jade', 3)]], n('crimson', 1), deck), 0, b1.id);
    expect(playable(g, 1, over)).toBe(false);
    g = play(g, 1, b2.id);
    expect(g.penalty).toEqual({ kind: 'burden', n: 4 });
    expect(take(g, 2).hands[2].length).toBe(5);
  });

  it('wants “Last card” right after going down to one, else 2 cards when the next one moves', () => {
    const red = n('crimson', 5);
    const deck = [n('amber', 1), n('amber', 2), n('amber', 3)];
    // Not before: with two cards there's nothing to say yet.
    const g0 = game([[red, n('jade', 1)], [n('crimson', 2), n('jade', 2), n('jade', 3)]], n('crimson', 1), deck);
    expect(callLast(g0, 0)).toBe(g0);
    let g = play(g0, 0, red.id);
    expect(g.lastCard).toEqual({ seat: 0, called: false });
    // Forgot: the next player's move costs them two.
    const f = play(g, 1, g.hands[1][0].id);
    expect(f.hands[0].length).toBe(3);
    expect(f.lastCard).toBe(null);
    expect(f.events[0]).toEqual({ k: 'forgot', by: 0, n: 2 });
    // Said in time: nothing.
    g = callLast(g, 0);
    expect(g.lastCard).toEqual({ seat: 0, called: true });
    expect(play(g, 1, g.hands[1][0].id).hands[0].length).toBe(1);
  });

  it('ends when a hand is empty', () => {
    const red = n('crimson', 5);
    const g = play(game([[red], [n('jade', 2)]], n('crimson', 1)), 0, red.id);
    expect(g.winner).toBe(0);
  });

  it('counts every move', () => {
    const red = n('crimson', 5);
    const g = game([[red, n('jade', 1)], [n('jade', 2)]], n('crimson', 1), [n('amber', 4)]);
    expect(play(g, 0, red.id).seq).toBe(1);
    expect(draw(g, 0).seq).toBe(1);
  });
});
