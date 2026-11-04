/*
 * Opening a game from the home screen the way a phone opens an app: the icon grows over the home
 * screen into the game's splash (its colour and emoji), the game's page loads behind it, and the
 * splash fades. Coming back, the home screen lets that icon settle again.
 *
 * The splash is a plain element on the page, outside React: it has to stay put while one screen
 * goes and the next one comes. While it covers the screen the strip under the clock takes its colour.
 */

import { tintTop, tone } from './themeColor';

/** Growing out of the icon, staying as the splash, fading out (ms). */
const GROW = 420;
const HOLD = 600;
const FADE = 320;
/** The splash's top edge is at the top of the screen after this share of the growing. */
const TOP_AT = 0.55;
/** How long a splash shows before it fades (the start-up screen keeps to it too). */
export const SPLASH_MS = GROW + HOLD;

let last: string | null = null;
/** Takes the splash's colour off the strip under the clock again. */
let untint: (() => void) | null = null;

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
  untint?.();
  untint = null;
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
  // Its top edge rises faster than the rest (at the top after a little over half the time): the
  // strip under the clock, which the phone recolours with a lag, takes its colour from the start and
  // so meets it there, with no dark band between them.
  const ease = 'cubic-bezier(0.2, 0.85, 0.25, 1)';
  const eased = (t: number, k: number) => 1 - (1 - Math.min(1, t)) ** k;
  const cut = (t: number) => {
    const p = eased(t, 3.5);
    const top = eased(t / TOP_AT, 3);
    const at = (from: number, k: number) => from + (-2 - from) * k;
    return `inset(${at(r.top, top)}px ${at(w - r.right, p)}px ${at(h - r.bottom, p)}px ${at(r.left, p)}px round ${radius * (1 - p)}px)`;
  };
  const grow = veil.animate(
    Array.from({ length: 25 }, (_, i) => ({ clipPath: cut(i / 24) })),
    { duration: GROW, easing: 'linear', fill: 'both' },
  );
  // Grown: no cut left at all (not even a hairline at the edges).
  grow.onfinish = () => grow.cancel();
  const dx = r.left + r.width / 2 - w / 2;
  const dy = r.top + r.height / 2 - h / 2;
  emoji.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${(r.width * 0.5) / 110})` }, { transform: 'none' }], { duration: GROW, easing: ease, fill: 'both' });
  // The strip under the clock in the splash's colour along its top (see .launch-veil in pop.css),
  // from the tap (the phone takes a moment to follow) until the splash starts to fade.
  // The game's colour as the page has it (a game's may be one of the palette's variables).
  const color = getComputedStyle(veil).getPropertyValue('--c').trim() || game.color;
  let mine: (() => void) | null = (untint = tintTop(tone(color, 0.87, 1.03)));
  const off = () => {
    mine?.();
    if (untint === mine) untint = null;
    mine = null;
  };
  window.setTimeout(go, GROW);
  window.setTimeout(off, GROW + HOLD);
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
