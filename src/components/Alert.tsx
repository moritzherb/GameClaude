import { useEffect, useRef } from 'react';
import { t } from '../i18n';
import { useTopTint } from '../lib/useTopTint';

/**
 * The phone's alert, asking before something can't be undone: a title, a line, the action (red)
 * and Cancel. Escape or a tap beside it cancels. Same look as the one on the home screen.
 */
export default function Alert({
  title,
  text,
  action,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  /** The red button: what happens. Already translated. */
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  // The strip under the clock dims with the backdrop.
  useTopTint(wrap);

  // The latest Cancel, for the key listener set up once.
  const cancel = useRef(onCancel);
  useEffect(() => {
    cancel.current = onCancel;
  });

  // Focus on Cancel (the safe one) while it's open, and back where it was after.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    wrap.current?.querySelector<HTMLElement>('.os-alert-btn:last-child')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancel.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div ref={wrap} className="sheet-backdrop os-alert-wrap" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="os-alert" role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-text">
        <div className="os-alert-text">
          <h2 id="alert-title">{title}</h2>
          <p id="alert-text">{text}</p>
        </div>
        <button type="button" className="os-alert-btn danger" onClick={onConfirm}>
          {action}
        </button>
        <button type="button" className="os-alert-btn" onClick={onCancel}>
          {t('Cancel')}
        </button>
      </div>
    </div>
  );
}
