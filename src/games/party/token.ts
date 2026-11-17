import { drawGlyph, type GlyphName } from '../../lib/glyphs';
import { mix, tone } from '../../lib/themeColor';

/** The board's ink: the colour of everything printed on it. */
const INK = '#1d1b16';
const CARD = '#fbf8f1';

/**
 * A picture standing on the board, as a board game's cardboard standee: a round card on a little
 * foot, the picture printed on it in `ink` (the rim too). `h` tall, standing on `bottom`, its middle at `cx`.
 */
export function paintToken(ctx: CanvasRenderingContext2D, name: GlyphName, cx: number, bottom: number, h: number, ink = INK) {
  const r = h * 0.43;
  const foot = h * 0.14;
  const cy = bottom - foot - r;
  ctx.save();
  // The foot: a little stand, a shade darker than the rim.
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.07, cy + r * 0.8);
  ctx.lineTo(cx + h * 0.07, cy + r * 0.8);
  ctx.lineTo(cx + h * 0.16, bottom);
  ctx.lineTo(cx - h * 0.16, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // The card, lifted a little off the board by its shadow.
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = h * 0.06;
  ctx.shadowOffsetY = h * 0.02;
  ctx.fillStyle = CARD;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = h * 0.04;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.restore();
  const g = r * 1.2;
  drawGlyph(ctx, name, cx - g / 2, cy - g / 2, g, ink, 2.1);
}

/**
 * A field's picture as a little solid thing standing on the board, in the field's colour: its lines
 * thick and round, what they close round filled in a paler shade, pushed back into depth (the sides
 * darker), lit from above with a gloss along the top of each line. `h` tall, standing on `bottom`.
 */
export function paintIcon3d(ctx: CanvasRenderingContext2D, name: GlyphName, cx: number, bottom: number, h: number, color: string) {
  const depth = h * 0.1;
  const g = h - depth;
  const x = cx - g / 2;
  const y = bottom - depth - g;
  const weight = 3.2;
  const side = tone(color, 0.66, 1.1);
  const body = mix(color, '#ffffff', 0.5);
  // The sides: the picture again and again from the back of its depth to the front, the back one
  // edged darker so the whole stands out on the board.
  const steps = Math.max(4, Math.ceil(depth));
  drawGlyph(ctx, name, x, y + depth, g, tone(color, 0.42, 1.1), weight + 1.2, tone(color, 0.42, 1.1));
  for (let i = steps; i >= 1; i--) drawGlyph(ctx, name, x, y + (depth * i) / steps, g, side, weight, side);
  // The front on a sheet of its own, so its light stays on it.
  const sheet = document.createElement('canvas');
  sheet.width = ctx.canvas.width;
  sheet.height = ctx.canvas.height;
  const s = sheet.getContext('2d')!;
  s.setTransform(ctx.getTransform());
  drawGlyph(s, name, x, y, g, color, weight, body);
  s.globalCompositeOperation = 'source-atop';
  const light = s.createLinearGradient(0, y, 0, y + g);
  light.addColorStop(0, 'rgba(255,255,255,0.5)');
  light.addColorStop(0.45, 'rgba(255,255,255,0)');
  light.addColorStop(1, 'rgba(0,0,0,0.16)');
  s.fillStyle = light;
  s.fillRect(x - g, y - g, g * 3, g * 3);
  s.globalAlpha = 0.6;
  drawGlyph(s, name, x - g * 0.008, y - g * 0.02, g, '#ffffff', weight * 0.3);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(sheet, 0, 0);
  ctx.restore();
}
