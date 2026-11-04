import { useLayoutEffect, type RefObject } from 'react';
import { overTop, tintTop } from './themeColor';

/**
 * While `on`, the strip under the phone's clock takes the colour of this overlay laid over what was
 * at the top (a dimmed backdrop over the page: the strip dims with it). lib/themeColor.ts.
 */
export function useTopTint(ref: RefObject<Element | null>, on = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    return tintTop(overTop(getComputedStyle(el).backgroundColor));
  }, [ref, on]);
}
