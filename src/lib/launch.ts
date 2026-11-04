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
const HOLD = 600;
const FADE = 320;
/** How long a splash shows before it fades (the start-up screen keeps to it too). */
export const SPLASH_MS = GROW + HOLD;

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
  const w = window.innerWidth;
  const h = window.innerHeight;
  const radius = parseFloat(getComputedStyle(icon).borderTopLeftRadius) || r.width * 0.24;
  const veil = document.createElement('div');
  veil.className = 'launch-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.setProperty('--c', game.color);
  const emoji = document.createElement('span');
  emoji.className = glyphs.length > 1 ? 'launch-emoji app-duo' : 'launch-emoji';
  for (const g of glyphs) {
    const part = document.createElement(glyphs.length > 1 ? 'i' : 'span');
    part.textContent = g;
    emoji.append(part);
  }
  veil.append(emoji);
  document.body.append(veil);
  // The splash covers the screen from the start, cut to the icon's shape, and the cut opens up to
  // the whole screen; the emoji glides from the icon to the middle and grows. Nothing on the page
  // is laid out again while it runs (it used to grow by its size: every frame a new layout).
  const ease = 'cubic-bezier(0.2, 0.85, 0.25, 1)';
  veil.animate(
    [
      { clipPath: `inset(${r.top}px ${w - r.right}px ${h - r.bottom}px ${r.left}px round ${radius}px)` },
      { clipPath: `inset(0px 0px 0px 0px round 0px)` },
    ],
    { duration: GROW, easing: ease, fill: 'both' },
  );
  const dx = r.left + r.width / 2 - w / 2;
  const dy = r.top + r.height / 2 - h / 2;
  emoji.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${(r.width * 0.5) / 110})` }, { transform: 'none' }], { duration: GROW, easing: ease, fill: 'both' });
  window.setTimeout(go, GROW);
  window.setTimeout(() => {
    const out = veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE, easing: 'ease', fill: 'forwards' });
    out.onfinish = () => veil.remove();
    veil.style.pointerEvents = 'none';
  }, GROW + HOLD);
  // In case the fade never ends (a tab in the background): gone in any case.
  window.setTimeout(() => veil.remove(), GROW + HOLD + FADE + 400);
}

/** The game opened last from the home screen: its icon settles back when home shows again. */
export function lastLaunched(): string | null {
  const id = last;
  last = null;
  return id;
}
