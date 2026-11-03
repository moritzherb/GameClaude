import type { CSSProperties, ReactNode } from 'react';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { launch } from '../lib/launch';
import { navigate, paths } from '../lib/router';

/**
 * An app icon. iPhone: a plate in the game's colour, a glass layer over it and the emoji on top,
 * each a little apart, so the icon looks built from layers. Android: a round plate, emoji on it.
 * The look comes from the stylesheet (html[data-os]).
 */
export function IconArt({ color, children, size }: { color: string; children: ReactNode; size?: 'sm' | 'lg' }) {
  return (
    <span className={`app-icon${size ? ` ${size}` : ''}`} style={{ '--c': color } as CSSProperties}>
      <span className="app-plate" />
      <span className="app-glass" />
      <span className="app-emoji" aria-hidden>
        {children}
      </span>
    </span>
  );
}

/** One app on the home screen: the icon, its name under it, maybe a badge. */
export function AppButton({
  id,
  label,
  color,
  glyph,
  badge,
  returning,
  onOpen,
}: {
  id?: string;
  label: string;
  color: string;
  glyph: ReactNode;
  badge?: ReactNode;
  /** The app the user just came back from: its icon settles back into place. */
  returning?: boolean;
  /** Gets the icon, to grow the next page out of it. */
  onOpen: (icon: Element | null) => void;
}) {
  return (
    <button
      type="button"
      className={`app${returning ? ' returning' : ''}`}
      data-id={id}
      aria-label={label}
      onClick={(e) => {
        sfx.pop();
        buzz();
        onOpen(e.currentTarget.querySelector('.app-icon'));
      }}
    >
      <IconArt color={color}>{glyph}</IconArt>
      {badge != null && <span className="app-badge">{badge}</span>}
      <span className="app-label">{label}</span>
    </button>
  );
}

/** A game as an app: its page grows out of the icon. */
export function GameApp({ game, returning }: { game: GameDefinition; returning?: boolean }) {
  return (
    <AppButton
      id={game.id}
      label={t(game.name)}
      color={game.color}
      glyph={game.emoji}
      returning={returning}
      onOpen={(icon) => launch(icon, game, () => navigate(paths.game(game.id)))}
    />
  );
}
