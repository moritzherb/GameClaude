import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject, type SyntheticEvent } from 'react';
import { buzz } from '../lib/fx';
import { moveTo } from './order';

/** Holding an app this long starts moving the apps (as on an iPhone). */
const HOLD = 480;
/** A finger moving this far is a move (before the hold: a swipe, not a hold; on a tap: not a tap). */
const SLOP = 10;
/** While the apps wiggle, a finger on an app that is this quick sideways flicks the page instead (ms). */
const FLICK = 130;
/** Near the side of the screen while dragging: after a moment the next (or previous) page. */
const EDGE = 26;
const EDGE_WAIT = 550;
/** Between two reorders, so the apps sliding away don't swap back under the finger. */
const SETTLE = 180;
/** The apps making room, and the dragged one landing. */
const SLIDE = 260;
const LAND = 200;
const EASE = 'cubic-bezier(0.2, 0.85, 0.25, 1)';

interface Press {
  id: string;
  app: HTMLElement;
  x: number;
  y: number;
  x0: number;
  y0: number;
  /** When the finger came down, and whether it is one (a quick sideways flick turns the page). */
  t0: number;
  touch: boolean;
  /** While wiggling, decided on the first few pixels: the app is moved, or the page flicked. */
  mode?: 'app' | 'flick';
  timer?: number;
  dragging: boolean;
  ghost?: HTMLElement;
  /** The ghost's place when lifted, and where the finger was then: it follows by a transform. */
  gx: number;
  gy: number;
  lx: number;
  ly: number;
  frame?: number;
  edge?: number;
  last: number;
}

interface Options {
  /** The pages, when there are several (iPhone): at the side of the screen the next one comes. */
  pager?: RefObject<HTMLElement | null>;
  /** The "−" on a wiggling app was tapped. */
  onRemove?: (id: string) => void;
}

/**
 * Moving the apps on the home screen, the phone's way: hold an app until the apps wiggle (each with
 * a "−" to take it off), then drag it; the others make room. At the side of the screen it goes to
 * the next page. Swiping the pages keeps them wiggling; a tap on an empty spot (or Done) ends it.
 * `ids` is the order; `onOrder` gets the new one.
 *
 * Everything that moves goes by transforms (the dragged copy, the apps making room, the landing),
 * once a frame at most: nothing on the page is laid out again while the finger moves.
 */
export function useHomeEdit(root: RefObject<HTMLElement | null>, ids: string[], onOrder: (ids: string[]) => void, { pager, onRemove }: Options = {}) {
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  editingRef.current = editing;
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const press = useRef<Press | null>(null);
  /** The finger on an empty spot: lifted again without moving, it was a tap (that ends the wiggling). */
  const tap = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  /** After a hold or a drag the click that follows must not open the app. */
  const swallow = useRef(false);
  const before = useRef<Map<string, DOMRect> | null>(null);

  const apps = () => [...(root.current?.querySelectorAll<HTMLElement>('.os-grid.movable .app[data-id]') ?? [])];

  // After a reorder the apps slide from where they were to their new place.
  useLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    const p = press.current;
    const list = apps();
    if (p?.dragging) list.find((a) => a.dataset.id === p.id)?.classList.add('lifted');
    if (!was) return;
    // All read first, then all moved: one layout, not one per app.
    const moves: [HTMLElement, number, number][] = [];
    for (const a of list) {
      if (p?.dragging && a.dataset.id === p.id) continue;
      const b = was.get(a.dataset.id!);
      if (!b) continue;
      a.getAnimations().forEach((x) => x.cancel());
      const r = a.getBoundingClientRect();
      const dx = b.left - r.left;
      const dy = b.top - r.top;
      // Moved to another page: it isn't seen sliding there.
      if ((dx || dy) && Math.abs(dx) < window.innerWidth / 2) moves.push([a, dx, dy]);
    }
    for (const [a, dx, dy] of moves) a.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: SLIDE, easing: EASE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const lift = (p: Press) => {
    const r = p.app.getBoundingClientRect();
    const ghost = p.app.cloneNode(true) as HTMLElement;
    ghost.classList.remove('returning', 'lifted');
    ghost.classList.add('app-ghost');
    ghost.removeAttribute('data-id');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, transform: '', transition: '' });
    root.current?.append(ghost);
    p.app.classList.add('lifted');
    p.ghost = ghost;
    p.gx = r.left;
    p.gy = r.top;
    p.lx = p.x;
    p.ly = p.y;
    p.dragging = true;
    swallow.current = true;
    root.current?.classList.add('dragging');
    buzz(12);
  };

  /** Once a frame: the copy to the finger, the others making room, the page at the side. */
  const step = (p: Press) => {
    p.frame = undefined;
    if (press.current !== p || !p.dragging) return;
    if (p.ghost) p.ghost.style.transform = `translate3d(${p.x - p.lx}px, ${p.y - p.ly}px, 0)`;
    reorder(p);
    edge(p);
  };

  const drop = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    window.clearTimeout(p.edge);
    if (p.frame) cancelAnimationFrame(p.frame);
    if (!p.dragging) return;
    root.current?.classList.remove('dragging');
    const home = root.current?.querySelector<HTMLElement>(`.os-grid.movable .app[data-id="${p.id}"]`);
    const ghost = p.ghost;
    if (home && ghost) {
      // The app flies into its place, then is itself again.
      const r = home.getBoundingClientRect();
      ghost.classList.add('landing');
      const fly = ghost.animate([{ transform: ghost.style.transform || 'none' }, { transform: `translate3d(${r.left - p.gx}px, ${r.top - p.gy}px, 0)` }], {
        duration: LAND,
        easing: EASE,
        fill: 'forwards',
      });
      let done = false;
      const land = () => {
        if (done) return;
        done = true;
        ghost.remove();
        home.classList.remove('lifted');
      };
      fly.onfinish = land;
      window.setTimeout(land, LAND + 120);
    } else {
      ghost?.remove();
      root.current?.querySelectorAll('.lifted').forEach((a) => a.classList.remove('lifted'));
    }
  };

  /** The finger over another app: the dragged one takes its place. */
  const reorder = (p: Press) => {
    const now = Date.now();
    if (now - p.last < SETTLE) return;
    const over = apps().find((a) => {
      if (a.dataset.id === p.id) return false;
      const r = a.getBoundingClientRect();
      return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom && r.right > 0 && r.left < window.innerWidth;
    });
    // Over an empty spot of a page: to the end of that page.
    const page = over
      ? null
      : [...(root.current?.querySelectorAll<HTMLElement>('.os-grid.movable') ?? [])].find((g) => {
          const r = g.getBoundingClientRect();
          return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
        });
    const target = over ?? [...(page?.querySelectorAll<HTMLElement>('.app[data-id]') ?? [])].pop();
    if (!target) return;
    const list = idsRef.current;
    const from = list.indexOf(p.id);
    const to = list.indexOf(target.dataset.id!);
    if (from < 0 || to < 0 || from === to) return;
    before.current = new Map(apps().map((a) => [a.dataset.id!, a.getBoundingClientRect()]));
    p.last = now;
    onOrder(moveTo(list, from, to));
  };

  /** At the side of the screen: after a moment, the page there. */
  const edge = (p: Press) => {
    const el = pager?.current;
    if (!el) return;
    const dir = p.x < EDGE ? -1 : p.x > window.innerWidth - EDGE ? 1 : 0;
    if (!dir) {
      window.clearTimeout(p.edge);
      p.edge = undefined;
      return;
    }
    if (p.edge) return;
    p.edge = window.setTimeout(() => {
      p.edge = undefined;
      // Only as far as the pages with apps (not into the App Library).
      const pages = el.querySelectorAll('.os-grid.movable').length;
      const max = Math.min(el.scrollWidth - el.clientWidth, (pages - 1) * el.clientWidth);
      const next = Math.max(0, Math.min(max, Math.round(el.scrollLeft / el.clientWidth + dir) * el.clientWidth));
      if (next !== el.scrollLeft) {
        el.scrollTo({ left: next, behavior: 'smooth' });
        buzz(6);
      }
      if (press.current === p) edge(p);
    }, EDGE_WAIT);
  };

  /**
   * While wiggling, a finger on an app that goes quickly sideways is turning the page; anything
   * else moves the app. Decided once, on the first few pixels (before the browser would scroll).
   */
  const decide = (p: Press, x: number, y: number) => {
    if (!p.mode && Math.hypot(x - p.x0, y - p.y0) >= 4) {
      const flick = !!pager?.current && p.touch && Date.now() - p.t0 < FLICK && Math.abs(x - p.x0) >= Math.abs(y - p.y0);
      p.mode = flick ? 'flick' : 'app';
    }
    return p.mode;
  };

  // While an app is dragged the page must not scroll (only a listener that isn't passive can stop
  // it), and the long press mustn't open a menu. While wiggling, a finger on an app is the app's,
  // unless it flicks sideways: then the browser turns the page as usual.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      const p = press.current;
      if (!p) return;
      if (p.dragging) return e.preventDefault();
      if (!editingRef.current) return;
      const t = e.touches[0];
      if (t && decide(p, t.clientX, t.clientY) === 'app') e.preventDefault();
    };
    const menu = (e: Event) => {
      if ((e.target as Element).closest?.('.os-grid.movable .app')) e.preventDefault();
    };
    el.addEventListener('touchmove', stop, { passive: false });
    el.addEventListener('contextmenu', menu);
    return () => {
      el.removeEventListener('touchmove', stop);
      el.removeEventListener('contextmenu', menu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setEditing(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  // Leaving home mid-drag: nothing left floating.
  useEffect(() => () => drop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: ReactPointerEvent) => {
    // A new touch: whatever the last one left to swallow is over.
    swallow.current = false;
    tap.current = { x: e.clientX, y: e.clientY, moved: false };
    if (e.button > 0) return;
    const app = (e.target as Element).closest<HTMLElement>('.os-grid.movable .app[data-id]');
    if (!app) return;
    const p: Press = {
      id: app.dataset.id!,
      app,
      x: e.clientX,
      y: e.clientY,
      x0: e.clientX,
      y0: e.clientY,
      t0: Date.now(),
      touch: e.pointerType !== 'mouse',
      dragging: false,
      gx: 0,
      gy: 0,
      lx: 0,
      ly: 0,
      last: 0,
    };
    press.current = p;
    if (editingRef.current) return;
    p.timer = window.setTimeout(() => {
      if (press.current !== p) return;
      setEditing(true);
      lift(p);
    }, HOLD);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const t = tap.current;
    if (t && !t.moved && Math.hypot(e.clientX - t.x, e.clientY - t.y) >= SLOP) t.moved = true;
    const p = press.current;
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!p.dragging) {
      if (Math.hypot(p.x - p.x0, p.y - p.y0) < SLOP) return;
      // Before the hold: a swipe, not a hold. Wiggling: a quick sideways flick turns the page.
      if (!editingRef.current || decide(p, p.x, p.y) === 'flick') {
        window.clearTimeout(p.timer);
        press.current = null;
        return;
      }
      lift(p);
    }
    p.frame ??= requestAnimationFrame(() => step(p));
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const t = tap.current;
    tap.current = null;
    if (press.current) return drop();
    // Wiggling: only a tap on an empty spot ends it (not a swipe through the pages).
    if (editingRef.current && t && !t.moved && !(e.target as Element).closest('.app, .os-done')) {
      swallow.current = true;
      setEditing(false);
    }
  };

  /** The browser took the touch (the pages turning): a drag ends, the wiggling goes on. */
  const onPointerCancel = () => {
    tap.current = null;
    drop();
  };

  /** While editing (and right after a hold), taps don't open anything; Done and the "−" still work. */
  const onClickCapture = (e: SyntheticEvent) => {
    const target = e.target as Element;
    if (target.closest('.os-done')) {
      swallow.current = false;
      return;
    }
    const x = editingRef.current && target.closest('.app-x');
    if (swallow.current || editingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    swallow.current = false;
    const id = x && x.closest<HTMLElement>('.app[data-id]')?.dataset.id;
    if (id) onRemove?.(id);
  };

  return {
    editing,
    done: () => setEditing(false),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  };
}
