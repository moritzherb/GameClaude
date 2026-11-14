import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Box3D, type FlapState } from './box3d';

/**
 * The box built ahead, while the setup shows: building it and drawing it the first time (the
 * shaders) takes a moment, and that moment shouldn't come when the game starts.
 */
let ready: { size: 9 | 12; box: Box3D } | null = null;
let dropTimer = 0;

/** Builds the box for this size now (the one built before for another size goes). */
export function prepareBox3D(size: 9 | 12) {
  window.clearTimeout(dropTimer);
  if (ready?.size === size) return;
  ready?.box.dispose();
  ready = null;
  try {
    const box = new Box3D(document.createElement('canvas'), size, () => {});
    ready = { size, box };
    box.warmUp();
  } catch {
    // Built when the game starts instead (or the flat box, if it can't be).
  }
}

/** The setup has gone: a box built ahead that no game took is let go of. */
export function dropBox3D() {
  window.clearTimeout(dropTimer);
  dropTimer = window.setTimeout(() => {
    ready?.box.dispose();
    ready = null;
  }, 1000);
}

/** The box built ahead for this size, if there is one (it's then the caller's). */
function takeReady(size: 9 | 12) {
  if (ready?.size !== size) return null;
  const box = ready.box;
  ready = null;
  window.clearTimeout(dropTimer);
  return box;
}

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
  const host = useRef<HTMLDivElement>(null);
  const box = useRef<Box3D | null>(null);
  const tap = useRef(onTap);
  tap.current = onTap;
  const last = useRef<number[]>([1, 1]);
  if (dice) last.current = dice;

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    let b: Box3D;
    try {
      const built = takeReady(size);
      if (built) {
        b = built;
        b.onTap = (n) => tap.current(n);
      } else b = new Box3D(document.createElement('canvas'), size, (n) => tap.current(n));
    } catch {
      onFail();
      return;
    }
    b.canvas.className = 'nf-canvas';
    el.appendChild(b.canvas);
    box.current = b;
    const fit = () => b.resize(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => {
      ro.disconnect();
      b.canvas.remove();
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
      <div ref={host} className="nf-canvas-host" />
      <div className="nf-stage-felt">{children}</div>
    </div>
  );
}
