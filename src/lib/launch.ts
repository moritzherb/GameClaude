/*
 * Opening a game from the home screen the way a phone opens an app: the icon grows over the home
 * screen into the game's splash (its colour and emoji), the game's page loads behind it, and the
 * splash fades. Coming back, the home screen lets that icon settle again.
 *
 * The splash is a plain element on the page, outside React: it has to stay put while one screen
 * goes and the next one comes.
 */

/** Growing out of the icon, staying as the splash, fading out (ms). */
const GROW = 420;
const HOLD = 700;
const FADE = 320;

let last: string | null = null;

/**
 * Grow the game's splash out of the tapped icon, then go. Without an icon (or with reduced motion)
 * it just goes. `glyphs` are the emoji on the splash (two for Princess/King).
 */
export function launch(icon: Element | null, game: { id: string; color: string; emoji: string }, go: () => void, glyphs: string[] = [game.emoji]) {
  last = game.id;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!icon || reduce || typeof document === 'undefined') {
    go();
    return;
  }
  document.querySelector('.launch-veil')?.remove();
  const r = icon.getBoundingClientRect();
  const veil = document.createElement('div');
  veil.className = 'launch-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.setProperty('--c', game.color);
  Object.assign(veil.style, {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    borderRadius: getComputedStyle(icon).borderRadius,
    fontSize: `${Math.round(r.width * 0.5)}px`,
  });
  const emoji = document.createElement('span');
  emoji.className = glyphs.length > 1 ? 'launch-emoji app-duo' : 'launch-emoji';
  for (const g of glyphs) {
    const part = document.createElement(glyphs.length > 1 ? 'i' : 'span');
    part.textContent = g;
    emoji.append(part);
  }
  veil.append(emoji);
  document.body.append(veil);
  // Once it is on the screen at the icon's place, it grows to fill the screen.
  void veil.offsetWidth;
  Object.assign(veil.style, { left: '0px', top: '0px', width: '100%', height: '100%', borderRadius: '0px', fontSize: '110px' });
  window.setTimeout(go, GROW);
  window.setTimeout(() => veil.classList.add('done'), GROW + HOLD);
  window.setTimeout(() => veil.remove(), GROW + HOLD + FADE + 50);
}

/** The game opened last from the home screen: its icon settles back when home shows again. */
export function lastLaunched(): string | null {
  const id = last;
  last = null;
  return id;
}
