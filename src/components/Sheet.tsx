import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n';
import { useTopTint } from '../lib/useTopTint';
import BigButton from './BigButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  closeLabel?: string;
}

/** How long a sheet takes to go back down (a fifth quicker than it comes up; ms, as in global.css:
 *  .slide-down). */
const OUT = 220;

/** Bottom sheet with one big close button. Tapping outside also closes it. It slides back down
 *  the way it came when it closes, its dimmed backdrop (and the strip under the clock) with it. */
export default function Sheet({ open, onClose, title, children, closeLabel = t('Got it') }: Props) {
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

  if (!open && !shown) return null;
  const leaving = !open;
  const view = last.current;
  return (
    <div className={`sheet-backdrop${leaving ? ' leaving' : ''}`} ref={backdrop} onClick={leaving ? undefined : onClose}>
      <div
        ref={box}
        className={`sheet ${leaving ? 'slide-down' : 'slide-up'}`}
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
        <BigButton variant="light" onClick={leaving ? undefined : onClose}>
          {view.closeLabel}
        </BigButton>
      </div>
    </div>
  );
}
