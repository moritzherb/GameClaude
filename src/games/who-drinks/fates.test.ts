import { describe, expect, it } from 'vitest';
import { FATES } from './fates';

// Pictographs (emoji) – the texts are words only.
const EMOJI = /\p{Extended_Pictographic}/u;

describe('Who drinks? fates', () => {
  it('has plenty to hand out', () => {
    expect(FATES.length).toBeGreaterThanOrEqual(30);
  });

  it('every fate has a text without emoji and sips for every player', () => {
    for (let k = 2; k <= 6; k++) {
      for (const make of FATES) {
        for (let run = 0; run < 5; run++) {
          const chosen = run % k;
          const fate = make(chosen, k);
          expect(fate.text.length).toBeGreaterThan(5);
          expect(fate.text).not.toMatch(EMOJI);
          expect(fate.sips).toHaveLength(k);
          expect(fate.sips.every((n) => Number.isInteger(n) && n >= 0 && n <= 5)).toBe(true);
        }
      }
    }
  });

  it('counts the sips the wheel knows about', () => {
    const texts = (k: number) => FATES.map((make) => make(1, k));
    const all = texts(4);
    // "Everybody but you" leaves the chosen one out; "Everybody drinks" counts everyone.
    const butYou = all.find((f) => f.text.startsWith('Everybody but you'))!;
    expect(butYou.sips).toEqual([1, 0, 1, 1]);
    const everybody = all.find((f) => f.text === 'Everybody drinks!')!;
    expect(everybody.sips).toEqual([1, 1, 1, 1]);
    const finish = all.find((f) => f.text === 'Finish your drink!')!;
    expect(finish.sips).toEqual([0, 3, 0, 0]);
  });
});
