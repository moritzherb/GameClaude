/*
 * The pack of the Tschick flip and the tin of the Snus flip, drawn like the big die (die3d.ts): each
 * one solid body on a canvas, lit from the top left, its printing laid onto its faces. Both are
 * convex (a box, a short cylinder), so drawing only the faces that face you is all it takes: nothing
 * shows through, nothing has to be sorted.
 *
 * Coordinates as CSS has them: x to the right, y down, z towards you. They are thrown onto the board
 * as the die is, then seen a little from the front (TILT), so you can tell how they lie.
 */

import { storeSafe } from '../../lib/native';

type V = [number, number, number];
type RGB = [number, number, number];

/** A flat face of a body: its corners (round it, facing out), its colour, and the picture printed
 *  on it (laid from `at[0]`, along to `at[1]` and down to `at[2]`). */
interface Face {
  p: V[];
  color: RGB;
  print?: { img: HTMLCanvasElement; at: [V, V, V] };
  /** Shiny metal: a stronger highlight. */
  metal?: boolean;
}

/** How far you are from it (as the stage's perspective), and how much from the front you see it:
 *  about as the board is seen (scene.ts FOLLOW_TILT), so a pack lying flat looks flat. */
const VIEW = 900;
const TILT = 56;

const rad = (d: number) => (d * Math.PI) / 180;
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
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function norm(a: V): V {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

/** Where the light comes from: the top left, in front. */
const LIGHT = norm([-0.45, -0.75, 0.75]);

/** A rectangle round centre `c`, reaching `u` to the side and `v` down (u × v points out). */
function rect(c: V, u: V, v: V, color: RGB, img?: HTMLCanvasElement): Face {
  const tl = sub(sub(c, u), v);
  const tr = sub(add(c, u), v);
  const br = add(add(c, u), v);
  const bl = add(sub(c, u), v);
  return { p: [tl, tr, br, bl], color, print: img ? { img, at: [tl, tr, bl] } : undefined };
}

/** A picture to print, `w` × `h` CSS px, drawn sharp at 3×. */
function picture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement | undefined {
  if (typeof document === 'undefined') return undefined;
  const c = document.createElement('canvas');
  c.width = Math.round(w * 3);
  c.height = Math.round(h * 3);
  const g = c.getContext('2d');
  if (!g) return undefined;
  g.scale(3, 3);
  paint(g);
  return c;
}

const display = () => (typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim()) || 'sans-serif';

/* ---------- The pack ---------- */

/** Half its width, height and thickness (CSS px): about as big as the die. */
const PW = 39;
const PH = 60;
const PD = 16;
const RED: RGB = [215, 38, 30];
const CARD: RGB = [246, 244, 238];

let pack: Face[] | null = null;
function packFaces(): Face[] {
  if (pack) return pack;
  const name = storeSafe ? 'PROST' : 'TSCHICK';
  const front = picture(PW * 2, PH * 2, (g) => {
    const w = PW * 2;
    const h = PH * 2;
    g.fillStyle = 'rgb(246,244,238)';
    g.fillRect(0, 0, w, h);
    // The red top, cut in a point.
    g.fillStyle = 'rgb(215,38,30)';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, 0);
    g.lineTo(w, h * 0.27);
    g.lineTo(w / 2, h * 0.38);
    g.lineTo(0, h * 0.27);
    g.closePath();
    g.fill();
    g.fillStyle = '#1d1b16';
    g.font = `900 ${Math.round(w * 0.2)}px ${display()}`;
    g.textAlign = 'center';
    g.fillText(name, w / 2, h * 0.8, w * 0.86);
  });
  pack = [
    rect([0, 0, PD], [PW, 0, 0], [0, PH, 0], CARD, front),
    rect([0, 0, -PD], [-PW, 0, 0], [0, PH, 0], CARD, front),
    rect([PW, 0, 0], [0, 0, -PD], [0, PH, 0], [230, 226, 216]),
    rect([-PW, 0, 0], [0, 0, PD], [0, PH, 0], [230, 226, 216]),
    rect([0, -PH, 0], [PW, 0, 0], [0, 0, PD], RED),
    rect([0, PH, 0], [PW, 0, 0], [0, 0, -PD], [220, 216, 206]),
  ];
  return pack;
}

/** How a pack lies once it has landed (1 flat, 2 on its side, 3 upright): the turn from how it's
 *  drawn (lying flat, its front up), and how high its middle is above the board. */
const PACK_POSE: Record<1 | 2 | 3, { turn: (p: V) => V; h: number }> = {
  1: { turn: (p) => p, h: PD },
  2: { turn: (p) => rotY(p, 90), h: PW },
  3: { turn: (p) => rotX(p, -90), h: PH },
};

/* ---------- The tin ---------- */

/** Its radius and half its height (CSS px), and how many flat strips make its round side. */
const TR = 54;
const TH = 13;
const SIDES = 48;
const TIN: RGB = [201, 204, 211];

let tin: Face[] | null = null;
function tinFaces(): Face[] {
  if (tin) return tin;
  const name = storeSafe ? 'PROST' : 'SNUS';
  const lid = picture(TR * 2, TR * 2, (g) => {
    const r = TR;
    const fill = g.createRadialGradient(r * 0.7, r * 0.6, 0, r, r, r);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.7, '#e8e8ec');
    fill.addColorStop(1, '#dcdde2');
    g.fillStyle = fill;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#c3c6ce';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(r, r, r - 3.5, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#d7261e';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${Math.round(r * 0.78)}px sans-serif`;
    g.fillText('★', r, r * 0.82);
    g.fillStyle = '#1d1b16';
    g.font = `900 ${Math.round(r * 0.3)}px ${display()}`;
    g.fillText(name, r, r * 1.42, r * 1.3);
  });
  const bottom = picture(TR * 2, TR * 2, (g) => {
    const r = TR;
    const fill = g.createRadialGradient(r * 0.8, r * 0.7, 0, r, r, r);
    fill.addColorStop(0, '#d9dbe0');
    fill.addColorStop(1, '#a9adb6');
    g.fillStyle = fill;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#8f949e';
    for (const [k, w] of [
      [0.94, 6],
      [0.56, 3],
      [0.42, 3],
    ] as const) {
      g.lineWidth = w;
      g.beginPath();
      g.arc(r, r, r * k, 0, Math.PI * 2);
      g.stroke();
    }
  });
  // The lid and the bottom: round (going round one way for the lid, the other for the bottom, so
  // each faces out), and the side as strips.
  const ring = (z: number, dir: 1 | -1) =>
    Array.from({ length: SIDES }, (_, k): V => {
      const a = ((dir * k) / SIDES) * Math.PI * 2;
      return [Math.cos(a) * TR, Math.sin(a) * TR, z];
    });
  const faces: Face[] = [
    { p: ring(TH, 1), color: [236, 236, 240], print: lid && { img: lid, at: [[-TR, -TR, TH], [TR, -TR, TH], [-TR, TR, TH]] } },
    { p: ring(-TH, -1), color: [190, 193, 200], print: bottom && { img: bottom, at: [[-TR, TR, -TH], [TR, TR, -TH], [-TR, -TR, -TH]] } },
  ];
  const edge = (a: number, z: number): V => [Math.cos(a) * TR, Math.sin(a) * TR, z];
  for (let k = 0; k < SIDES; k++) {
    const a = (k / SIDES) * Math.PI * 2;
    const b = ((k + 1) / SIDES) * Math.PI * 2;
    faces.push({ p: [edge(a, TH), edge(a, -TH), edge(b, -TH), edge(b, TH)], color: TIN, metal: true });
  }
  tin = faces;
  return faces;
}

/** Lid up (true) or bottom up: the turn, and how high its middle is above the board. */
const tinPose = (lid: boolean) => ({ turn: (p: V) => (lid ? p : rotX(p, 180)), h: TH });

/* ---------- Drawing ---------- */

/** What was thrown and how it lands. */
export interface Thrown {
  kind: 'pack' | 'tin';
  /** The pack: 1 flat, 2 on its side, 3 upright. The tin: 1 lid up, 0 bottom up. */
  result: number;
}

/** Draw it with this much turn still to come (CSS's rotateX, rotateY, rotateZ, in degrees), its
 *  middle in the middle of the canvas, which is `size` CSS px across at `scale` device px each. */
export function drawThrown(ctx: CanvasRenderingContext2D, size: number, scale: number, what: Thrown, rx: number, ry: number, rz: number) {
  const faces = what.kind === 'pack' ? packFaces() : tinFaces();
  const pose = what.kind === 'pack' ? PACK_POSE[Math.min(3, Math.max(1, what.result)) as 1 | 2 | 3] : tinPose(what.result === 1);
  // As it lies (its middle above the board), with the turn still to come, seen a little from the front.
  const place = (p: V): V => rotX(add(rotX(rotY(rotZ(pose.turn(p), rz), ry), rx), [0, 0, pose.h]), TILT);
  const eye: V = [0, 0, VIEW];
  const at = (p: V): [number, number] => {
    const k = VIEW / (VIEW - p[2]);
    return [size / 2 + p[0] * k, size / 2 + p[1] * k];
  };
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.lineJoin = 'round';
  for (const f of faces) {
    const p = f.p.map(place);
    const n = norm(cross(sub(p[1], p[0]), sub(p[2], p[0])));
    // Facing away from you: you can't see that side.
    if (dot(n, sub(eye, p[0])) <= 0) continue;
    const d = Math.max(0, dot(n, LIGHT));
    const lit = 0.64 + 0.36 * d + (f.metal ? 0.35 * d ** 12 : 0.06 * d ** 20);
    const c = f.color.map((v) => Math.round(Math.min(255, v * lit)));
    const fill = `rgb(${c[0]},${c[1]},${c[2]})`;
    const path = () => {
      ctx.beginPath();
      for (const [i, v] of p.entries()) {
        const [x, y] = at(v);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    path();
    ctx.fillStyle = fill;
    ctx.fill();
    // Its own colour round it: no hairline between two faces.
    ctx.strokeStyle = fill;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (!f.print) continue;
    // The printing, laid onto the face (flat enough at this distance to lay it straight), the face's
    // own colour already under it, and then the same light over it.
    const [a, b, e] = f.print.at.map((v) => at(place(v)));
    const { img } = f.print;
    ctx.save();
    path();
    ctx.clip();
    ctx.setTransform((scale * (b[0] - a[0])) / img.width, (scale * (b[1] - a[1])) / img.width, (scale * (e[0] - a[0])) / img.height, (scale * (e[1] - a[1])) / img.height, scale * a[0], scale * a[1]);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    if (lit < 1) {
      path();
      ctx.fillStyle = `rgba(0,0,0,${((1 - lit) * 0.9).toFixed(3)})`;
      ctx.fill();
    }
  }
}

/** The turn a throw starts with, different every throw, all of it gone by the time it lands. */
export function spinFor(what: Thrown, flip: number): [number, number, number] {
  if (what.kind === 'tin') return [360 * (3 + (flip % 2)), 0, flip % 2 ? 30 : -30];
  return [360 * (2 + (flip % 2)), 360 * ((flip + 1) % 2), flip % 2 ? 40 : -40];
}
