import { useRef, type ReactNode } from 'react';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { useFitWords } from '../lib/useFitWords';
import { BackIcon, CloseIcon } from './Icons';

interface Props {
  title?: ReactNode;
  /** Where the left button goes. */
  onBack?: () => void;
  icon?: 'back' | 'close';
  right?: ReactNode;
  className?: string;
}

export function RoundButton({ onClick, label, children, accent }: { onClick: () => void; label: string; children: ReactNode; accent?: boolean }) {
  return (
    <button
      type="button"
      className={`round-btn${accent ? ' accent' : ''}`}
      aria-label={label}
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

/** Same layout on every screen: escape hatch top-left, title in the middle, extras on the right. */
export default function TopBar({ title, onBack, icon = 'back', right, className }: Props) {
  // A long word in the title ("Pferderennen" on a 320-wide phone) gets smaller instead of cut.
  const heading = useRef<HTMLHeadingElement>(null);
  useFitWords(heading, typeof title === 'string' ? title : '', 13);
  return (
    <header className={`top-bar${className ? ` ${className}` : ''}`}>
      <div className="top-bar-side">
        {onBack && (
          <RoundButton onClick={onBack} label={icon === 'back' ? t('Back') : t('Close')}>
            {icon === 'back' ? <BackIcon /> : <CloseIcon />}
          </RoundButton>
        )}
      </div>
      <h1 ref={heading} className="top-bar-title">
        {title}
      </h1>
      <div className="top-bar-side right">{right}</div>
    </header>
  );
}
