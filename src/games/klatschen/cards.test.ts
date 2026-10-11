import { describe, expect, it } from 'vitest';
import { CARDS, DECK, GLASS_ID } from './cards';

describe('klatschen deck', () => {
  it('has 60 cards, 4 of them clap glasses', () => {
    expect(DECK).toHaveLength(60);
    expect(DECK.filter((id) => id === GLASS_ID)).toHaveLength(4);
  });
  it('no card says drink', () => {
    for (const c of CARDS) expect(`${c.title} ${c.text}`.toLowerCase()).not.toMatch(/\bdrink\b/);
  });
  it('unique ids', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
  });
});
