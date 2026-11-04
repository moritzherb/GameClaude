/*
 * Opening a game from the home screen: the screen fills evenly with the game's colour (the strip
 * under the clock along with it, frame by frame), the emoji glides from the icon to the middle and
 * grows; the game's page loads behind the splash, and the splash fades (the strip with it).
 * Coming back, the home screen lets that icon settle again.
 *
 * The splash is a plain element on the page, outside React: it has to stay put while one screen
 * goes and the next one comes. Only opacity and transforms move: nothing is laid out again.
 */

import { mix, topColor, topLayer, tone } from './themeColor';

/** Filling the screen, staying as the splash, fading out (ms). */
const GROW = 420;
const HOLD = 600;
const FADE = 320;
/** How long a splash shows before it fades (the start-up screen keeps to it too). */
export const SPLASH_MS = GROW + HOLD;

let last: string | null = null;
/** The splash's colour on the strip under the clock, while one shows. */
let strip: ReturnType<typeof topLayer> | null = null;

/**
 * Fill the screen with the game's splash, the emoji coming out of the tapped icon, then go. Without
 * an icon (or with reduced motion) it just goes. `glyphs` are the emoji on the splash (two for
 * Princess/King).
 */
export function launch(icon: Element | null, game: { id: string; color: string; emoji: string }, go: () => void, glyphs: string[] = [game.emoji]) {
  last = game.id;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!icon || reduce || typeof document === 'undefined') {
    go();
    return;
  }
  document.querySelector('.launch-veil')?.remove();
  strip?.release();
  strip = null;
  const r = icon.getBoundingClientRect();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const veil = document.createElement('div');
  veil.className = 'launch-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.setProperty('--c', game.color);
  const fill = document.createElement('span');
  fill.className = 'launch-fill';
  const emoji = document.createElement('span');
  emoji.className = glyphs.length > 1 ? 'launch-emoji app-duo' : 'launch-emoji';
  for (const g of glyphs) {
    const part = document.createElement(glyphs.length > 1 ? 'i' : 'span');
    part.textContent = g;
    emoji.append(part);
  }
  veil.append(fill, emoji);
  document.body.append(veil);

  // The emoji starts just on the icon's and glides to the middle.
  const dx = r.left + r.width / 2 - w / 2;
  const dy = r.top + r.height / 2 - h / 2;
  emoji.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${(r.width * 0.5) / 110})` }, { transform: 'none' }], {
    duration: GROW,
    easing: 'cubic-bezier(0.2, 0.85, 0.25, 1)',
    fill: 'forwards',
  });

  // The colour comes in evenly all over, and the strip under the clock with it: both set in the
  // same frame from the same number (a compositor animation for the colour would start a moment
  // later on an iPhone than the strip, and the two would part). The strip goes from what was there
  // to the splash's tone along its top (see .launch-fill in pop.css), and back to the game's ground.
  // The game's colour as the page has it (a game's may be one of the palette's variables).
  const color = tone(getComputedStyle(veil).getPropertyValue('--c').trim() || game.color, 0.87, 1.03);
  const from = topColor();
  const layer = (strip = topLayer(from));
  const start = performance.now();
  let gone = false;
  const done = () => {
    if (gone) return;
    gone = true;
    veil.remove();
    layer.release();
    if (strip === layer) strip = null;
  };
  const frame = (now: number) => {
    if (gone || !veil.isConnected) return done();
    const t = now - start;
    let k: number;
    let under = from;
    if (t < GROW) k = inOut(t / GROW);
    else if (t < GROW + HOLD) k = 1;
    else {
      // Fading out: the page underneath is the game's now.
      k = 1 - inOut((t - GROW - HOLD) / FADE);
      under = layer.under();
      veil.style.pointerEvents = 'none';
    }
    if (t >= GROW + HOLD + FADE) return done();
    fill.style.opacity = String(k);
    if (t >= GROW + HOLD) emoji.style.opacity = String(k);
    layer.set(mix(under, color, k));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.setTimeout(go, GROW);
  // In case the frames stop (a tab in the background): gone in any case.
  window.setTimeout(done, GROW + HOLD + FADE + 400);
}

/** Slow in, slow out (0 to 1). */
const inOut = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

/** The game opened last from the home screen: its icon settles back when home shows again. */
export function lastLaunched(): string | null {
  const id = last;
  last = null;
  return id;
}
