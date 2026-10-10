import { useEffect, useRef, useState } from 'react';
import { buzz } from './fx';

/** Swiped at least this far to the left: let go to open. */
const TRIGGER = 72;
/** Or flicked this fast (px per ms) over at least a little way. */
const FLICK = 0.5;
/** A finger starting this close to either edge belongs to the phone's own swipes (back, forward). */
const EDGE = 28;

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

    // Back to rest: the page in place, nothing uncovered.
    const reset = () => {
      start = null;
      horizontal = false;
      off = 0;
      setDragging(false);
      setDx(0);
    };
    const down = (e: TouchEvent) => {
      // A swipe the phone took over never told us it ended: put the page back first.
      if (off !== 0 || horizontal) reset();
      const x = e.touches[0]?.clientX ?? 0;
      if (e.touches.length !== 1 || x < EDGE || x > window.innerWidth - EDGE) return;
      start = { x, y: e.touches[0].clientY, t: e.timeStamp };
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
      const s = start;
      if (!s || !horizontal) {
        if (off !== 0) reset();
        start = null;
        return;
      }
      const speed = -off / Math.max(1, e.timeStamp - s.t);
      const open = -off >= TRIGGER || (speed > FLICK && -off > 30);
      reset();
      if (open) {
        swiped = true;
        go.current();
      }
    };
    const cancel = reset;
    // Whatever interrupts the swipe (the phone taking over, the app going to the background, another
    // screen): never leave the page half moved.
    const hidden = () => document.visibilityState === 'hidden' && reset();

    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('popstate', cancel);
    window.addEventListener('pagehide', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('popstate', cancel);
      window.removeEventListener('pagehide', cancel);
      document.removeEventListener('visibilitychange', hidden);
      // Switched off mid-swipe (e.g. a pull down took over): the page goes back too.
      setDragging(false);
      setDx(0);
    };
  }, [enabled]);

  return { dx, dragging, progress: Math.min(1, -dx / TRIGGER) };
}
