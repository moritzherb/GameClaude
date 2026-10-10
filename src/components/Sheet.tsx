import { useEffect, useId, useRef, type ReactNode } from 'react';
import { t } from '../i18n';
import BigButton from './BigButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  closeLabel?: string;
}

/** Bottom sheet with one big close button. Tapping outside also closes it. */
export default function Sheet({ open, onClose, title, children, closeLabel = t('Got it') }: Props) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
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

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={box}
        className="sheet slide-up"
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sheet-grabber" />
        <h2 className="sheet-title" id={titleId}>
          {title}
        </h2>
        <div className="sheet-body">{children}</div>
        <BigButton variant="light" onClick={onClose}>
          {closeLabel}
        </BigButton>
      </div>
    </div>
  );
}
