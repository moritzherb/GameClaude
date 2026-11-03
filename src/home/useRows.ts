import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * How many rows of icons fit in a grid that takes the free height (flex: 1): as many as there is
 * room for, between `min` and `max`. Nothing on the home screen scrolls; a short phone shows a row less.
 */
export function useRows(grid: RefObject<HTMLElement | null>, min: number, max: number) {
  const [rows, setRows] = useState(max);
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    const fit = () => {
      const app = el.querySelector<HTMLElement>('.app');
      if (!app) return;
      const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
      const n = Math.floor((el.clientHeight + gap) / (app.offsetHeight + gap));
      setRows(Math.max(min, Math.min(max, n)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [grid, min, max]);
  return rows;
}
