import { useEffect, type ReactNode } from 'react';
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet slide-up" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grabber" />
        <h2 className="sheet-title">{title}</h2>
        <div className="sheet-body">{children}</div>
        <BigButton variant="light" onClick={onClose}>
          {closeLabel}
        </BigButton>
      </div>
    </div>
  );
}
