import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { t } from '../i18n';
import { useTopTint } from '../lib/useTopTint';
import BigButton from './BigButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  /** Always as tall as it may be (a list to search through: it doesn't shrink with fewer matches). */
  tall?: boolean;
}

/** How long a sheet takes to go back down (a fifth quicker than it comes up; ms, as in global.css:
 *  .slide-down). */
const OUT = 220;

/** How far down (of its height) or how fast (px/ms) a sheet has to be pulled to close. */
const PULL_CLOSE = 0.3;
const FLICK = 0.5;

/** Bottom sheet with one big close button. Tapping outside also closes it, and so does pulling it
 *  down (as the grabber on top says). It slides back down the way it came when it closes, its
 *  dimmed backdrop (and the strip under the clock) with it. */
export default function Sheet({ open, onClose, title, children, closeLabel = t('Got it'), tall }: Props) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  // Still on screen while it goes (then gone), what it showed kept as it was.
  const [shown, setShown] = useState(open);
  const last = useRef({ title, children, closeLabel });
  if (open) last.current = { title, children, closeLabel };
  useEffect(() => {
    if (open) return setShown(true);
    const id = window.setTimeout(() => setShown(false), OUT);
    return () => window.clearTimeout(id);
  }, [open]);
  // The backdrop dims in and out (global.css), the strip under the clock with it, frame by frame,
  // until the sheet has gone.
  useTopTint(backdrop, open || shown);
  // Screen readers: move into the sheet when it opens, and back to where you were when it closes.
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }); // not a text field: no keyboard popping up
    return () => before?.focus?.({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // The keyboard up (a field in the sheet): the sheet stands over it, in the part of the screen that
  // still shows, instead of being pushed under it or the page scrolling away beneath it.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = backdrop.current;
    if (!open || !vv || !el) return;
    const fit = () => {
      const covered = window.innerHeight - vv.height > 1 || vv.offsetTop > 1;
      el.style.top = covered ? `${vv.offsetTop}px` : '';
      el.style.height = covered ? `${vv.height}px` : '';
      el.style.bottom = covered ? 'auto' : '';
    };
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => {
      vv.removeEventListener('resize', fit);
      vv.removeEventListener('scroll', fit);
      el.style.top = '';
      el.style.height = '';
      el.style.bottom = '';
    };
  }, [open]);

  // Pulled down by a finger (or the mouse on its top): it follows, the dim fading with it; let go far
  // enough down, or flicked, it closes from there, else it springs back. From the top (the grabber
  // and title) always; from the text only when scrolled to the top and pulled down, else it scrolls.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = box.current;
    const dim = backdrop.current;
    if (!open || !el || !dim) return;
    let at: { y: number; x: number; t: number; decided: boolean; dragging: boolean } | null = null;
    let dy = 0;
    let last = { y: 0, t: 0 };
    let speed = 0;
    const settle = () => {
      el.style.transition = 'transform 0.28s var(--ease-out)';
      dim.style.transition = 'opacity 0.28s linear';
      el.style.transform = '';
      dim.style.opacity = '';
      const done = () => {
        el.style.transition = '';
        dim.style.transition = '';
      };
      el.addEventListener('transitionend', done, { once: true });
    };
    const begin = (x: number, y: number, target: EventTarget | null) => {
      const t = target as Element | null;
      // Not from the close button at the bottom (it stays put), nor from a field.
      if (t?.closest?.('input, textarea, select, .sheet-foot, [data-sheet-nodrag]')) return;
      at = { x, y, t: performance.now(), decided: false, dragging: false };
      dy = 0;
      last = { y, t: performance.now() };
      speed = 0;
    };
    // True while it's a pull (the caller then stops the page from scrolling).
    const move = (x: number, y: number, top: boolean) => {
      if (!at) return false;
      if (!at.decided) {
        const ddx = x - at.x;
        const ddy = y - at.y;
        const down = ddy > 0 && (top || (el.querySelector('.sheet-body')?.scrollTop ?? 0) <= 0);
        if (Math.max(Math.abs(ddx), Math.abs(ddy)) < 4) return down;
        at.decided = true;
        if (!down || Math.abs(ddx) > ddy) {
          at = null;
          return false;
        }
        at.dragging = true;
        at.y = y;
        el.style.transition = '';
        dim.style.transition = '';
      }
      dy = Math.max(0, y - at.y);
      const now = performance.now();
      speed = (y - last.y) / Math.max(1, now - last.t);
      last = { y, t: now };
      el.style.transform = `translateY(${dy}px)`;
      dim.style.opacity = String(Math.max(0, 1 - dy / Math.max(1, el.offsetHeight)));
      return true;
    };
    const end = () => {
      const was = at;
      at = null;
      if (!was?.dragging) return;
      // Far enough, or quick at the end, or a short quick pull all along: closed.
      const quick = speed > FLICK || (dy > 40 && dy / Math.max(1, performance.now() - was.t) > FLICK * 0.7);
      if (dy > el.offsetHeight * PULL_CLOSE || quick) close.current();
      else settle();
    };
    const fromTop = (t: EventTarget | null) => !!(t as Element | null)?.closest?.('.sheet-grabber, .sheet-title');
    let touchTop = false;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return (at = null);
      touchTop = fromTop(e.target);
      begin(e.touches[0].clientX, e.touches[0].clientY, e.target);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (move(e.touches[0].clientX, e.touches[0].clientY, touchTop) && e.cancelable) e.preventDefault();
    };
    // The mouse: from the top only (inside, a mouse selects and scrolls).
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !fromTop(e.target)) return;
      begin(e.clientX, e.clientY, e.target);
      const mv = (m: PointerEvent) => move(m.clientX, m.clientY, true);
      const up = () => {
        window.removeEventListener('pointermove', mv);
        window.removeEventListener('pointerup', up);
        end();
      };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up);
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    el.addEventListener('pointerdown', onPointerDown);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
      el.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // Turned round half way (closed while still coming up, or opened again while going down): it
  // goes on from where it is instead of jumping to the start. Read off the screen as it is before
  // the change is drawn; only when it is on screen (a fresh one starts from the bottom).
  const was = useRef(open);
  const from = useRef<CSSProperties | undefined>(undefined);
  if (was.current !== open) {
    was.current = open;
    from.current =
      box.current && backdrop.current
        ? ({ '--sheet-from': getComputedStyle(box.current).transform, '--backdrop-from': getComputedStyle(backdrop.current).opacity } as CSSProperties)
        : undefined;
  }

  // A pull's own position stays only until the sheet turns (the animation then takes over from it).
  useLayoutEffect(() => {
    for (const el of [box.current, backdrop.current]) {
      if (!el) continue;
      el.style.transform = '';
      el.style.opacity = '';
      el.style.transition = '';
    }
  }, [open]);

  if (!open && !shown) return null;
  const leaving = !open;
  const view = last.current;
  return (
    <div className={`sheet-backdrop${leaving ? ' leaving' : ''}`} ref={backdrop} style={from.current} onClick={leaving ? undefined : onClose}>
      <div
        ref={box}
        style={from.current}
        className={`sheet ${leaving ? 'slide-down' : 'slide-up'}${tall ? ' tall' : ''}`}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sheet-grabber" />
        <h2 className="sheet-title" id={titleId}>
          {view.title}
        </h2>
        <div className="sheet-body">{view.children}</div>
        {/* Always in reach: at the bottom, still while the text scrolls. */}
        <div className="sheet-foot">
          <BigButton variant="light" onClick={leaving ? undefined : onClose}>
            {view.closeLabel}
          </BigButton>
        </div>
      </div>
    </div>
  );
}
