import { drawGlyph, type GlyphName } from '../../lib/glyphs';

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
