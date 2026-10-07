import type { ReactNode } from 'react';
import { buzz, sfx } from '../lib/fx';

export type ButtonVariant = 'primary' | 'light' | 'glass' | 'danger';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg' | 'xl';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Big pill button. Easy to hit even with a drink in the other hand. */
export default function BigButton({ children, onClick, variant = 'primary', size = 'lg', disabled, className = '', ariaLabel }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`big-btn big-btn-${size} big-btn-${variant} ${className}`}
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
