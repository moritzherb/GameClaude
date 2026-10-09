import { describe, expect, it } from 'vitest';
import type { Lang } from '../i18n';
import { headlineFor } from './headline';

const text = (hour: number, lang?: Lang) => {
  const h = headlineFor(hour, lang);
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

  it('speaks German', () => {
    expect(text(18, 'de')).toBe('Zeit zum Vorglühen?');
    expect(text(23, 'de')).toBe('Party läuft');
    expect(text(3, 'de')).toBe('Letzte Runde');
    expect(text(12, 'de')).toBe('Los geht’s');
  });

  it('keeps English as the default', () => {
    expect(text(12, 'en')).toBe('Game’s on');
  });
});
