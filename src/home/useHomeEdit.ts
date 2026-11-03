import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject, type SyntheticEvent } from 'react';
import { buzz } from '../lib/fx';
import { moveTo } from './order';

/** Holding an app this long starts moving the apps (as on an iPhone). */
const HOLD = 480;
/** A finger moving this far before that is a swipe, not a hold. */
const SLOP = 10;
/** Near the side of the screen while dragging: after a moment the next (or previous) page. */
const EDGE = 26;
const EDGE_WAIT = 550;
/** Between two reorders, so the apps sliding away don't swap back under the finger. */
const SETTLE = 180;

interface Press {
  id: string;
  app: HTMLElement;
  x: number;
  y: number;
  x0: number;
  y0: number;
  timer?: number;
  dragging: boolean;
  ghost?: HTMLElement;
  /** Where in the app the finger holds it. */
  ox: number;
  oy: number;
  edge?: number;
  last: number;
}

/**
 * Moving the apps on the home screen, the phone's way: hold an app until the apps wiggle, then
 * drag it; the others make room. At the side of the screen it goes to the next page (with a pager).
 * A tap on an empty spot (or on Done) ends it. `ids` is the order; `onOrder` gets the new one.
 */
export function useHomeEdit(root: RefObject<HTMLElement | null>, ids: string[], onOrder: (ids: string[]) => void, pager?: RefObject<HTMLElement | null>) {
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  editingRef.current = editing;
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const press = useRef<Press | null>(null);
  /** After a hold or a drag the click that follows must not open the app. */
  const swallow = useRef(false);
  const before = useRef<Map<string, DOMRect> | null>(null);

  const apps = () => [...(root.current?.querySelectorAll<HTMLElement>('.os-grid.movable .app[data-id]') ?? [])];

  // After a reorder the apps slide from where they were to their new place.
  useLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    const p = press.current;
    for (const a of apps()) {
      if (p?.dragging && a.dataset.id === p.id) {
        a.classList.add('lifted');
        continue;
      }
      const b = was?.get(a.dataset.id!);
      if (!b) continue;
      const r = a.getBoundingClientRect();
      const dx = b.left - r.left;
      const dy = b.top - r.top;
      // Moved to another page: it isn't seen sliding there.
      if ((!dx && !dy) || Math.abs(dx) > window.innerWidth / 2) continue;
      a.style.transition = 'none';
      a.style.transform = `translate(${dx}px, ${dy}px)`;
      void a.offsetWidth;
      a.style.transition = 'transform 0.26s cubic-bezier(0.2, 0.85, 0.25, 1)';
      a.style.transform = '';
    }
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
    p.ox = p.x - r.left;
    p.oy = p.y - r.top;
    p.dragging = true;
    swallow.current = true;
    root.current?.classList.add('dragging');
    buzz(12);
  };

  const drop = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    window.clearTimeout(p.edge);
    if (!p.dragging) return;
    root.current?.classList.remove('dragging');
    const home = root.current?.querySelector<HTMLElement>(`.os-grid.movable .app[data-id="${p.id}"]`);
    const ghost = p.ghost;
    if (home && ghost) {
      // The app flies into its place, then is itself again.
      const r = home.getBoundingClientRect();
      ghost.classList.add('landing');
      Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px` });
      window.setTimeout(() => {
        ghost.remove();
        home.classList.remove('lifted');
      }, 200);
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

  // While an app is held or dragged the page must not scroll (only a listener that isn't passive
  // can stop it), and the long press mustn't open a menu.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      if (press.current && (press.current.dragging || editingRef.current)) e.preventDefault();
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
    if (e.button > 0) return;
    const app = (e.target as Element).closest<HTMLElement>('.os-grid.movable .app[data-id]');
    if (!app) return;
    const p: Press = { id: app.dataset.id!, app, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, dragging: false, ox: 0, oy: 0, last: 0 };
    press.current = p;
    if (editingRef.current) return;
    p.timer = window.setTimeout(() => {
      if (press.current !== p) return;
      setEditing(true);
      lift(p);
    }, HOLD);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const p = press.current;
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!p.dragging) {
      if (Math.hypot(p.x - p.x0, p.y - p.y0) < SLOP) return;
      if (!editingRef.current) {
        // A swipe, not a hold.
        window.clearTimeout(p.timer);
        press.current = null;
        return;
      }
      lift(p);
    }
    if (p.ghost) Object.assign(p.ghost.style, { left: `${p.x - p.ox}px`, top: `${p.y - p.oy}px` });
    reorder(p);
    edge(p);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const p = press.current;
    if (p) return drop();
    // Editing: a tap on an empty spot ends it.
    if (editingRef.current && !(e.target as Element).closest('.app, .os-done')) {
      swallow.current = true;
      setEditing(false);
    }
  };

  /** While editing (and right after a hold), taps don't open anything; Done still works. */
  const onClickCapture = (e: SyntheticEvent) => {
    if ((e.target as Element).closest('.os-done')) {
      swallow.current = false;
      return;
    }
    if (swallow.current || editingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    swallow.current = false;
  };

  return {
    editing,
    done: () => setEditing(false),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
  };
}
