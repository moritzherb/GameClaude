import type { CSSProperties, ReactNode } from 'react';
import { buzz, sfx } from '../lib/fx';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  textColor?: string;
  size?: 'md' | 'lg' | 'xl';
  tilt?: 'left' | 'right';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Chunky, squishy, impossible-to-miss button. The backbone of the drunk-proof UI. */
export default function BigButton({ children, onClick, color = 'var(--pink)', textColor, size = 'lg', tilt, disabled, className = '', ariaLabel }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`big-btn big-btn-${size}${tilt ? ` tilt-${tilt}` : ''} ${className}`}
      style={{ '--btn-bg': color, ...(textColor ? { '--btn-fg': textColor } : {}) } as CSSProperties}
      disabled={disabled}
      onClick={() => {
        sfx.pop();
        buzz();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}
