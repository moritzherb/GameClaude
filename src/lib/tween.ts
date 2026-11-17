/**
 * A motion run from a script, a number per frame: the screen and the strip under the clock can both
 * be set from it in the same frame (the splash does it, lib/launch.ts), where a CSS transition
 * would start a moment later on an iPhone than the strip and the two part.
 */

/** CSS's cubic-bezier(x1, y1, x2, y2) as a function of the time (0 to 1) to the progress (0 to 1). */
export function bezier(x1: number, y1: number, x2: number, y2: number): (k: number) => number {
  const axis = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  return (k) => {
    if (k <= 0) return 0;
    if (k >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = k;
    for (let i = 0; i < 20; i++) {
      const x = axis(x1, x2, t);
      if (Math.abs(x - k) < 1e-4) break;
      if (x < k) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return axis(y1, y2, t);
  };
}

/** The curves the app uses (pop.css): `ease` as CSS has it, and the quick-then-settling one. */
export const EASE = bezier(0.25, 0.1, 0.25, 1);
export const SETTLE = bezier(0.2, 0.85, 0.25, 1);

/**
 * Runs `step(progress)` every frame for `ms`, the progress along `ease`. A frame never counts for
 * more than two, so a frame the phone spends on drawing something holds the motion a little instead
 * of making it skip. Returns a function that stops it where it is.
 */
export function tween(ms: number, ease: (k: number) => number, step: (progress: number) => void, done?: () => void): () => void {
  let at = 0;
  let prev = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    at += Math.min(Math.max(0, now - prev), 34);
    prev = now;
    const k = Math.min(1, at / ms);
    step(ease(k));
    if (k < 1) raf = requestAnimationFrame(frame);
    else done?.();
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
