import { describe, expect, it } from 'vitest';
import { layRing, RING_RADIUS } from './ring';

describe('layRing', () => {
  it('lays one slot per card around the centre', () => {
    const slots = layRing(52);
    expect(slots).toHaveLength(52);
    for (const s of slots) {
      const r = Math.hypot(s.x - 50, s.y - 50);
      expect(r).toBeGreaterThan(RING_RADIUS - 4);
      expect(r).toBeLessThan(RING_RADIUS + 4);
    }
  });

  it('goes once around the circle, in order', () => {
    const noJitter = layRing(4, () => 0.5);
    expect(noJitter.map((s) => Math.round(s.rot))).toEqual([45, 135, 225, 315]);
    expect(noJitter[0].x).toBeGreaterThan(50);
    expect(noJitter[0].y).toBeLessThan(50);
  });

  it('is messy, not a perfect circle', () => {
    const rots = layRing(52).map((s, i) => s.rot - ((i + 0.5) / 52) * 360);
    expect(Math.max(...rots) - Math.min(...rots)).toBeGreaterThan(5);
  });
});
