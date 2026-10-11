import { useEffect, useRef, type RefObject } from 'react';
import { buzz } from './fx';

/** Swiped at least this far to the left: let go to open. */
const TRIGGER = 72;
/** Or flicked this fast (px per ms) over at least a little way. */
const FLICK = 0.5;
/** A finger starting this close to either edge belongs to the phone's own swipes (back, forward). */
const EDGE = 28;

/** Set when a screen opens by the swipe: how much of it was uncovered on the right when let go. */
let swiped = 0;
/**
 * For the screen that opens: did it come by the swipe? Then it slides in from where the finger left
 * it: returns how far from the left edge it starts (px), else 0. (Asks once.)
 */
export function arrivedBySwipe() {
  const was = swiped;
  swiped = 0;
  return was ? Math.max(0, window.innerWidth - was) : 0;
}

/**
 * Swipe left anywhere on the page to go on (the home screen opens All games). The page follows
 * the finger and `peek` uncovers on the right; a mostly vertical move (scrolling, pulling down) is
 * left alone.
 *
 * Smooth on slow phones too: the listeners never hold up scrolling (passive; the page has
 * `touch-action: pan-y`, so the phone doesn't move it sideways by itself), and the finger moves the
 * page directly, once per frame, without React drawing the screen again.
 */
export function useSwipeLeft(
  onSwipe: () => void,
  enabled: boolean,
  page: RefObject<HTMLElement | null>,
  peek: RefObject<HTMLElement | null>,
) {
  const go = useRef(onSwipe);
  go.current = onSwipe;

  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; t: number; scroll: number } | null = null;
    let horizontal = false;
    let off = 0;
    let armed = false;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const shift = off * 0.5;
      const el = page.current;
      if (el) el.style.transform = shift ? `translate3d(${shift}px, 0, 0)` : '';
      const pk = peek.current;
      if (pk) {
        pk.style.width = `${-shift}px`;
        pk.style.setProperty('--p', String(Math.min(1, -off / TRIGGER)));
        pk.classList.toggle('armed', -off >= TRIGGER);
      }
    };
    const dragging = (on: boolean) => {
      page.current?.classList.toggle('dragging', on);
      peek.current?.classList.toggle('dragging', on);
    };
    // Back to rest: the page slides back into place, nothing uncovered. (Only if it was moved: the
    // pull down shares the page.)
    const reset = () => {
      const moved = horizontal || off !== 0;
      start = null;
      horizontal = false;
      off = 0;
      if (!moved) return;
      cancelAnimationFrame(frame);
      dragging(false);
      paint();
    };
    const down = (e: TouchEvent) => {
      // A swipe the phone took over never told us it ended: put the page back first.
      if (off !== 0 || horizontal) reset();
      const x = e.touches[0]?.clientX ?? 0;
      if (e.touches.length !== 1 || x < EDGE || x > window.innerWidth - EDGE) return;
      start = { x, y: e.touches[0].clientY, t: e.timeStamp, scroll: window.scrollY };
      horizontal = false;
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      if (e.touches.length !== 1) return reset();
      const x = e.touches[0].clientX - start.x;
      const y = e.touches[0].clientY - start.y;
      if (!horizontal) {
        if (Math.abs(x) < 10 && Math.abs(y) < 10) return;
        // Only a move that's clearly to the left (a slanted scroll stays a scroll).
        if (x > -10 || Math.abs(x) < Math.abs(y) * 1.6) {
          start = null;
          return;
        }
        horizontal = true;
        armed = false;
        dragging(true);
      }
      // The phone started scrolling after all (it decides by itself now): then it's a scroll.
      if (Math.abs(window.scrollY - start.scroll) > 12) return reset();
      off = Math.min(0, x);
      if (-off >= TRIGGER !== armed) {
        armed = -off >= TRIGGER;
        if (armed) buzz(8);
      }
      if (!frame) frame = requestAnimationFrame(paint);
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
      const uncovered = Math.max(1, -off * 0.5);
      reset();
      if (open) {
        swiped = uncovered;
        go.current();
      }
    };
    const cancel = reset;
    // Whatever interrupts the swipe (the phone taking over, the app going to the background, another
    // screen): never leave the page half moved.
    const hidden = () => document.visibilityState === 'hidden' && reset();

    const passive = { passive: true } as const;
    window.addEventListener('touchstart', down, passive);
    window.addEventListener('touchmove', move, passive);
    window.addEventListener('touchend', up, passive);
    window.addEventListener('touchcancel', cancel, passive);
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
      reset();
    };
  }, [enabled, page, peek]);
}
