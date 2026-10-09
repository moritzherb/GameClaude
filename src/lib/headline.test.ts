import { describe, expect, it } from 'vitest';
import { headlineFor } from './headline';

const text = (hour: number) => {
  const h = headlineFor(hour);
  return `${h.top} ${h.sticker}`;
};

describe('headlineFor', () => {
  it('follows the night', () => {
    expect(text(17)).toBe('Pregame o’clock?');
    expect(text(19)).toBe('Pregame o’clock?');
    expect(text(20)).toBe('Party’s on');
    expect(text(22)).toBe('Party’s on');
    expect(text(0)).toBe('Party’s on');
    expect(text(1)).toBe('Party’s on');
    expect(text(2)).toBe('Last round');
    expect(text(5)).toBe('Last round');
    expect(text(6)).toBe('Game’s on');
    expect(text(16)).toBe('Game’s on');
  });
});
