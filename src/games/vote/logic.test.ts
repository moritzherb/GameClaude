import { describe, expect, it } from 'vitest';
import { addSips, fromReader, minority, rating, sipsFor } from './logic';

const OPTIONS = ['yes', 'no'] as const;

describe('minority', () => {
  it('the smaller side drinks', () => {
    expect(minority({ a: 'yes', b: 'yes', c: 'no' }, OPTIONS)).toEqual({ kind: 'minority', losers: ['c'] });
    expect(minority({ a: 'no', b: 'yes', c: 'no', d: 'no', e: 'yes' }, OPTIONS)).toEqual({ kind: 'minority', losers: ['b', 'e'] });
  });

  it('a tie, or everyone agreeing', () => {
    expect(minority({ a: 'yes', b: 'no', c: 'yes', d: 'no' }, OPTIONS)).toEqual({ kind: 'tie' });
    expect(minority({ a: 'no', b: 'no', c: 'no' }, OPTIONS)).toEqual({ kind: 'agreed' });
  });
});

describe('rating', () => {
  it('the average and who is furthest from it', () => {
    const r = rating({ a: 8, b: 7, c: 2 });
    expect(r.average).toBeCloseTo(17 / 3);
    expect(r.furthest).toEqual(['c']);
  });

  it('everyone equally far drinks', () => {
    expect(rating({ a: 2, b: 8 }).furthest).toEqual(['a', 'b']);
    expect(rating({ a: 3, b: 5, c: 7, d: 5 }).furthest).toEqual(['a', 'c']);
  });

  it('nobody when everyone gave the same number', () => {
    expect(rating({ a: 6, b: 6, c: 6 })).toEqual({ average: 6, furthest: [] });
  });
});

describe('sips', () => {
  it('per verdict', () => {
    expect(sipsFor({ kind: 'minority', losers: ['c'] }, ['a', 'b', 'c'])).toEqual({ c: 2 });
    expect(sipsFor({ kind: 'tie' }, ['a', 'b'])).toEqual({ a: 1, b: 1 });
    expect(sipsFor({ kind: 'agreed' }, ['a', 'b'])).toEqual({});
  });

  it('add up', () => {
    expect(addSips({ a: 1 }, { a: 2, b: 1 })).toEqual({ a: 3, b: 1 });
  });
});

describe('fromReader', () => {
  it('starts with the reader and goes round', () => {
    expect(fromReader(['a', 'b', 'c', 'd'], 2)).toEqual(['c', 'd', 'a', 'b']);
  });
});
