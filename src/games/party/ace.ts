/*
 * The Ace (the field "Ace up your sleeve", the Ace you keep): a playing card of our own, white with a
 * red A and a heart. The card character 🂡 is no emoji on an iPhone: it showed as a see-through
 * outline on the board and as nothing at all in some lists.
 */

/** The Ace field's picture (FIELDS.ace.emoji): wherever it would show, the card is drawn instead. */
export const ACE = '🂡';

const RED = '#d7261e';
const HEART = '♥︎';

/** Paint the card on a canvas: `h` tall, its middle at `cx`, standing on `bottom`. */
export function paintAce(ctx: CanvasRenderingContext2D, cx: number, bottom: number, h: number) {
  const w = h * 0.72;
  const x = cx - w / 2;
  const y = bottom - h;
  const r = h * 0.1;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = h * 0.08;
  ctx.shadowOffsetY = h * 0.03;
  ctx.fillStyle = '#fffdf7';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1, h * 0.025);
  ctx.strokeStyle = '#cfc8b8';
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(h * 0.42)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('A', cx, y + h * 0.36);
  ctx.font = `${Math.round(h * 0.34)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(HEART, cx, y + h * 0.72);
  ctx.restore();
}
