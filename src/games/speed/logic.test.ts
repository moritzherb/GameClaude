import { describe, expect, it } from 'vitest';
import { newDeck, type Card } from '../../lib/cards';
import { allCards, blocked, draw, fits, markReady, newGame, overDrawn, play, putBack, stuck, turnOver, type Game } from './logic';

const c = (value: number, suit: Card['suit'] = 'spades'): Card => ({ value, suit });
const started = (g: Game) => turnOver(markReady(markReady(g, 0), 1));

describe('Speed', () => {
  it('deals 20 each (5 in hand) and two stacks of 6', () => {
    const g = newGame(newDeck());
    expect(g.sides[0].hand).toHaveLength(5);
    expect(g.sides[0].pile).toHaveLength(15);
    expect(g.sides[1].hand).toHaveLength(5);
    expect(g.stacks[0]).toHaveLength(6);
    expect(g.stacks[1]).toHaveLength(6);
    expect(allCards(g)).toHaveLength(52);
  });

  it('one up or down fits, round the corner from King to Ace to 2', () => {
    expect(fits(c(5), c(6))).toBe(true);
    expect(fits(c(7), c(6))).toBe(true);
    expect(fits(c(8), c(6))).toBe(false);
    expect(fits(c(6), c(6))).toBe(false);
    expect(fits(c(2), c(14))).toBe(true);
    expect(fits(c(13), c(14))).toBe(true);
    expect(fits(c(14), c(2))).toBe(true);
    expect(fits(c(3), c(2))).toBe(true);
    expect(fits(c(12), c(14))).toBe(false);
  });

  it('starts when both are ready and the 1-2-3 has turned two cards over', () => {
    let g = newGame(newDeck());
    g = markReady(g, 0);
    expect(g.phase).toBe('ready');
    g = markReady(g, 1);
    expect(g.phase).toBe('count');
    g = turnOver(g);
    expect(g.phase).toBe('play');
    expect(g.middle[0]).toHaveLength(1);
    expect(g.middle[1]).toHaveLength(1);
    expect(g.stacks[0]).toHaveLength(5);
  });

  it('plays a fitting card onto the middle, refuses one that doesn’t fit', () => {
    let g = started(newGame(newDeck()));
    g = { ...g, middle: [[c(6)], [c(10)]], sides: [{ pile: [], hand: [c(7), c(2), c(9, 'hearts')] }, g.sides[1]] };
    expect(play(g, 0, 1)).toBe(g);
    g = play(g, 0, 0);
    expect(g.middle[0].at(-1)).toEqual(c(7));
    // 9 fits on the 10 (right pile) only.
    g = play(g, 0, 1, 1);
    expect(g.middle[1].at(-1)).toEqual(c(9, 'hearts'));
  });

  it('drawing past 5 locks you until the extras are back on the pile, in order', () => {
    let g = started(newGame(newDeck()));
    const pileBefore = g.sides[0].pile;
    g = draw(draw(g, 0), 0);
    expect(g.sides[0].hand).toHaveLength(7);
    expect(overDrawn(g.sides[0])).toBe(true);
    // Locked: no card can be played.
    const first = g.sides[0].hand[0];
    g = { ...g, middle: [[c(first.value === 14 ? 13 : first.value + 1)], g.middle[1]] };
    expect(play(g, 0, 0)).toBe(g);
    g = putBack(putBack(g, 0), 0);
    expect(g.sides[0].hand).toHaveLength(5);
    expect(g.sides[0].pile).toEqual(pileBefore);
    expect(putBack(g, 0)).toBe(g);
  });

  it('is stuck only when nothing fits and nobody can draw usefully', () => {
    let g = started(newGame(newDeck()));
    const dead = [c(9), c(9, 'hearts'), c(9, 'clubs'), c(9, 'diamonds'), c(12)];
    g = { ...g, middle: [[c(3)], [c(5)]], sides: [{ pile: [c(7)], hand: dead }, { pile: [], hand: [c(9)] }] };
    expect(blocked(g, 0)).toBe(true); // hand full
    expect(blocked(g, 1)).toBe(true); // pile empty
    expect(stuck(g)).toBe(true);
    // With room in the hand and cards left to draw, you're not stuck yet.
    const h = { ...g, sides: [{ pile: [c(7)], hand: dead.slice(0, 4) }, g.sides[1]] as Game['sides'] };
    expect(blocked(h, 0)).toBe(false);
  });

  it('shuffles every card in the middle into new side stacks once they run out', () => {
    let g = started(newGame(newDeck()));
    for (let i = 0; i < 5; i++) g = turnOver(g);
    expect(g.stacks[0]).toHaveLength(0);
    expect(g.middle[0]).toHaveLength(6);
    g = turnOver(g, (x) => [...x]);
    // All 12 went back into two stacks of 6, and one of each was turned over again.
    expect(g.middle[0]).toHaveLength(1);
    expect(g.middle[1]).toHaveLength(1);
    expect(g.stacks[0].length + g.stacks[1].length).toBe(10);
    expect(allCards(g)).toHaveLength(52);
    expect(new Set(allCards(g).map((x) => `${x.value}${x.suit}`)).size).toBe(52);
  });

  it('the first with no cards left wins', () => {
    let g = started(newGame(newDeck()));
    g = { ...g, middle: [[c(6)], [c(10)]], sides: [g.sides[0], { pile: [], hand: [c(11)] }] };
    g = play(g, 1, 0);
    expect(g.phase).toBe('over');
    expect(g.winner).toBe(1);
  });
});
