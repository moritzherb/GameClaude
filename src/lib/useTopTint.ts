import { useLayoutEffect, type RefObject } from 'react';
import { followFade, mix, overTop, topColor, topLayer } from './themeColor';

/**
 * While `on`, the strip under the phone's clock takes the colour of this overlay laid over what was
 * at the top (a dimmed backdrop over the page: the strip dims with it). lib/themeColor.ts.
 *
 * However the overlay comes and goes (fading in, fading out, faded by a finger), the strip goes
 * along with it frame by frame: keep `on` true until the overlay has really gone.
 */
export function useTopTint(ref: RefObject<HTMLElement | null>, on = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const css = getComputedStyle(el).backgroundColor;
    const layer = topLayer(topColor());
    // What lies under it can change while it's open (a veil under the search going away): each frame
    // it's laid over whatever is under it then.
    const under = () => layer.under();
    const over = () => overTop(css, under());
    // The colour it shows at the top, for an overlay to paint its top edge with (pop.css .os-search).
    const edge = () => el.style.setProperty('--top-tint', over());
    edge();
    const stop = followFade(el, under, over, layer.set);
    // Something under it changed (the veil under the search gone): over what's there now.
    const unwatch = layer.onUnder(() => {
      edge();
      const o = Math.min(1, Math.max(0, parseFloat(getComputedStyle(el).opacity)));
      layer.set(mix(under(), over(), Number.isNaN(o) ? 1 : o));
    });
    return () => {
      unwatch();
      stop();
      layer.release();
    };
  }, [ref, on]);
}
