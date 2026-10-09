import { describe, expect, it } from 'vitest';
import { newDeck, type Card } from '../../lib/cards';
import { guess, newGame, next, nextGuesser, possible, takeOver, type Game } from './logic';

const card = (value: number): Card => ({ value, suit: 'spades' });
const deckOf = (...values: number[]) => values.map(card);

/** Plays one card: guesses until the card is resolved. */
function play(g: Game, ...guesses: number[]) {
  for (const v of guesses) g = guess(g, v);
  return g;
}

describe('Fuck the Dealer', () => {
  it('starts left of the dealer and skips the dealer when going round', () => {
    const g = newGame(4, 1, deckOf(5));
    expect(g.guesser).toBe(2);
    expect(nextGuesser(2, 1, 4)).toBe(3);
    expect(nextGuesser(3, 1, 4)).toBe(0);
    expect(nextGuesser(0, 1, 4)).toBe(2);
  });

  it('first try: the dealer saves 6 sips', () => {
    const g = play(newGame(3, 0, deckOf(10, 4)), 10);
    expect(g.result).toEqual({ card: card(10), outcome: 'first', sips: 6 });
    expect(g.saved).toBe(6);
    expect(g.piles[8]).toEqual([card(10)]);
    expect(g.deck).toEqual([card(4)]);
  });

  it('a wrong first guess gives a second chance on the right side only', () => {
    const g = play(newGame(3, 0, deckOf(10)), 4);
    expect(g.result).toBeNull();
    expect(g.firstGuess).toBe(4);
    expect(possible(g, 3)).toBe(false);
    expect(possible(g, 4)).toBe(false);
    expect(possible(g, 5)).toBe(true);
    expect(possible(g, 14)).toBe(true);
  });

  it('second try: 3 sips; miss: none, and the card still goes to the middle', () => {
    const second = play(newGame(3, 0, deckOf(10)), 4, 10);
    expect(second.result?.outcome).toBe('second');
    expect(second.saved).toBe(3);
    const miss = play(newGame(3, 0, deckOf(10)), 4, 12);
    expect(miss.result?.outcome).toBe('miss');
    expect(miss.saved).toBe(0);
    expect(miss.misses).toBe(1);
    expect(miss.piles[8]).toEqual([card(10)]);
  });

  it('a hit resets the misses in a row', () => {
    let g = newGame(3, 0, deckOf(10, 10, 7));
    g = next(play(g, 2, 3), 3);
    g = next(play(g, 2, 3), 3);
    expect(g.misses).toBe(2);
    g = play(g, 7);
    expect(g.misses).toBe(0);
  });

  it('three misses in a row: the deck moves left, the dealer drinks what they saved', () => {
    // A deals. B hits, then C, D and B miss in a row.
    let g = newGame(4, 0, deckOf(9, 5, 5, 5, 8));
    g = next(play(g, 9), 4); // B hits first try: 6 saved
    expect(g.guesser).toBe(2);
    g = next(play(g, 2, 3), 4); // C misses
    g = next(play(g, 2, 3), 4); // D misses
    g = play(g, 2, 3); // B misses: third in a row
    g = next(g, 4);
    expect(g.handover).toEqual({ dealer: 0, sips: 6 });
    expect(g.drank).toEqual([6, 0, 0, 0]);
    expect(g.dealer).toBe(1);
    expect(g.saved).toBe(0);
    expect(g.misses).toBe(0);
    // The last guesser was B, who now deals, so C is up next.
    expect(g.guesser).toBe(2);
    expect(takeOver(g).handover).toBeNull();
  });

  it('the new dealer continues after the last guesser', () => {
    // A deals, B C D miss: D was last, the deck goes to B, A is next to guess.
    let g = newGame(4, 0, deckOf(5, 5, 5, 8));
    for (let i = 0; i < 3; i++) g = next(play(g, 2, 3), 4);
    expect(g.dealer).toBe(1);
    expect(g.guesser).toBe(0);
  });

  it('two players swap roles', () => {
    let g = newGame(2, 0, deckOf(5, 5, 5, 8));
    expect(g.guesser).toBe(1);
    for (let i = 0; i < 3; i++) g = next(play(g, 2, 3), 2);
    expect(g.dealer).toBe(1);
    expect(g.guesser).toBe(0);
  });

  it('turns a value over once all four are out', () => {
    let g = newGame(3, 0, deckOf(6, 6, 6, 6, 9));
    for (let i = 0; i < 4; i++) g = next(play(g, 6), 3);
    expect(g.piles[4]).toHaveLength(4);
    expect(possible(g, 6)).toBe(false);
  });

  it('an empty deck ends the game and the last dealer drinks up', () => {
    let g = newGame(3, 2, deckOf(7));
    g = next(play(g, 7), 3);
    expect(g.over).toBe(true);
    expect(g.handover).toEqual({ dealer: 2, sips: 6 });
    expect(g.drank).toEqual([0, 0, 6]);
  });

  it('plays a full deck without losing a card', () => {
    let g = newGame(5, 0);
    expect(g.deck).toHaveLength(52);
    let n = 0;
    while (!g.over && n++ < 200) {
      g = takeOver(g);
      g = play(g, 8);
      if (!g.result) g = play(g, g.deck[0].value > 8 ? 9 : 7);
      g = next(g, 5);
    }
    expect(g.over).toBe(true);
    const all = g.piles.flat();
    expect(all).toHaveLength(52);
    expect(new Set(all.map((c) => `${c.value}${c.suit}`)).size).toBe(52);
    expect(all.sort((a, b) => a.value - b.value).map((c) => c.value)).toEqual(
      newDeck()
        .map((c) => c.value)
        .sort((a, b) => a - b),
    );
  });
});
