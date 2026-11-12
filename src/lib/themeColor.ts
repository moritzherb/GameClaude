/*
 * The colour of the strip under the phone's clock (and of the browser's bar on Android): always
 * what the app shows at the top right now. On a plain screen that's the ground; over it a splash,
 * a dimmed backdrop, a wallpaper lay their own colour (`tintTop`), the newest on top.
 *
 * On an iPhone's home-screen app the strip takes the colour of .top-edge (global.css; set on that
 * element alone, so nothing else is styled again when it changes); elsewhere the theme-color tag.
 */

/** The ground colour of each look (light, dark): the browser's bar and the strip under the clock take it. */
export const GROUND = { pop: ['#ece8dd', '#20211c'], classic: ['#f1ede3', '#10110e'] } as const;

/** Light or dark chosen in Settings (null: as the phone is). */
let forced: 'light' | 'dark' | null = null;
let pair: [string, string] = [GROUND.pop[0], GROUND.pop[1]];
/** Colours laid over the top of the screen, oldest first. */
const layers: { color: string }[] = [];
/** The start-up screen's colour while it lies over everything (null once it's gone). */
let cover: string | null = null;

function paint() {
  if (typeof document === 'undefined') return;
  const top = cover ?? layers[layers.length - 1]?.color;
  const edge = document.querySelector<HTMLElement>('.top-edge');
  if (edge) {
    edge.style.backgroundColor = top ?? '';
    nudge();
  }
  const phoneDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const dark = forced ? forced === 'dark' : m.media ? m.media.includes('dark') : phoneDark;
    m.content = top ?? (dark ? pair[1] : pair[0]);
  });
}

/**
 * An iPhone looks at the colour of what's fixed along the top only when something fixed comes or
 * goes on the page (WebKit: a fixed element added or removed), not when a colour changes. So each
 * time the strip's colour changes, a speck in the middle (no size, nothing to see, never along an
 * edge) turns fixed or back: the phone looks again, the strip takes the new colour that frame.
 */
let speck: HTMLElement | null = null;
function nudge() {
  if (!speck?.isConnected) {
    speck = document.createElement('i');
    speck.setAttribute('aria-hidden', 'true');
    speck.style.cssText = 'position:absolute;top:50%;left:50%;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    document.body?.append(speck);
  }
  speck.style.position = speck.style.position === 'fixed' ? 'absolute' : 'fixed';
}

// The phone switching between light and dark (with Auto): the bar along.
if (typeof matchMedia === 'function') matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', paint);

/** Colour the browser's bar and the strip under the clock (light mode, dark mode). */
export function setThemeColor(light: string, dark: string) {
  pair = [light, dark];
  paint();
}

/** Light or dark as chosen in Settings: the page (html[data-theme]) and the bars follow. */
export function setTheme(theme: 'light' | 'dark' | null) {
  forced = theme;
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  paint();
}

/**
 * The start-up screen (index.html) lies over the whole app while it shows: the strip under the clock
 * keeps its colour, whatever the app lays at the top underneath meanwhile (a wallpaper, a game's
 * colour). Set as it fades, null when it's gone. The colours under it go on as usual (`topColor`).
 */
export function coverTop(color: string | null) {
  if (color === cover) return;
  cover = color;
  paint();
}

/** Lay a colour over the top of the screen, to change as it goes (`set`) and take away (`release`). */
export function topLayer(color: string) {
  const layer = { color };
  layers.push(layer);
  paint();
  return {
    set(next: string) {
      if (next === layer.color) return;
      layer.color = next;
      if (layers[layers.length - 1] === layer) paint();
    },
    release() {
      const i = layers.indexOf(layer);
      if (i < 0) return;
      layers.splice(i, 1);
      paint();
    },
    /** What would show at the top without this layer: the ones under it, or the ground. */
    under() {
      const i = layers.indexOf(layer);
      return (i > 0 ? layers[i - 1].color : null) ?? ground();
    },
  };
}

/** Lay a colour over the top of the screen; the function returned takes it away again. */
export function tintTop(color: string): () => void {
  const layer = topLayer(color);
  return layer.release;
}

/** The colour at the top now: the newest one laid there, or the page's ground. */
export function topColor(): string {
  return layers[layers.length - 1]?.color ?? ground();
}

/** The page's ground colour. */
function ground(): string {
  const bg = typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  return bg || pair[1];
}

type RGBA = [number, number, number, number];

/** A CSS colour as the browser gives it back: #hex, rgb()/rgba(), color(srgb …). Else null. */
export function parseColor(css: string): RGBA | null {
  const s = css.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(s)?.[1];
  if (hex) {
    const full = hex.length < 6 ? [...hex].map((c) => c + c).join('') : hex;
    const n = (i: number) => parseInt(full.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), full.length >= 8 ? n(6) / 255 : 1];
  }
  const nums = (body: string) => body.split(/[\s,/]+/).filter(Boolean).map(Number);
  const rgb = /^rgba?\((.*)\)$/.exec(s)?.[1];
  if (rgb) {
    const [r, g, b, a = 1] = nums(rgb);
    return [r, g, b, a];
  }
  const srgb = /^color\(srgb (.*)\)$/.exec(s)?.[1];
  if (srgb) {
    const [r, g, b, a = 1] = nums(srgb);
    return [r * 255, g * 255, b * 255, a];
  }
  return null;
}

const hexOf = ([r, g, b]: number[]) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Between two colours: `a` at 0, `b` at 1. */
export function mix(a: string, b: string, k: number): string {
  const x = parseColor(a);
  const y = parseColor(b);
  if (!x || !y) return k < 0.5 ? a : b;
  return hexOf([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * k));
}

/** `css` (with its own see-through-ness) laid over the colour at the top now. */
export function overTop(css: string): string {
  const over = parseColor(css);
  const under = parseColor(topColor());
  if (!over || !under) return topColor();
  const a = over[3];
  return hexOf([0, 1, 2].map((i) => under[i] * (1 - a) + over[i] * a));
}

/** A colour made lighter or darker and more or less vivid in OKLCH (as the CSS `oklch(from …)` in pop.css). */
export function tone(css: string, kl: number, kc = 1): string {
  const c = parseColor(css);
  if (!c) return css;
  const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [lin(c[0]), lin(c[1]), lin(c[2])];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = (0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s) * kl;
  const A = (1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s) * kc;
  const B = (0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s) * kc;
  const l2 = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m2 = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s2 = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const gam = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  return hexOf([
    gam(4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2),
    gam(-1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2),
    gam(-0.0041960863 * l2 - 0.7034186147 * m2 + 1.707614701 * s2),
  ]);
}
