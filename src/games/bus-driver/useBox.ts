import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The inner size of a box (whole pixels), kept up to date while the screen changes.
 *
 * The bus driver's tables size their cards from this in plain pixels: no container query units
 * handed down to 3D cards, which iPhones don't draw reliably (cards flicker or vanish). The box
 * itself must not take its size from its cards (flex-basis 0, overflow hidden), or it would chase
 * its own tail.
 */
export function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
    };
    read();
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return [ref, box] as const;
}

/** The biggest card width (px) for `cols` cards side by side and `rows` rows in a w × h box. */
export function fitCards(box: { w: number; h: number }, cols: number, rows: number, gapX: number, gapY: number, max: number, min = 16) {
  if (!box.w || !box.h) return min;
  const byWidth = (box.w - (cols - 1) * gapX) / cols;
  const byHeight = (box.h - (rows - 1) * gapY) / rows / 1.4;
  return Math.max(min, Math.floor(Math.min(max, byWidth, byHeight)));
}
