import { useEffect, useRef, useState, type RefObject } from 'react';
import { buzz } from './fx';

/** How far the page follows the finger, at most. */
const MAX = 100;
/** Pulled at least this far: let go to refresh. */
const TRIGGER = 62;
/** How far it stays down while refreshing. */
const HOLD = 52;
/** How long the refresh shows (the work runs halfway through). */
const REFRESH_MS = 900;

/**
 * Pull down at the top of the page to refresh. Only follows a finger that starts with the page at
 * the very top and moves mostly downwards (a sideways swipe is left alone).
 *
 * The page moves down with the finger and `indicator` (with --p from 0 to 1 and the classes `pull`
 * and `refresh`) shows in the gap. Like the swipe, it never holds up scrolling (passive listeners;
 * the page can't bounce at the top: overscroll-behavior) and moves things directly, once per frame.
 * Returns whether it's refreshing right now.
 */
export function usePullToRefresh(
  onRefresh: () => void,
  enabled: boolean,
  page: RefObject<HTMLElement | null>,
  indicator: RefObject<HTMLElement | null>,
) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number } | null = null;
    let pulling = false;
    let off = 0;
    let busy = false;
    let armed = false;
    let frame = 0;
    const timers: number[] = [];

    const paint = () => {
      frame = 0;
      const el = page.current;
      if (el) el.style.transform = off ? `translate3d(0, ${off}px, 0)` : '';
      const ind = indicator.current;
      if (ind) {
        ind.style.setProperty('--y', `${off}px`);
        ind.style.setProperty('--p', String(Math.min(1, off / TRIGGER)));
      }
    };
    const phase = (name: 'idle' | 'pull' | 'refresh') => {
      page.current?.classList.toggle('pulling', name === 'pull');
      indicator.current?.classList.toggle('pull', name === 'pull');
      indicator.current?.classList.toggle('refresh', name === 'refresh');
    };

    const down = (e: TouchEvent) => {
      if (busy || e.touches.length !== 1 || window.scrollY > 0) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      pulling = false;
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (!pulling) {
        if (dy < 8) {
          if (dy < -4 || Math.abs(dx) > 8) start = null;
          return;
        }
        if (Math.abs(dx) > dy || window.scrollY > 0) {
          start = null;
          return;
        }
        pulling = true;
        armed = false;
        phase('pull');
      }
      off = Math.min(MAX, Math.max(0, dy - 8) * 0.5);
      if (off >= TRIGGER !== armed) {
        armed = off >= TRIGGER;
        if (armed) buzz(8);
      }
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const up = () => {
      if (!start) return;
      start = null;
      if (!pulling) return;
      pulling = false;
      cancelAnimationFrame(frame);
      if (off >= TRIGGER) {
        busy = true;
        setRefreshing(true);
        phase('refresh');
        off = HOLD;
        paint();
        timers.push(window.setTimeout(() => refresh.current(), REFRESH_MS / 2));
        timers.push(
          window.setTimeout(() => {
            off = 0;
            phase('idle');
            paint();
            busy = false;
            setRefreshing(false);
          }, REFRESH_MS),
        );
      } else {
        off = 0;
        phase('idle');
        paint();
      }
    };

    const passive = { passive: true } as const;
    window.addEventListener('touchstart', down, passive);
    window.addEventListener('touchmove', move, passive);
    window.addEventListener('touchend', up, passive);
    window.addEventListener('touchcancel', up, passive);
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
      timers.forEach((id) => window.clearTimeout(id));
      cancelAnimationFrame(frame);
      if (off || busy) {
        off = 0;
        phase('idle');
        paint();
        setRefreshing(false);
      }
    };
  }, [enabled, page, indicator]);

  return { refreshing };
}
