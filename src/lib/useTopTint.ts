import { useLayoutEffect, type RefObject } from 'react';
import { mix, overTop, topColor, topLayer } from './themeColor';

/**
 * While `on`, the strip under the phone's clock takes the colour of this overlay laid over what was
 * at the top (a dimmed backdrop over the page: the strip dims with it). lib/themeColor.ts.
 *
 * `fade` (ms, in and out): the overlay fades in and out (its opacity, straight along): the strip goes
 * with it frame by frame, from what was there to the overlay's colour and back.
 */
export function useTopTint(ref: RefObject<Element | null>, on = true, fade?: { in: number; out: number }) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const to = overTop(getComputedStyle(el).backgroundColor);
    if (!fade) {
      const layer = topLayer(to);
      return layer.release;
    }
    const from = topColor();
    const layer = topLayer(from);
    let now = from;
    let frame = 0;
    const run = (a: string, b: string, ms: number, done?: () => void) => {
      cancelAnimationFrame(frame);
      const start = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, Math.max(0, (t - start) / ms));
        now = mix(a, b, k);
        layer.set(now);
        if (k < 1) frame = requestAnimationFrame(step);
        else done?.();
      };
      frame = requestAnimationFrame(step);
    };
    run(from, to, fade.in);
    return () => run(now, layer.under(), fade.out, layer.release);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, on]);
}
