import { useLayoutEffect, useRef } from 'react';
import { reducedMotion } from '../../lib/cardFly';
import { drawDie, FACE_TURN } from '../party/die3d';

/** How long a throw takes, from the hand to lying still (ms). */
export const THROW_MS = 1050;

/** The die is drawn in a box of this size (drawDie's units), shown at `SHOW` CSS px. */
const BOX = 240;
const SHOW = 124;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

interface Throw {
  /** Where it ends: the number's face to the front, a little twist. */
  rx: number;
  ry: number;
  rz: number;
  /** Turns still to go at the start, on each axis. */
  ax: number;
  ay: number;
  az: number;
  delay: number;
}

function throwFor(value: number, i: number, seed: number): Throw {
  const [rx, ry] = FACE_TURN[value];
  const r = (k: number) => {
    const x = Math.sin(seed * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    rx,
    ry,
    rz: (r(1) - 0.5) * 28,
    ax: 360 * (2 + Math.floor(r(2) * 2)) * (r(3) > 0.5 ? 1 : -1),
    ay: 360 * (1 + Math.floor(r(4) * 2)) * (r(5) > 0.5 ? 1 : -1),
    az: (r(6) - 0.5) * 300,
    delay: i * 70,
  };
}

/**
 * The dice on the felt: solid dice (party/die3d.ts) thrown in from the left, tumbling and bouncing
 * across the felt, slowing down and coming to rest on the numbers rolled. `rolls` counts the throws:
 * a new one throws again. Without a throw yet they lie there faded.
 */
export default function FeltDice({ values, rolls }: { values: number[] | null; rolls: number }) {
  // What lies on the felt: the last throw, also once the flaps are down and the dice are taken up.
  const last = useRef<number[]>([1, 1]);
  if (values) last.current = values;
  const shown = values ?? last.current;
  const idle = !values;
  return (
    <div className={`nf-dice${idle ? ' idle' : ''}`}>
      {shown.map((v, i) => (
        <Die key={i} value={v} index={i} rolls={rolls} thrown={!!values} />
      ))}
    </div>
  );
}

function Die({ value, index, rolls, thrown }: { value: number; index: number; rolls: number; thrown: boolean }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shadow = useRef<HTMLSpanElement>(null);
  const done = useRef(0);

  // Sharp on every screen.
  const paint = (rx: number, ry: number, rz: number) => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const res = Math.round(SHOW * dpr);
    if (c.width !== res) c.width = c.height = res;
    ctx.setTransform(res / BOX, 0, 0, res / BOX, 0, 0);
    drawDie(ctx, BOX, rx, ry, rz);
  };

  useLayoutEffect(() => {
    const w = wrap.current;
    const sh = shadow.current;
    if (!w || !sh) return;
    const th = throwFor(value, index, rolls);
    // Lying still: the number up front.
    if (!thrown || done.current === rolls || reducedMotion()) {
      paint(th.rx, th.ry, th.rz);
      w.style.transform = '';
      sh.style.transform = '';
      sh.style.opacity = '';
      done.current = rolls;
      return;
    }
    done.current = rolls;
    // From off the felt on the left, across to its place.
    const felt = w.closest('.nf-felt')?.getBoundingClientRect();
    const here = w.getBoundingClientRect();
    const fromX = felt ? felt.left - here.left - here.width * 1.2 - index * 24 : -220;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start - th.delay) / (THROW_MS - th.delay)));
      const e = easeOut(t);
      const left = 1 - e;
      // Three bounces, lower each time.
      const hop = Math.abs(Math.sin(Math.PI * 3 * Math.min(1, t * 1.15))) * 42 * (1 - Math.min(1, t * 1.15)) ** 1.6;
      const x = fromX * left;
      w.style.transform = `translate(${x.toFixed(1)}px, ${(-hop).toFixed(1)}px)`;
      sh.style.transform = `translateX(${x.toFixed(1)}px) scale(${(1 - hop / 90).toFixed(3)})`;
      sh.style.opacity = String(Math.max(0.25, 1 - hop / 60));
      paint(th.rx + th.ax * left, th.ry + th.ay * left, th.rz + th.az * left);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rolls, thrown]);

  return (
    <span className="nf-die3d" aria-label={thrown ? String(value) : undefined}>
      <span ref={shadow} className="nf-die3d-shadow" aria-hidden />
      <span ref={wrap} className="nf-die3d-body" aria-hidden>
        <canvas ref={canvas} style={{ width: SHOW, height: SHOW }} />
      </span>
    </span>
  );
}
