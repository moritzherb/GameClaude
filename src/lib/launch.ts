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
const HOLD = 480;
const FADE = 320;
/** How long an iPhone takes to blend its strip under the clock to each new colour (ms). WebKit's
 *  WKColorExtensionView: a 0.1 s fade from the colour it was last given. */
const STRIP_BLEND = 100;
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
  // The emoji starts just on the icon's and glides to the middle as the colour comes in: the same
  // frame, the same amount (set in the loop below), never a moment on its own over the home screen.
  const dx = r.left + r.width / 2 - w / 2;
  const dy = r.top + r.height / 2 - h / 2;
  const small = (r.width * 0.5) / 110;
  const glide = (k: number) => {
    emoji.style.transform = k >= 1 ? 'none' : `translate(${dx * (1 - k)}px, ${dy * (1 - k)}px) scale(${small + (1 - small) * k})`;
  };
  glide(0);
  veil.append(fill, emoji);
  document.body.append(veil);

  // The colour comes in evenly all over, and the strip under the clock with it: both set in the
  // same frame from the same number (a compositor animation for the colour would start a moment
  // later on an iPhone than the strip, and the two would part). The strip goes from what was there
  // to the splash's colour along its top, and back to the game's ground.
  // The splash's colours as plain sRGB, the same ones for the page and the strip: an iPhone shows a
  // colour written in OKLCH in its wider range, the strip can't, and the two would differ.
  // The game's colour as the page has it (a game's may be one of the palette's variables).
  const base = getComputedStyle(veil).getPropertyValue('--c').trim() || game.color;
  const color = tone(base, 0.87, 1.03);
  fill.style.background = `linear-gradient(180deg, ${color} 0%, ${tone(base, 0.76)} 55%, ${tone(base, 0.68, 0.95)} 100%)`;
  const from = topColor();
  const layer = (strip = topLayer(from));
  const start = performance.now();
  /** The time between frames (ms), as it goes: 60 a second, 120, 30 when saving power. */
  let step = 1000 / 60;
  let prev = 0;
  let gone = false;
  const done = () => {
    if (gone) return;
    gone = true;
    veil.remove();
    layer.release();
    if (strip === layer) strip = null;
  };
  /** How much colour shows `t` ms in. */
  const amount = (t: number) => (t < GROW ? inOut(t / GROW) : t < GROW + HOLD ? 1 : 1 - inOut((t - GROW - HOLD) / FADE));
  const frame = (now: number) => {
    if (gone || !veil.isConnected) return done();
    const t = now - start;
    if (t >= GROW + HOLD + FADE) return done();
    if (prev && now > prev) step += (Math.min(50, now - prev) - step) * 0.3;
    prev = now;
    const k = amount(t);
    const fading = t >= GROW + HOLD;
    fill.style.opacity = String(k);
    if (t < GROW) glide(k);
    else if (emoji.style.transform !== 'none') glide(1);
    if (fading) {
      emoji.style.opacity = String(k);
      veil.style.pointerEvents = 'none';
    }
    // The phone blends its strip from the colour it was given a frame ago to this one, so on the
    // screen the strip is about a frame behind: it is set that much ahead (a frame, less what it
    // blends meanwhile), and both show the same at the same moment. Fading out, the page underneath
    // is the game's now.
    const ahead = t + step - (step * step) / (2 * STRIP_BLEND);
    layer.set(mix(ahead >= GROW + HOLD ? layer.under() : from, color, amount(ahead)));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.setTimeout(go, GROW);
  // In case the frames stop (a tab in the background): gone in any case.
  window.setTimeout(done, GROW + HOLD + FADE + 400);
}

/** Slow in, slow out (0 to 1), and never steep: a strip a moment off would show a shade off. */
const inOut = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** The game opened last from the home screen: its icon settles back when home shows again. */
export function lastLaunched(): string | null {
  const id = last;
  last = null;
  return id;
}
