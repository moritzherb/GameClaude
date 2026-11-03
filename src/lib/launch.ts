/*
 * Opening a game from the home screen the way a phone opens an app: its page grows out of the
 * icon that was tapped. The icon's place is noted here just before navigating; the game's page
 * picks it up once and grows from there. Coming back, the home screen lets that icon settle again.
 */

export interface LaunchFrom {
  /** Centre of the icon, in px from the top left of the screen. */
  x: number;
  y: number;
  /** The icon's width over the screen's: where the growing starts. */
  scale: number;
  /** The icon's colour and emoji, shown over the page while it grows (like an app's splash). */
  color: string;
  emoji: string;
}

let pending: LaunchFrom | null = null;
let last: string | null = null;

/** Note where the tapped icon sits, then go. Without an icon (or with reduced motion) it just goes. */
export function launch(icon: Element | null, game: { id: string; color: string; emoji: string }, go: () => void) {
  last = game.id;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (icon && !reduce) {
    const r = icon.getBoundingClientRect();
    const w = window.innerWidth || 1;
    pending = { x: r.left + r.width / 2, y: r.top + r.height / 2, scale: Math.max(0.08, r.width / w), color: game.color, emoji: game.emoji };
  } else pending = null;
  go();
}

/** The page that opens takes the icon's place, once. */
export function takeLaunch(): LaunchFrom | null {
  const p = pending;
  pending = null;
  return p;
}

/** The game opened last from the home screen: its icon settles back when home shows again. */
export function lastLaunched(): string | null {
  const id = last;
  last = null;
  return id;
}
