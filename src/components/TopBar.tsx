import type { ReactNode } from 'react';
import { buzz, sfx } from '../lib/fx';

interface Props {
  title?: ReactNode;
  /** Where the left button goes. Shows ← (or 🏠 when icon="home"). */
  onBack?: () => void;
  icon?: 'back' | 'home' | 'close';
  right?: ReactNode;
}

export function RoundButton({ onClick, label, children, color = 'var(--white)' }: { onClick: () => void; label: string; children: ReactNode; color?: string }) {
  return (
    <button
      type="button"
      className="round-btn"
      aria-label={label}
      style={{ background: color }}
      onClick={() => {
        sfx.pop();
        buzz();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

const ICONS = { back: '←', home: '🏠', close: '✕' };

/** Same layout on every screen: escape hatch top-left, title in the middle, extras on the right. */
export default function TopBar({ title, onBack, icon = 'back', right }: Props) {
  return (
    <header className="top-bar">
      <div className="top-bar-side">
        {onBack && (
          <RoundButton onClick={onBack} label={icon === 'back' ? 'Back' : icon === 'home' ? 'Home' : 'Close'}>
            {ICONS[icon]}
          </RoundButton>
        )}
      </div>
      <h1 className="top-bar-title">{title}</h1>
      <div className="top-bar-side right">{right}</div>
    </header>
  );
}
