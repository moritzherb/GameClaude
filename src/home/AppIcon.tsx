import type { CSSProperties, ReactNode } from 'react';
import type { GameDefinition } from '../games/types';
import { t, tx } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { launch } from '../lib/launch';
import { navigate, paths } from '../lib/router';

/** Under the icon a game goes by a short name, as apps do on a home screen. Its page shows the full one. */
const SHORT: Record<string, string> = {
  'princess-treatment': tx('Treatment'),
  'horse-race': tx('Horses'),
  'ten-but': '10/10',
  'fuck-the-dealer': tx('The Dealer'),
};
/** A second emoji, for a game about two: Princess and King. */
const SECOND: Record<string, string> = { 'princess-treatment': '🤴' };

export const shortName = (game: GameDefinition) => t(SHORT[game.id] ?? game.name);

/** The emoji on a game's icon and splash. */
export const glyphsOf = (game: GameDefinition) => (SECOND[game.id] ? [game.emoji, SECOND[game.id]] : [game.emoji]);

/** A game's emoji for its icon (two of them for Princess/King). */
export function GameGlyph({ game }: { game: GameDefinition }) {
  const second = SECOND[game.id];
  if (!second) return <>{game.emoji}</>;
  return (
    <span className="app-duo">
      <i>{game.emoji}</i>
      <i>{second}</i>
    </span>
  );
}

/**
 * An app icon: a tile in the game's colour, lit softly from above and floating on its shadow,
 * the emoji floating over it with a shadow of its own. Round on Android (the stylesheet decides).
 * `tone` is for the dock: lime (the shuffle) or dark.
 */
export function IconArt({ color, tone, size, corner, children }: { color?: string; tone?: 'lime' | 'dark'; size?: 'sm' | 'lg'; corner?: ReactNode; children: ReactNode }) {
  return (
    <span className={`app-icon${tone ? ` ${tone}` : ''}${size ? ` ${size}` : ''}`} style={color ? ({ '--c': color } as CSSProperties) : undefined}>
      <span className="app-emoji" aria-hidden>
        {children}
      </span>
      {corner}
    </span>
  );
}

/** One app on the home screen: the icon, its name under it, maybe a badge. */
export function AppButton({
  id,
  label,
  name,
  color,
  tone,
  glyph,
  badge,
  removable,
  returning,
  onOpen,
}: {
  id?: string;
  label: string;
  /** The full name, for screen readers (the label may be the short one). */
  name?: string;
  color?: string;
  tone?: 'lime' | 'dark';
  glyph: ReactNode;
  badge?: ReactNode;
  /** On the home screen's grid: while the apps wiggle, a "−" in the corner takes it off (home/useHomeEdit.ts). */
  removable?: boolean;
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
      aria-label={name ?? label}
      onClick={(e) => {
        sfx.pop();
        buzz();
        onOpen(e.currentTarget.querySelector('.app-icon'));
      }}
    >
      <IconArt color={color} tone={tone} corner={removable && <span className="app-x" aria-hidden />}>
        {glyph}
      </IconArt>
      {badge != null && <span className="app-badge">{badge}</span>}
      <span className="app-label">{label}</span>
    </button>
  );
}

/** A game as an app: its page grows out of the icon. */
export function GameApp({ game, returning, removable }: { game: GameDefinition; returning?: boolean; removable?: boolean }) {
  return (
    <AppButton
      id={game.id}
      removable={removable}
      label={shortName(game)}
      name={t(game.name)}
      color={game.color}
      glyph={<GameGlyph game={game} />}
      returning={returning}
      onOpen={(icon) => launch(icon, game, () => navigate(paths.game(game.id)), glyphsOf(game))}
    />
  );
}
