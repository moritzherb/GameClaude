/*
 * The big die, drawn as one solid body on a canvas: a cube with rounded edges and corners, its faces
 * lit from the top left, the pips drilled in. It is convex, so drawing only the parts that face you
 * is all it takes: nothing can show through and nothing has to be sorted (a die of CSS planes left
 * gaps on an iPhone, which stacks such planes by their middles).
 *
 * Coordinates as CSS has them: x to the right, y down, z towards you; turns as CSS's rotateX,
 * rotateY, rotateZ, applied in that order (bits.tsx turns it the way the CSS die was turned).
 */

type V = [number, number, number];

/** Half the die's side, the rounding of its edges (CSS px), and how many steps the rounding takes. */
const H = 56;
const R = 14;
const STEPS = 6;
/** How far you are from it (as CSS's perspective on the stage). */
const VIEW = 900;
/** The pips on a face: a 3 × 3 grid (row by row), each pip's radius. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const PIP_AT = 25;
const PIP_R = 9.5;

/** The six faces: the number on it, and the turn that takes the front (z towards you) to it. */
const FACES: { n: number; turn: (p: V) => V }[] = [
  { n: 1, turn: (p) => p },
  { n: 6, turn: (p) => rotY(p, 180) },
  { n: 3, turn: (p) => rotY(p, 90) },
  { n: 4, turn: (p) => rotY(p, -90) },
  { n: 2, turn: (p) => rotX(p, 90) },
  { n: 5, turn: (p) => rotX(p, -90) },
];

const rad = (d: number) => (d * Math.PI) / 180;
/** CSS rotateX / rotateY / rotateZ, with y down. */
function rotX([x, y, z]: V, d: number): V {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [x, c * y - s * z, s * y + c * z];
}
function rotY([x, y, z]: V, d: number): V {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c * x + s * z, y, -s * x + c * z];
}
function rotZ([x, y, z]: V, d: number): V {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c * x - s * y, s * x + c * y, z];
}
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A point of the front face's grid (z = H) laid onto the rounded body. */
function round(x: number, y: number): V {
  const inner: V = [Math.max(-H + R, Math.min(H - R, x)), Math.max(-H + R, Math.min(H - R, y)), H - R];
  const n = norm(sub([x, y, H], inner));
  return [inner[0] + n[0] * R, inner[1] + n[1] * R, inner[2] + n[2] * R];
}

/** Where the grid lines lie across a face: the flat middle in one, each rounded edge in even steps. */
const GRID = (() => {
  const edge = Array.from({ length: STEPS }, (_, k) => H - R + R * Math.tan((Math.PI / 4) * ((k + 1) / STEPS)));
  return [...edge.map((v) => -v).reverse(), -(H - R), H - R, ...edge];
})();

/** The body as quads (corners in order round them), each with the face it belongs to and whether
 *  it is that face's flat middle (where the pips are). */
const QUADS: { p: V[]; flat: boolean }[] = (() => {
  const out: { p: V[]; flat: boolean }[] = [];
  for (const f of FACES) {
    for (let i = 0; i + 1 < GRID.length; i++)
      for (let j = 0; j + 1 < GRID.length; j++) {
        const [x0, x1, y0, y1] = [GRID[i], GRID[i + 1], GRID[j], GRID[j + 1]];
        const p = [round(x0, y0), round(x1, y0), round(x1, y1), round(x0, y1)].map(f.turn);
        out.push({ p, flat: x0 === -(H - R) && y0 === -(H - R) });
      }
  }
  return out;
})();

/** Each face's pips as circles on its flat middle (points round each). */
const PIP_RINGS: { n: number; rings: V[][] }[] = FACES.map((f) => ({
  n: f.n,
  rings: PIPS[f.n].map((i) => {
    const cx = ((i % 3) - 1) * PIP_AT;
    const cy = (Math.floor(i / 3) - 1) * PIP_AT;
    return Array.from({ length: 20 }, (_, k): V => {
      const a = (k / 20) * Math.PI * 2;
      return f.turn([cx + Math.cos(a) * PIP_R, cy + Math.sin(a) * PIP_R, H + 0.01]);
    });
  }),
}));

/** The turn (CSS rotateX, rotateY) that shows each number at the front. */
export const FACE_TURN: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };

/** Where the light comes from: the top left, in front. */
const LIGHT = norm([-0.45, -0.75, 0.75]);
const IVORY: V = [247, 244, 236];

/** Draw the die turned so (CSS's rotateX(rx) rotateY(ry) rotateZ(rz)), its middle in the middle of
 *  the canvas; `size` is the canvas's size in CSS px. */
export function drawDie(ctx: CanvasRenderingContext2D, size: number, rx: number, ry: number, rz: number) {
  const turn = (p: V) => rotX(rotY(rotZ(p, rz), ry), rx);
  const eye: V = [0, 0, VIEW];
  const at = (p: V): [number, number] => {
    const k = VIEW / (VIEW - p[2]);
    return [size / 2 + p[0] * k, size / 2 + p[1] * k];
  };
  ctx.clearRect(0, 0, size, size);
  ctx.lineJoin = 'round';
  for (const q of QUADS) {
    const p = q.p.map(turn);
    const n = norm(cross(sub(p[1], p[0]), sub(p[3], p[0])));
    // Facing away from you: the side of the die you can't see.
    if (dot(n, sub(eye, p[0])) <= 0) continue;
    const lit = 0.66 + 0.34 * Math.max(0, dot(n, LIGHT)) + 0.08 * Math.max(0, dot(n, LIGHT)) ** 24;
    const c = IVORY.map((v) => Math.round(Math.min(255, v * lit)));
    const fill = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.beginPath();
    for (const [i, v] of p.entries()) {
      const [x, y] = at(v);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    // The same colour round each quad closes the hairline seams a canvas leaves between them.
    ctx.strokeStyle = fill;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // The pips, on the faces you see: dark, a little lit on their lower rim.
  for (const f of PIP_RINGS) {
    for (const ring of f.rings) {
      const p = ring.map(turn);
      const n = norm(cross(sub(p[5], p[0]), sub(p[10], p[0])));
      const mid: V = [0, 1, 2].map((i) => p.reduce((s, v) => s + v[i], 0) / p.length) as V;
      if (dot(n, sub(eye, mid)) <= 0) continue;
      const facing = Math.max(0, Math.min(1, dot(norm(sub(eye, mid)), n) * 1.4));
      ctx.beginPath();
      for (const [i, v] of p.entries()) {
        const [x, y] = at(v);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      const [mx, my] = at(mid);
      const g = ctx.createRadialGradient(mx - 2, my - 2, 0, mx, my, PIP_R * 1.1);
      g.addColorStop(0, '#4a443d');
      g.addColorStop(0.65, '#17150f');
      ctx.globalAlpha = 0.35 + 0.65 * facing;
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
