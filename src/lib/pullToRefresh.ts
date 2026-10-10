import { useEffect, useRef, useState } from 'react';
import { buzz } from './fx';

/** How far the page follows the finger, at most. */
const MAX = 100;
/** Pulled at least this far: let go to refresh. */
const TRIGGER = 62;
/** How far it stays down while refreshing. */
const HOLD = 52;
/** How long the refresh shows (the work runs halfway through). */
const REFRESH_MS = 900;

export type PullPhase = 'idle' | 'pull' | 'refresh';

/**
 * Pull down at the top of the page to refresh. Only follows a finger that starts with the page at
 * the very top and moves mostly downwards (a sideways swipe is left to the phone).
 */
export function usePullToRefresh(onRefresh: () => void, enabled = true) {
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<PullPhase>('idle');
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number } | null = null;
    let pulling = false;
    let off = 0;
    let busy = false;
    let armed = false;
    const timers: number[] = [];

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
        if (Math.abs(dx) > dy) {
          start = null;
          return;
        }
        pulling = true;
        armed = false;
        setPhase('pull');
      }
      // The page itself must not scroll or bounce meanwhile.
      if (e.cancelable) e.preventDefault();
      off = Math.min(MAX, Math.max(0, dy - 8) * 0.5);
      if (off >= TRIGGER !== armed) {
        armed = off >= TRIGGER;
        if (armed) buzz(8);
      }
      setOffset(off);
    };
    const up = () => {
      if (!start) return;
      start = null;
      if (!pulling) return;
      pulling = false;
      if (off >= TRIGGER) {
        busy = true;
        setPhase('refresh');
        setOffset(HOLD);
        timers.push(window.setTimeout(() => refresh.current(), REFRESH_MS / 2));
        timers.push(
          window.setTimeout(() => {
            setPhase('idle');
            setOffset(0);
            busy = false;
          }, REFRESH_MS),
        );
      } else {
        setPhase('idle');
        setOffset(0);
      }
      off = 0;
    };

    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', up);
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [enabled]);

  return { offset, phase, progress: Math.min(1, offset / TRIGGER) };
}
