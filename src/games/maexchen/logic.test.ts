import { describe, expect, it } from 'vitest';
import { allowedAfter, announce, beats, believe, MAEXCHEN, newRound, peek, reveal, shake, valueOf, VALUES, type Round } from './logic';

/** Dice in a row from a fixed list (each value 1–6). */
const seq = (...faces: number[]) => {
  let i = 0;
  return () => (faces[i++ % faces.length] - 1) / 6 + 0.01;
};

describe('maexchen', () => {
  it('reads the higher die first', () => {
    expect(valueOf([3, 6])).toBe(63);
    expect(valueOf([2, 1])).toBe(21);
    expect(valueOf([4, 4])).toBe(44);
  });

  it('ranks: plain values, then doubles, then the Mäxchen', () => {
    expect(beats(32, 31)).toBe(true);
    expect(beats(41, 32)).toBe(true);
    expect(beats(11, 65)).toBe(true);
    expect(beats(66, 11)).toBe(true);
    expect(beats(MAEXCHEN, 66)).toBe(true);
    expect(VALUES).toHaveLength(21);
    expect(new Set(VALUES.map((v) => valueOf([Math.floor(v / 10), v % 10] as [number, number])))).toEqual(new Set(VALUES));
  });

  it('only higher values can be announced', () => {
    expect(allowedAfter(null)).toHaveLength(21);
    expect(allowedAfter(65)[0]).toBe(11);
    expect(allowedAfter(MAEXCHEN)).toEqual([]);
    let r: Round = { ...shake(newRound(0), seq(5, 4)), claim: { by: 2, value: 61 } };
    expect(announce(r, 54)).toBe(r);
    r = announce(r, 62);
    expect(r.phase).toBe('pass');
    expect(r.claim).toEqual({ by: 0, value: 62 });
  });

  it('one blind shake after looking, then no more looking', () => {
    let r = shake(newRound(0), seq(3, 1));
    expect(r.dice).toEqual([3, 1]);
    expect(shake(r)).toBe(r); // not before looking
    r = peek(r);
    r = shake(r, seq(6, 6));
    expect(r.blind).toBe(true);
    expect(r.dice).toEqual([6, 6]);
    expect(shake(r)).toBe(r); // only once
    expect(peek(r)).toBe(r); // no looking after that
  });

  it('lifting the cup: a true claim makes the lifter drink, a lie the liar', () => {
    const base = announce(shake(newRound(0), seq(5, 4)), 53); // 54 under the cup, 53 announced
    const truth = reveal(base, 3);
    expect(truth.verdict).toEqual({ truth: true, loser: 1, sips: 1 });
    const lie = reveal(announce(shake(newRound(0), seq(5, 4)), 61), 3);
    expect(lie.verdict).toEqual({ truth: false, loser: 0, sips: 1 });
    // Exactly the announced value is the truth.
    expect(reveal(announce(shake(newRound(2), seq(4, 5)), 54), 3).verdict).toEqual({ truth: true, loser: 0, sips: 1 });
  });

  it('a Mäxchen: believing costs 1, lifting costs 2 for whoever is wrong', () => {
    const claim = announce(shake(newRound(1), seq(3, 2)), MAEXCHEN);
    expect(believe(claim, 3).verdict).toEqual({ truth: true, loser: 2, sips: 1, believed: true });
    expect(reveal(claim, 3).verdict).toEqual({ truth: false, loser: 1, sips: 2 });
    const real = announce(shake(newRound(1), seq(1, 2)), MAEXCHEN);
    expect(reveal(real, 3).verdict).toEqual({ truth: true, loser: 2, sips: 2 });
  });

  it('believing passes the turn on: shake again, beat the claim', () => {
    const r = believe(announce(shake(newRound(2), seq(4, 1)), 41), 3);
    expect(r.turn).toBe(0);
    expect(r.phase).toBe('shake');
    expect(r.claim?.value).toBe(41);
  });
});
