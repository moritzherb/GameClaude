/*
 * Opening a game from the home screen: the screen fills evenly with the game's colour (the strip
 * under the clock along with it, frame by frame), the emoji glides from the icon to the middle and
 * grows; the game's page loads behind the splash, and the splash fades (the strip with it).
 * Coming back, the home screen lets that icon settle again.
 *
 * The splash is a plain element on the page, outside React: it has to stay put while one screen
 * goes and the next one comes. Only opacity and transforms move: nothing is laid out again.
 */

import { holdScreen } from './router';
import { coverTop, mix, topColor, topLayer, tone } from './themeColor';

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
  // The emoji starts just on the icon's and glides to the middle as the colour comes in: from the
  // same moment, along the same curve, never a moment on its own over the home screen.
  const dx = r.left + r.width / 2 - w / 2;
  const dy = r.top + r.height / 2 - h / 2;
  const small = (r.width * 0.5) / 110;
  // Not in a straight line: on a gentle arc, bowed to one side (as a thing tossed moves), the bow
  // largest halfway.
  const far = Math.hypot(dx, dy) || 1;
  const bow = Math.min(60, far * 0.18);
  const at = (k: number) => {
    if (k >= 1) return 'none';
    const lift = bow * 4 * k * (1 - k);
    return `translate(${dx * (1 - k) + (-dy / far) * lift}px, ${dy * (1 - k) + (dx / far) * lift}px) scale(${small + (1 - small) * k})`;
  };
  emoji.style.transform = at(0);
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
  // The glide runs on the phone's compositor (set from a script each frame, the grown emoji and its
  // shadow were drawn anew every frame: it stuttered). Its curve is the colour's, point by point,
  // and it starts at the colour's zero.
  let glide: Animation | null = null;
  if (typeof emoji.animate === 'function') {
    const N = 24;
    glide = emoji.animate(
      Array.from({ length: N + 1 }, (_, i) => ({ transform: at(inOut(i / N)) })),
      { duration: GROW, easing: 'linear', fill: 'forwards' },
    );
    glide.startTime = start;
  }
  const fadeAt = GROW + HOLD;
  /** The time between frames (ms), as it goes: 60 a second, 120, 30 when saving power. */
  let step = 1000 / 60;
  let prev = 0;
  /** How long the splash has shown (ms). Once grown, a frame never counts for more than two: the
   *  moment the phone spends drawing the game's page behind the splash holds the splash a little
   *  longer instead of making the fade skip ahead. */
  let shown = 0;
  let gone = false;
  // The page goes into the history now, while home still shows: an iPhone keeps a picture of each
  // entry from when it's left and shows it on a swipe back (home, not the splash). The page itself
  // shows once the splash covers the screen.
  const show = holdScreen();
  const done = () => {
    show();
    if (gone) return;
    gone = true;
    veil.remove();
    layer.release();
    if (strip === layer) strip = null;
  };
  /** How much colour shows `t` ms in. */
  const amount = (t: number) => (t < GROW ? inOut(t / GROW) : t < fadeAt ? 1 : 1 - inOut((t - fadeAt) / FADE));
  const frame = (now: number) => {
    if (gone || !veil.isConnected) return done();
    if (!prev || now - start < GROW) shown = now - start;
    else if (now > prev) shown += Math.min(now - prev, 2 * step);
    const t = shown;
    if (t >= fadeAt + FADE) return done();
    if (prev && now > prev) step += (Math.min(50, now - prev) - step) * 0.3;
    prev = now;
    const k = amount(t);
    const fading = t >= fadeAt;
    fill.style.opacity = String(k);
    if (!glide) emoji.style.transform = at(t < GROW ? k : 1);
    if (fading) {
      emoji.style.opacity = String(k);
      veil.style.pointerEvents = 'none';
    }
    // The phone blends its strip from the colour it was given a frame ago to this one, so on the
    // screen the strip is about a frame behind: it is set that much ahead (a frame, less what it
    // blends meanwhile), and both show the same at the same moment. Fading out, the page underneath
    // is the game's now.
    const ahead = t + step - (step * step) / (2 * STRIP_BLEND);
    layer.set(mix(ahead >= fadeAt ? layer.under() : from, color, amount(ahead)));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  go();
  window.setTimeout(show, GROW);
  // In case the frames stop (a tab in the background): gone in any case.
  window.setTimeout(done, GROW + HOLD + FADE + 1500);
}

/** The start-up screen's dark (index.html), and how long it takes to fade into the app (ms). */
export const BOOT_GROUND = '#10110e';
const BOOT_FADE = 300;

/**
 * The start-up screen fading into the app: its dark leaves the strip under the clock frame by frame
 * along with it (set as far ahead as the phone blends, as for a splash), to whatever the app shows
 * at the top by then. Until this runs the strip stays the start-up screen's (main.tsx covers it).
 */
export function fadeBoot(boot: HTMLElement) {
  boot.classList.add('done');
  boot.style.transition = 'none';
  boot.style.opacity = '1';
  const start = performance.now();
  let step = 1000 / 60;
  let prev = 0;
  let gone = false;
  const done = () => {
    if (gone) return;
    gone = true;
    coverTop(null);
    boot.remove();
  };
  const frame = (now: number) => {
    if (gone) return;
    const t = now - start;
    if (t >= BOOT_FADE) return done();
    if (prev && now > prev) step += (Math.min(50, now - prev) - step) * 0.3;
    prev = now;
    boot.style.opacity = String(1 - inOut(t / BOOT_FADE));
    const ahead = inOut((t + step - (step * step) / (2 * STRIP_BLEND)) / BOOT_FADE);
    coverTop(ahead >= 1 ? null : mix(BOOT_GROUND, topColor(), ahead));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // In case the frames stop (the app sent to the background meanwhile): gone in any case.
  window.setTimeout(done, BOOT_FADE + 500);
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
