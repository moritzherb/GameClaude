import { useEffect, type ReactNode } from 'react';
import BigButton from './BigButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  closeLabel?: string;
}

/** Bottom sheet with one giant close button. Tapping outside also closes it. */
export default function Sheet({ open, onClose, title, children, closeLabel = 'GOT IT 👍' }: Props) {
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
        <h2 className="sheet-title">{title}</h2>
        <div className="sheet-body">{children}</div>
        <BigButton color="var(--lime)" onClick={onClose}>
          {closeLabel}
        </BigButton>
      </div>
    </div>
  );
}
