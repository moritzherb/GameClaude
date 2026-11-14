/**
 * Wood and felt for the box, drawn once on a canvas: growth rings that wander, fine fibres along the
 * grain, a slow change of tone across the plank. Plain CSS stripes read as a pattern, not as wood.
 * The same seed draws the same plank every time.
 */

type RGB = [number, number, number];

function hash(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const fade = (t: number) => t * t * (3 - 2 * t);

function noise(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number, octaves: number) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * f, y * f, seed + i * 17);
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / (1 - 0.5 ** octaves);
}

interface Plank {
  /** Its size in CSS px; drawn at `scale` pixels to each. */
  w: number;
  h: number;
  scale: number;
  /** Grain runs up and down (a flap) instead of across (the frame). */
  upright?: boolean;
  light: RGB;
  dark: RGB;
  /** How strongly the rings show (0–1). */
  rings: number;
  /** Rings per CSS px across the grain. */
  ringScale: number;
  seed: number;
}

/** Along the grain the wood changes slowly: worked out every few pixels there and smoothed in between. */
const ALONG = 3;

function drawPlank(p: Plank): string {
  if (typeof document === 'undefined') return '';
  const W = Math.round(p.w * p.scale);
  const H = Math.round(p.h * p.scale);
  const sw = p.upright ? W : Math.ceil(W / ALONG);
  const sh = p.upright ? Math.ceil(H / ALONG) : H;
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext('2d');
  if (!sctx) return '';
  const img = sctx.createImageData(sw, sh);
  const px = img.data;
  const k = 1 / p.scale;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      // In CSS px, along the grain (u) and across it (v).
      const u = (p.upright ? y * ALONG : x * ALONG) * k;
      const v = (p.upright ? x : y) * k;
      const warp = fbm(u * 0.005, v * 0.02, p.seed, 3);
      const t = v * p.ringScale + warp * 5 + fbm(u * 0.0012, v * 0.004, p.seed + 5, 2) * 3;
      const ring = (t - Math.floor(t)) ** 5;
      const fibre = fbm(u * 0.025, v * 0.85, p.seed + 9, 2);
      const tone = fbm(u * 0.0025, v * 0.012, p.seed + 3, 2);
      const m = Math.min(1, Math.max(0, 0.2 + ring * p.rings + (fibre - 0.5) * 0.42 + (tone - 0.5) * 0.5));
      const i = (y * sw + x) * 4;
      px[i] = p.light[0] + (p.dark[0] - p.light[0]) * m;
      px[i + 1] = p.light[1] + (p.dark[1] - p.light[1]) * m;
      px[i + 2] = p.light[2] + (p.dark[2] - p.light[2]) * m;
      px[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, W, H);
  return c.toDataURL('image/jpeg', 0.92);
}

/** Felt: fine fibres, lighter and darker, on a see-through ground (laid over the felt's colour). */
function drawFelt(size: number, seed: number): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(size, size);
  const px = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = hash(x, y, seed) * 0.6 + fbm(x * 0.3, y * 0.3, seed + 1, 2) * 0.4;
      const i = (y * size + x) * 4;
      const lightPx = n > 0.5;
      px[i] = px[i + 1] = px[i + 2] = lightPx ? 255 : 0;
      px[i + 3] = Math.round(Math.abs(n - 0.5) * 2 * 46);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

let cached: Record<string, string> | null = null;

/** The box's materials as CSS custom properties (url(...) each), drawn on first use, sharp on this screen. */
export function woodVars(): Record<string, string> {
  if (cached) return cached;
  const scale = typeof window === 'undefined' ? 1 : Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
  const url = (s: string) => (s ? `url("${s}")` : 'none');
  const walnut = { light: [170, 112, 62] as RGB, dark: [86, 48, 22] as RGB, rings: 0.62, ringScale: 0.055 };
  cached = {
    // Walnut for the frame, grain along it; the same wood stood upright for the sides.
    '--nf-frame': url(drawPlank({ w: 440, h: 440, scale, ...walnut, seed: 7 })),
    '--nf-frame-up': url(drawPlank({ w: 24, h: 440, scale, upright: true, ...walnut, seed: 11 })),
    // Pale maple for the flaps, grain up and down.
    '--nf-flap': url(drawPlank({ w: 360, h: 90, scale, upright: true, light: [246, 222, 176], dark: [205, 157, 99], rings: 0.42, ringScale: 0.07, seed: 23 })),
    '--nf-felt': url(drawFelt(128, 5)),
  };
  return cached;
}
