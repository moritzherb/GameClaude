import { describe, expect, it } from 'vitest';
import { fanLayout } from './HandFan';

describe('a fanned hand', () => {
  it('keeps every card, turned, inside the width', () => {
    for (const n of [1, 2, 5, 9, 14, 20]) {
      const width = 330;
      const card = 60;
      const h = card * 1.5;
      const { spots } = fanLayout(n, width, card, 1.5);
      expect(spots).toHaveLength(n);
      for (const s of spots) {
        const a = (Math.abs(s.a) * Math.PI) / 180;
        const out = Math.abs(s.x) + h * Math.sin(a) + (card / 2) * Math.cos(a);
        expect(out).toBeLessThanOrEqual(width / 2 + 0.01);
      }
    }
  });

  it('lays them left to right, the middle one upright', () => {
    const { spots } = fanLayout(5, 330, 60);
    expect(spots.map((s) => s.x)).toEqual([...spots.map((s) => s.x)].sort((a, b) => a - b));
    expect(spots[2]).toEqual({ x: 0, y: 0, a: 0 });
  });
});
