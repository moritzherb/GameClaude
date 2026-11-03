import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { buzz, sfx } from '../lib/fx';

/** A plain button with the app's tap feedback (pop + buzz). Styling comes from `className`. */
export default function Tap({
  className,
  style,
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  className: string;
  style?: CSSProperties;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      style={style}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={(e) => {
        sfx.pop();
        buzz();
        onClick(e);
      }}
    >
      {children}
    </button>
  );
}
