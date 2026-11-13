import { describe, expect, it } from 'vitest';
import { sortByColour } from './handSort';

type C = { c: string | null; v: number };
const sort = (cards: C[]) => sortByColour(cards, (x) => x.c, (x) => x.v, ['red', 'blue', 'green']);

describe('sorting a hand', () => {
  it('puts the colour held most on the left, each low to high, colourless cards last', () => {
    const hand: C[] = [
      { c: 'red', v: 5 },
      { c: null, v: 0 },
      { c: 'blue', v: 9 },
      { c: 'blue', v: 2 },
      { c: 'green', v: 1 },
      { c: 'blue', v: 4 },
      { c: 'red', v: 1 },
    ];
    expect(sort(hand).map((x) => `${x.c}${x.v}`)).toEqual(['blue2', 'blue4', 'blue9', 'red1', 'red5', 'green1', 'null0']);
  });

  it('keeps the game’s colour order for equal counts', () => {
    const hand: C[] = [
      { c: 'green', v: 3 },
      { c: 'red', v: 7 },
    ];
    expect(sort(hand).map((x) => x.c)).toEqual(['red', 'green']);
  });
});
