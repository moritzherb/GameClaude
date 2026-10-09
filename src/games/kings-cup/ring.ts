/**
 * Where the face-down cards lie around the cup. Like on a real party table the
 * circle is a bit messy: every card is nudged in angle, distance and rotation.
 * Positions are percentages of the square table, rotations in degrees.
 */
export interface Slot {
  x: number;
  y: number;
  rot: number;
}

export const RING_RADIUS = 42;

export function layRing(count: number, rand: () => number = Math.random): Slot[] {
  const spread = (amount: number) => (rand() * 2 - 1) * amount;
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i + 0.5) / count) * 360 + spread(2.5);
    const r = RING_RADIUS + spread(2.5);
    const rad = (angle * Math.PI) / 180;
    return {
      x: 50 + r * Math.sin(rad),
      y: 50 - r * Math.cos(rad),
      // Long side points at the cup, give or take a sloppy hand.
      rot: angle + spread(16),
    };
  });
}
