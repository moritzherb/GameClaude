import { useEffect, useRef, useState } from 'react';
import { buzz } from './fx';

/** Swiped at least this far to the left: let go to open. */
const TRIGGER = 72;
/** Or flicked this fast (px per ms) over at least a little way. */
const FLICK = 0.5;
/** A finger starting this close to the left edge belongs to the phone's own swipe back. */
const EDGE = 24;

/** Set when a screen opens by the swipe, so it can slide in from the right. */
let swiped = false;
/** For the screen that opens: did it come by the swipe? (Asks once.) */
export function arrivedBySwipe() {
  const was = swiped;
  swiped = false;
  return was;
}

/**
 * Swipe left anywhere on the page to go on (the home screen opens All games). The page follows
 * the finger; a mostly vertical move (scrolling, pulling down) is left alone.
 */
export function useSwipeLeft(onSwipe: () => void, enabled = true) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const go = useRef(onSwipe);
  go.current = onSwipe;

  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; t: number } | null = null;
    let horizontal = false;
    let off = 0;
    let armed = false;

    const down = (e: TouchEvent) => {
      if (e.touches.length !== 1 || e.touches[0].clientX < EDGE) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp };
      horizontal = false;
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      const x = e.touches[0].clientX - start.x;
      const y = e.touches[0].clientY - start.y;
      if (!horizontal) {
        if (Math.abs(x) < 10 && Math.abs(y) < 10) return;
        // Only a move that's mostly to the left.
        if (x > -10 || Math.abs(x) < Math.abs(y) * 1.2) {
          start = null;
          return;
        }
        horizontal = true;
        armed = false;
        setDragging(true);
      }
      if (e.cancelable) e.preventDefault();
      off = Math.min(0, x);
      if (-off >= TRIGGER !== armed) {
        armed = -off >= TRIGGER;
        if (armed) buzz(8);
      }
      setDx(off);
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const s = start;
      start = null;
      if (!horizontal) return;
      horizontal = false;
      setDragging(false);
      const speed = -off / Math.max(1, e.timeStamp - s.t);
      if (-off >= TRIGGER || (speed > FLICK && -off > 30)) {
        swiped = true;
        go.current();
      }
      setDx(0);
      off = 0;
    };
    const cancel = () => {
      start = null;
      horizontal = false;
      off = 0;
      setDragging(false);
      setDx(0);
    };

    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', cancel);
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', cancel);
    };
  }, [enabled]);

  return { dx, dragging, progress: Math.min(1, -dx / TRIGGER) };
}
