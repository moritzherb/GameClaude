import type { CSSProperties, ReactNode } from 'react';
import { fitCards, useBox } from './useBox';

/** A player's cards in a row, as big as the room it gets allows (the room never depends on them). */
export default function CardRow({ count, children }: { count: number; children: ReactNode }) {
  const [ref, box] = useBox<HTMLDivElement>();
  // The row's padding (10px 8px) is part of the measured box.
  const cw = fitCards({ w: box.w - 16, h: box.h - 20 }, count, 1, 8, 0, 150, 40);
  return (
    <div ref={ref} className="bd-hand" style={{ '--hand-cw': `${cw}px` } as CSSProperties}>
      {children}
    </div>
  );
}
