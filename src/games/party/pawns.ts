import { tx } from '../../i18n';

/** A pawn to play with: a classic one in a colour, a special one, or a figure. */
export interface PawnDef {
  id: string;
  /** English; render with t(). */
  name: string;
  look: 'classic' | 'gold' | 'disco' | 'figure';
  color: string;
  /** A figure's emoji (it stands on a little base in `color`). */
  emoji?: string;
}

export const PAWNS: PawnDef[] = [
  { id: 'pink', name: tx('Pink'), look: 'classic', color: '#ff4fa3' },
  { id: 'red', name: tx('Red'), look: 'classic', color: '#e5322d' },
  { id: 'blue', name: tx('Blue'), look: 'classic', color: '#2463e8' },
  { id: 'orange', name: tx('Orange'), look: 'classic', color: '#ff8a1c' },
  { id: 'yellow', name: tx('Yellow'), look: 'classic', color: '#ffd21a' },
  { id: 'white', name: tx('White'), look: 'classic', color: '#f1eee6' },
  { id: 'black', name: tx('Black'), look: 'classic', color: '#2b2b30' },
  { id: 'green', name: tx('Green'), look: 'classic', color: '#1f9a4b' },
  { id: 'lime', name: tx('Lime'), look: 'classic', color: '#b9e62b' },
  { id: 'purple', name: tx('Purple'), look: 'classic', color: '#8a5cf6' },
  { id: 'gold', name: tx('Golden King'), look: 'gold', color: '#e9b824' },
  { id: 'disco', name: tx('Disco'), look: 'disco', color: '#c9d2dc' },
  { id: 'beer', name: tx('Beer'), look: 'figure', color: '#f2b233', emoji: '🍺' },
  { id: 'unicorn', name: tx('Unicorn'), look: 'figure', color: '#ff9fd6', emoji: '🦄' },
  { id: 'flamingo', name: tx('Flamingo'), look: 'figure', color: '#ff7eb6', emoji: '🦩' },
  { id: 'frog', name: tx('Frog'), look: 'figure', color: '#4cc36a', emoji: '🐸' },
  { id: 'ghost', name: tx('Ghost'), look: 'figure', color: '#d9dde6', emoji: '👻' },
  { id: 'dino', name: tx('Dino'), look: 'figure', color: '#56b870', emoji: '🦖' },
  { id: 'cowboy', name: tx('Cowboy'), look: 'figure', color: '#c8935a', emoji: '🤠' },
  { id: 'pineapple', name: tx('Pineapple'), look: 'figure', color: '#ffd23f', emoji: '🍍' },
  { id: 'pizza', name: tx('Pizza'), look: 'figure', color: '#ff8a3d', emoji: '🍕' },
  { id: 'alien', name: tx('Alien'), look: 'figure', color: '#9be15d', emoji: '👽' },
];

export const pawnById = (id: string | undefined) => PAWNS.find((p) => p.id === id) ?? PAWNS[0];

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A colour mixed towards white (amount > 0) or black (< 0). */
export function shade(hex: string, amount: number) {
  const [r, g, b] = rgb(hex);
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return `rgb(${Math.round(r + (to - r) * a)},${Math.round(g + (to - g) * a)},${Math.round(b + (to - b) * a)})`;
}

/** The classic pawn's outline (bell body, collar), standing on (0, 0), `h` tall. */
function body(ctx: CanvasRenderingContext2D, h: number) {
  ctx.beginPath();
  ctx.moveTo(-0.27 * h, -0.13 * h);
  ctx.bezierCurveTo(-0.25 * h, -0.34 * h, -0.1 * h, -0.44 * h, -0.085 * h, -0.62 * h);
  ctx.lineTo(0.085 * h, -0.62 * h);
  ctx.bezierCurveTo(0.1 * h, -0.44 * h, 0.25 * h, -0.34 * h, 0.27 * h, -0.13 * h);
  ctx.ellipse(0, -0.13 * h, 0.27 * h, 0.07 * h, 0, 0, Math.PI);
  ctx.closePath();
}

function sideGradient(ctx: CanvasRenderingContext2D, h: number, color: string, gloss = 0.4) {
  const g = ctx.createLinearGradient(-0.3 * h, 0, 0.3 * h, 0);
  g.addColorStop(0, shade(color, -0.25));
  g.addColorStop(0.3, shade(color, gloss));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.45));
  return g;
}

/** A pawn standing with its base at (0, 0), `h` pixels tall (the canvas already moved there). */
export function drawPawnAt(ctx: CanvasRenderingContext2D, def: PawnDef, h: number) {
  const line = Math.max(1, h * 0.014);
  ctx.lineWidth = line;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  if (def.look === 'figure') {
    // A round base in the colour, the figure standing on it.
    ctx.fillStyle = shade(def.color, -0.35);
    ctx.beginPath();
    ctx.ellipse(0, -0.05 * h, 0.3 * h, 0.09 * h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sideGradient(ctx, h, def.color, 0.35);
    ctx.beginPath();
    ctx.ellipse(0, -0.1 * h, 0.3 * h, 0.09 * h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${Math.round(h * 0.8)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(def.emoji ?? '?', 0, -0.17 * h);
    return;
  }
  const color = def.color;
  const gloss = def.look === 'disco' ? 0.7 : def.look === 'gold' ? 0.55 : 0.4;
  // Base: a flat cylinder.
  ctx.fillStyle = shade(color, -0.4);
  ctx.beginPath();
  ctx.ellipse(0, -0.05 * h, 0.3 * h, 0.08 * h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = sideGradient(ctx, h, color, gloss);
  ctx.fillRect(-0.3 * h, -0.13 * h, 0.6 * h, 0.08 * h);
  ctx.beginPath();
  ctx.ellipse(0, -0.13 * h, 0.3 * h, 0.08 * h, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 0.12);
  ctx.fill();
  ctx.stroke();
  // Body.
  body(ctx, h);
  ctx.fillStyle = sideGradient(ctx, h, color, gloss);
  ctx.fill();
  ctx.stroke();
  // Collar.
  ctx.beginPath();
  ctx.ellipse(0, -0.62 * h, 0.16 * h, 0.05 * h, 0, 0, Math.PI * 2);
  ctx.fillStyle = sideGradient(ctx, h * 0.6, color, gloss);
  ctx.fill();
  ctx.stroke();
  // Head: a shiny ball.
  const head = ctx.createRadialGradient(-0.06 * h, -0.86 * h, 0.01 * h, 0, -0.8 * h, 0.18 * h);
  head.addColorStop(0, shade(color, gloss + 0.2));
  head.addColorStop(0.45, color);
  head.addColorStop(1, shade(color, -0.4));
  ctx.beginPath();
  ctx.arc(0, -0.8 * h, 0.165 * h, 0, Math.PI * 2);
  ctx.fillStyle = head;
  ctx.fill();
  ctx.stroke();
  if (def.look === 'disco') {
    // Mirror ball: little tiles catching the light.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -0.8 * h, 0.16 * h, 0, Math.PI * 2);
    ctx.clip();
    const cell = 0.055 * h;
    for (let gx = -3; gx <= 3; gx++)
      for (let gy = -3; gy <= 3; gy++) {
        const hue = (gx * 47 + gy * 83 + 400) % 360;
        ctx.fillStyle = (gx + gy) % 2 ? `hsla(${hue},90%,80%,0.55)` : 'rgba(255,255,255,0.35)';
        ctx.fillRect(gx * cell - cell / 2, -0.8 * h + gy * cell - cell / 2, cell * 0.85, cell * 0.85);
      }
    ctx.restore();
  }
  if (def.look === 'gold') {
    // A little crown on top.
    const y = -0.93 * h;
    const w = 0.13 * h;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.lineTo(-w, y - 0.09 * h);
    ctx.lineTo(-w / 2, y - 0.04 * h);
    ctx.lineTo(0, y - 0.11 * h);
    ctx.lineTo(w / 2, y - 0.04 * h);
    ctx.lineTo(w, y - 0.09 * h);
    ctx.lineTo(w, y);
    ctx.closePath();
    ctx.fillStyle = '#ffd84a';
    ctx.fill();
    ctx.strokeStyle = '#8a6400';
    ctx.stroke();
  }
}

const sprites = new Map<string, HTMLCanvasElement>();
/** Pawn pictures are drawn once at this height and scaled from there. */
export const SPRITE_H = 180;

/** A pawn's picture (with room around it), drawn once: base centre at (w/2, h - pad). */
export function pawnSprite(def: PawnDef, ratio: number): HTMLCanvasElement {
  const key = `${def.id}@${ratio}`;
  let c = sprites.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  const pad = 10;
  c.width = Math.round((SPRITE_H * 0.8 + pad * 2) * ratio);
  c.height = Math.round((SPRITE_H * 1.1 + pad * 2) * ratio);
  const ctx = c.getContext('2d')!;
  ctx.scale(ratio, ratio);
  ctx.translate(c.width / ratio / 2, c.height / ratio - pad);
  drawPawnAt(ctx, def, SPRITE_H);
  sprites.set(key, c);
  return c;
}
