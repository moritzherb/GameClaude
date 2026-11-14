import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Box3D, type FlapState } from './box3d';

/**
 * The box in 3D (box3d.ts) on a canvas, with what's written on the felt laid over its front.
 * Loaded on its own (three.js is big): the game shows the flat box until it's there, and keeps it
 * where a phone can't draw 3D.
 */
export default function Box3DView({
  size,
  flaps,
  dice,
  rolls,
  onTap,
  onFail,
  children,
}: {
  size: 9 | 12;
  flaps: FlapState;
  dice: number[] | null;
  rolls: number;
  onTap: (n: number) => void;
  onFail: () => void;
  children?: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<Box3D | null>(null);
  const tap = useRef(onTap);
  tap.current = onTap;
  const last = useRef<number[]>([1, 1]);
  if (dice) last.current = dice;

  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let b: Box3D;
    try {
      b = new Box3D(c, size, (n) => tap.current(n));
    } catch {
      onFail();
      return;
    }
    box.current = b;
    const fit = () => b.resize(c.clientWidth, c.clientHeight);
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    fit();
    return () => {
      ro.disconnect();
      b.dispose();
      box.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // The flaps as the game has them now (cheap when nothing changed: only what moves animates).
  const key = `${flaps.open.join(',')}|${flaps.picked.join(',')}|${flaps.falling.join(',')}|${flaps.interactive}`;
  const latest = useRef(flaps);
  latest.current = flaps;
  useEffect(() => {
    box.current?.setFlaps(latest.current);
  }, [key]);

  useEffect(() => {
    box.current?.setDice(dice, rolls, last.current);
  }, [dice, rolls]);

  return (
    <div className={`nf-stage size-${size}`}>
      <canvas ref={canvas} className="nf-canvas" />
      <div className="nf-stage-felt">{children}</div>
    </div>
  );
}
