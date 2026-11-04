import { describe, expect, it } from 'vitest';
import { arrange, moveTo } from './order';

describe('home order', () => {
  it('moves one app and lets the others make room', () => {
    expect(moveTo(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveTo(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveTo(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('keeps a stored order to the games there are, new ones at the end', () => {
    expect(arrange(['c', 'gone', 'a', 'c', 3], ['a', 'b', 'c', 'd'])).toEqual(['c', 'a', 'b', 'd']);
    expect(arrange([], ['a', 'b'])).toEqual(['a', 'b']);
  });
});
