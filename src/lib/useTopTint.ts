import { useLayoutEffect, type RefObject } from 'react';
import { followFade, overTop, topColor, topLayer } from './themeColor';

/**
 * While `on`, the strip under the phone's clock takes the colour of this overlay laid over what was
 * at the top (a dimmed backdrop over the page: the strip dims with it). lib/themeColor.ts.
 *
 * However the overlay comes and goes (fading in, fading out, faded by a finger), the strip goes
 * along with it frame by frame: keep `on` true until the overlay has really gone.
 */
export function useTopTint(ref: RefObject<Element | null>, on = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const to = overTop(getComputedStyle(el).backgroundColor);
    const from = topColor();
    const layer = topLayer(from);
    const stop = followFade(el, from, to, layer.set);
    return () => {
      stop();
      layer.release();
    };
  }, [ref, on]);
}
