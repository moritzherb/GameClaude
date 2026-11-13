import { useLayoutEffect, type RefObject } from 'react';

let canvas: CanvasRenderingContext2D | null | undefined;
const measurer = () => (canvas === undefined ? (canvas = document.createElement('canvas').getContext('2d')) : canvas);

/**
 * A title's type gets smaller until its longest word fits its width: it may break between words,
 * never inside one ("Zauberstich" on a narrow widget). Measured with the font as drawn, again when
 * the box changes size or the fonts arrive.
 */
export function useFitWords(ref: RefObject<HTMLElement | null>, text: string, min = 11) {
  useLayoutEffect(() => {
    const el = ref.current;
    const ctx = typeof document !== 'undefined' ? measurer() : null;
    if (!el || !ctx) return;
    const fit = () => {
      el.style.fontSize = '';
      const cs = getComputedStyle(el);
      const base = parseFloat(cs.fontSize);
      const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (!base || room <= 0) return;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const spacing = parseFloat(cs.letterSpacing) || 0;
      const shown = cs.textTransform === 'uppercase' ? text.toUpperCase() : text;
      const widest = Math.max(...shown.split(/[\s\u200b]+/).map((w) => ctx.measureText(w).width + spacing * [...w].length));
      if (widest > room) el.style.fontSize = `${Math.max(min, Math.floor(((base * room) / widest) * 0.97 * 10) / 10)}px`;
    };
    fit();
    void document.fonts?.ready.then(fit);
    if (typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(fit);
    watch.observe(el.parentElement ?? el);
    return () => watch.disconnect();
  }, [ref, text, min]);
}
