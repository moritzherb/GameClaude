import { jumps, layout, THEMES, type Board, type Spot, type Theme } from './boards';
import { FIELDS } from './fields';
import { EMOJI_FONT, pawnSprite, shade, SPRITE_H, type PawnDef } from './pawns';

/** A pawn as the scene shows it. */
export interface PawnView {
  id: string;
  pawn: PawnDef;
  pos: number;
  name: string;
  /** Waiting at a bridge: it stands at the near end. */
  gate?: boolean;
}

/** A field's size in field widths (the rest is the gap between fields). */
const TILE = 0.9;
/** How thick a field is: it stands a little above the board, like a tile. */
const SLAB = 0.07;
/** Field pictures are drawn once at this size (CSS px) and then laid onto the board. */
const TEX = 200;
/** Below each field's picture, its front side (the field's thickness, as seen from the camera). */
const EDGE = 18;
/** A pawn's height, and the height of the picture standing on each field, in field widths. */
const PAWN_H = 0.62;
const ICON_H = 0.5;
/** Where on its field the standing picture is: at the back on the left. */
const ICON_AT = { x: -0.2, y: 0.14 };
/** Where pawns stand on a field: the right half and the back, so the picture and the name stay in view. */
const SLOTS = [
  { x: 0.2, y: 0.06 },
  { x: 0.1, y: 0.3 },
  { x: 0.36, y: 0.26 },
  { x: 0.36, y: -0.08 },
  { x: -0.12, y: 0.34 },
  { x: -0.34, y: 0.32 },
];
/** How far the camera stands from the point it looks at, following a pawn; its angle from straight down. */
const FOLLOW_DIST = 7.5;
/** How close it zooms in on the pawn: the fields round it big enough to read at a glance. */
const ZOOM = 1.45;
const FOLLOW_TILT = 1.0;
const MIN_DIST = 4.6;
/** The camera looks this far ahead of the pawn, so you see where it's going. */
const AHEAD = 1.3;
/** Seconds per field a pawn hops. */
const STEP = 0.3;

const DISPLAY = '"Big Shoulders Display Variable", Impact, sans-serif';
const BODY = '"Archivo Variable", system-ui, sans-serif';
const INK = '#1d1b16';

interface Cam {
  x: number;
  y: number;
  dist: number;
  tilt: number;
}

interface Point {
  x: number;
  y: number;
}

/** Where something is on the screen: position, depth, and pixels per field width there. */
interface Proj {
  sx: number;
  sy: number;
  z: number;
  s: number;
  dx: number;
}

/** A pawn on its way: where it is right now (not on a field). */
interface Moving extends Point {
  lift: number;
  alpha: number;
}

interface Anim {
  id: string;
  /** Where the pawn is at t (0 to 1). */
  at: (t: number) => Moving;
  duration: number;
  start: number;
  /** For hops: the number of fields, and who hears each landing. */
  steps?: number;
  onStep?: (i: number) => void;
  /** For hops: how far along the fields it is at t (0 to steps). */
  progress?: (t: number) => number;
  stepped: number;
  done: () => void;
}

const easeInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** A rounded rectangle as a path. */
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Text in lines that fit `width`, as big as it can be between `max` and `min` px. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number, max: number, min: number, font: (px: number) => string) {
  const words = text.split(/\s+/);
  for (let px = max; px >= min; px -= 2) {
    ctx.font = font(px);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width <= width || !line) line = next;
      else {
        lines.push(line);
        line = w;
      }
    }
    lines.push(line);
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= width)) return { lines, px };
  }
  ctx.font = font(min);
  return { lines: [text], px: min };
}

/**
 * The board, seen at an angle from above, with the pawns standing on it. All of it is drawn on one
 * canvas (no layers for the phone to juggle), and only while something moves. A finger moves the
 * camera round the board, two fingers zoom; `follow` brings it back to a pawn.
 */
export class Scene {
  /** The camera left the pawn (a finger moved it, or the whole board is shown), or came back to it. */
  onAway?: (away: boolean) => void;

  private ctx: CanvasRenderingContext2D;
  private ratio = 1;
  private w = 0;
  private h = 0;
  private insetTop = 0;
  private insetBottom = 0;
  private spots: Spot[] = [];
  private board: Board | null = null;
  private theme: Theme = THEMES.west;
  private labels: string[] = [];
  private textures: HTMLCanvasElement[] = [];
  private decor: { x: number; y: number; emoji: string; size: number }[] = [];
  /** Water: rivers right across the board, and patches under a bridge. */
  private rivers: number[] = [];
  private water: { x0: number; y0: number; x1: number; y1: number }[] = [];
  private links: { from: number; to: number; tunnel: boolean }[] = [];
  private pawns: PawnView[] = [];
  private current: string | null = null;
  /** Where each pawn is drawn right now: it glides to its place on a field. */
  private shown = new Map<string, Point>();
  private moving = new Map<string, Moving>();
  private anims: Anim[] = [];
  private cam: Cam = { x: 0, y: 0, dist: FOLLOW_DIST, tilt: FOLLOW_TILT };
  private goal: Cam = { ...this.cam };
  private following: string | null = null;
  private overview = false;
  private away = false;
  private raf = 0;
  private last = 0;
  private table = '#10110e';
  private emojis = new Map<string, HTMLCanvasElement>();
  private shadowPic: HTMLCanvasElement | null = null;
  private fingers = new Map<number, Point>();
  private gesture: { x: number; y: number; d: number; n: number; moved: number } | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.up);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    this.resize();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.down);
    this.canvas.removeEventListener('pointermove', this.move);
    this.canvas.removeEventListener('pointerup', this.up);
    this.canvas.removeEventListener('pointercancel', this.up);
    this.canvas.removeEventListener('wheel', this.wheel);
    this.anims.forEach((a) => a.done());
    this.anims = [];
  }

  /** The canvas changed size (or the phone's pixel ratio). */
  resize() {
    // Twice the pixels at most: sharp enough, and half the drawing of three times on the newest phones.
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (ratio !== this.ratio && this.board) {
      this.ratio = ratio;
      this.buildTextures();
    }
    this.ratio = ratio;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * ratio);
    this.canvas.height = Math.round(h * ratio);
    this.table = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#10110e';
    if (this.overview) this.goal = this.fitAll();
    this.invalidate();
  }

  /** Room taken by things over the canvas at its top and bottom: what matters stays in view between. */
  setInsets(top: number, bottom: number) {
    if (top === this.insetTop && bottom === this.insetBottom) return;
    this.insetTop = top;
    this.insetBottom = bottom;
    if (this.overview) this.goal = this.fitAll();
    this.invalidate();
  }

  /** `labels`: each field's name as it reads on the board (translated). */
  setBoard(board: Board, labels: string[]) {
    this.board = board;
    this.theme = THEMES[board.theme];
    this.spots = layout(board.fields.length, board.cols);
    this.labels = labels;
    const fields = board.fields;
    // A bridge between two rows crosses a river right across the board; one within a row, a stream.
    this.rivers = this.spots.filter((s, i) => s.link && fields[i].kind === 'bridge').map((s) => s.y);
    this.water = [];
    this.spots.forEach((s, i) => {
      if (fields[i].kind === 'bridge' && !s.link) this.water.push({ x0: s.x - 0.42, x1: s.x + 0.42, y0: s.y - 1.05, y1: s.y + 1.05 });
    });
    this.links = Object.entries(jumps(fields, board.cols)).map(([from, to]) => ({ from: +from, to, tunnel: fields[+from].kind === 'mole' }));
    // Under a bridge back: the water between the two fields.
    for (const l of this.links) {
      if (l.tunnel) continue;
      const s = this.spots[l.from];
      this.water.push({ x0: s.x - 0.56, x1: s.x + 0.56, y0: s.y - 1.6, y1: s.y - 0.4 });
    }
    this.placeDecor();
    this.buildTextures();
    this.invalidate();
  }

  setPawns(pawns: PawnView[], current: string | null) {
    this.pawns = pawns;
    this.current = current;
    for (const p of pawns) if (!this.shown.has(p.id)) this.shown.set(p.id, this.home(p));
    if (this.following && !this.away) this.aim(this.following);
    this.invalidate();
  }

  /** The camera goes to this pawn (and stays with it as it moves). */
  follow(id: string, instant = false) {
    this.following = id;
    this.overview = false;
    this.setAway(false);
    this.aim(id);
    if (instant) this.cam = { ...this.goal };
    this.invalidate();
  }

  /** The whole board, from further up. */
  showAll() {
    this.overview = true;
    this.setAway(true);
    this.goal = this.fitAll();
    this.invalidate();
  }

  /** Hop along these fields one by one. `onStep` hears each landing. */
  hop(id: string, path: number[], onStep?: (i: number) => void): Promise<void> {
    const pawn = this.pawns.find((p) => p.id === id);
    if (!pawn || !path.length) return Promise.resolve();
    const n = path.length;
    // Through the middle of each field on the way, onto its own place on the last one.
    const points = [this.shown.get(id) ?? this.home(pawn), ...path.map((pos, k) => (k === n - 1 ? this.place(id, pos) : this.spot(pos)))];
    // Steady across the fields (only the start and the end ease in and out), a hop on each.
    const progress = (t: number) => easeInOut(t) * n;
    return new Promise((done) => {
      this.anims.push({
        id,
        duration: STEP * n + 0.1,
        start: performance.now(),
        steps: n,
        stepped: 0,
        onStep,
        progress,
        done,
        at: (t) => {
          const u = Math.min(n - 1e-6, progress(t));
          const i = Math.floor(u);
          const f = u - i;
          const a = points[i];
          const b = points[i + 1];
          return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), lift: Math.sin(Math.PI * f) * 0.3, alpha: 1 };
        },
      });
      this.invalidate();
    });
  }

  /** Over a bridge, or through a tunnel, to another field. */
  travel(id: string, to: number, tunnel: boolean): Promise<void> {
    const a = this.shown.get(id) ?? this.spot(to);
    const b = this.place(id, to);
    return new Promise((done) => {
      this.anims.push({
        id,
        duration: tunnel ? 1.6 : 1.3,
        start: performance.now(),
        stepped: 0,
        done,
        at: (t) => {
          const k = easeInOut(t);
          // Down into the hole and up out of the other; over a bridge, with little steps.
          const alpha = tunnel ? Math.max(0, Math.min(1, Math.abs(t - 0.5) * 6 - 1.2)) : 1;
          return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), lift: tunnel ? 0 : Math.abs(Math.sin(t * Math.PI * 5)) * 0.1, alpha };
        },
      });
      this.invalidate();
    });
  }

  /* ---------- Where things are ---------- */

  private spot(pos: number): Point {
    const s = this.spots[Math.max(0, Math.min(pos, this.spots.length - 1))] ?? { x: 0, y: 0 };
    return { x: s.x, y: s.y };
  }

  /** The place on field `pos` for pawn `id` (with whoever else stands there). */
  private place(id: string, pos: number, gate = false): Point {
    const here = this.pawns.filter((q) => q.id === id || (q.pos === pos && !this.moving.has(q.id)));
    const k = Math.max(0, here.findIndex((q) => q.id === id));
    const base = this.spot(pos);
    const kind = this.board?.fields[pos]?.kind;
    let off: Point;
    if (kind === 'start' || kind === 'goal') {
      // No picture on the start and the finish: everyone round the middle.
      const n = here.length;
      const a = (k / Math.max(1, n)) * Math.PI * 2 + Math.PI / 2;
      off = n === 1 ? { x: 0, y: 0.05 } : { x: Math.cos(a) * 0.24, y: Math.sin(a) * 0.2 + 0.05 };
    } else {
      const s = SLOTS[k % SLOTS.length];
      off = { x: s.x + Math.floor(k / SLOTS.length) * 0.06, y: s.y };
    }
    if (gate) off = { x: off.x, y: off.y - 0.3 };
    return { x: base.x + off.x, y: base.y + off.y };
  }

  private home(p: PawnView): Point {
    return this.place(p.id, p.pos, p.gate);
  }

  private where(id: string): Point {
    const m = this.moving.get(id);
    if (m) return m;
    const shown = this.shown.get(id);
    if (shown) return shown;
    const p = this.pawns.find((q) => q.id === id);
    return p ? this.home(p) : { x: 0, y: 0 };
  }

  private aim(id: string) {
    const p = this.moving.get(id) ?? (() => {
      const v = this.pawns.find((q) => q.id === id);
      return v ? this.home(v) : this.where(id);
    })();
    // Across, the camera goes most of the way to the pawn: its field in the middle, the board's edge near.
    const mid = ((this.board?.cols ?? 5) - 1) / 2;
    this.goal = { x: mid + (p.x - mid) * 0.8, y: p.y + AHEAD, dist: FOLLOW_DIST, tilt: FOLLOW_TILT };
  }

  private setAway(on: boolean) {
    if (on === this.away) return;
    this.away = on;
    this.onAway?.(on);
  }

  private placeDecor() {
    const taken = new Set(this.spots.map((s) => `${s.x},${s.y}`));
    const wet = (x: number, y: number) => this.rivers.includes(y) || this.water.some((w) => x > w.x0 - 0.2 && x < w.x1 + 0.2 && y > w.y0 - 0.2 && y < w.y1 + 0.2);
    const top = this.spots[this.spots.length - 1]?.y ?? 0;
    const cols = this.board?.cols ?? 5;
    this.decor = [];
    let seed = this.board!.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 10000) / 10000;
    for (let y = 1; y <= top; y += 2) {
      for (let x = 0; x < cols; x++) {
        if (taken.has(`${x},${y}`) || rnd() < 0.35) continue;
        const d = { x: x + (rnd() - 0.5) * 0.4, y: y + (rnd() - 0.5) * 0.3, emoji: this.theme.decor[Math.floor(rnd() * this.theme.decor.length)], size: 0.3 + rnd() * 0.12 };
        if (!wet(d.x, d.y)) this.decor.push(d);
      }
    }
  }

  /* ---------- Fingers ---------- */

  private down = (e: PointerEvent) => {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.gesture = null;
  };

  private move = (e: PointerEvent) => {
    if (!this.fingers.has(e.pointerId)) return;
    this.fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...this.fingers.values()];
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const d = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    const g = this.gesture;
    if (g && g.n === pts.length) {
      const moved = g.moved + Math.abs(x - g.x) + Math.abs(y - g.y) + Math.abs(d - g.d);
      // A tap that wobbles a little isn't a move.
      if (moved > 8) {
        this.pan(x - g.x, y - g.y);
        if (d && g.d) this.zoom(g.d / d);
      }
      this.gesture = { x, y, d, n: pts.length, moved };
    } else this.gesture = { x, y, d, n: pts.length, moved: 0 };
  };

  private up = (e: PointerEvent) => {
    this.fingers.delete(e.pointerId);
    this.gesture = null;
  };

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoom(Math.exp(e.deltaY * 0.0015));
  };

  /** The camera, moved by hand: off the pawn until it's sent back. */
  private takeOver() {
    this.overview = false;
    this.setAway(true);
    this.goal = this.cam;
  }

  private pan(dx: number, dy: number) {
    if (!this.board) return;
    this.takeOver();
    const F = this.focal();
    const c = this.cam;
    const top = this.spots[this.spots.length - 1]?.y ?? 0;
    c.x = Math.max(-1, Math.min(this.board.cols, c.x - (dx * c.dist) / F));
    c.y = Math.max(-1, Math.min(top + 1, c.y + (dy * c.dist) / (F * Math.cos(c.tilt))));
    this.invalidate();
  }

  private zoom(f: number) {
    if (!this.board) return;
    this.takeOver();
    const top = this.spots[this.spots.length - 1]?.y ?? 0;
    this.cam.dist = Math.max(MIN_DIST, Math.min(Math.max(20, top * 2.2), this.cam.dist * f));
    this.invalidate();
  }

  /* ---------- The camera ---------- */

  private focal() {
    return ((FOLLOW_DIST * this.w) / ((this.board?.cols ?? 5) + 0.6)) * ZOOM;
  }

  /** How a camera shows the board: world point (and height above the board) to the screen. */
  private view(cam: Cam) {
    const sin = Math.sin(cam.tilt);
    const cos = Math.cos(cam.tilt);
    const F = this.focal();
    const cx = this.w / 2;
    const cy = this.insetTop + (this.h - this.insetTop - this.insetBottom) * 0.54;
    const project = (x: number, y: number, up = 0): Proj | null => {
      const dx = x - cam.x;
      const dy = y - cam.y;
      const z = cam.dist + dy * sin - up * cos;
      if (z < 0.35) return null;
      return { sx: cx + (F * dx) / z, sy: cy - (F * (dy * cos + up * sin)) / z, z, s: F / z, dx };
    };
    return { sin, cos, F, cx, cy, project };
  }

  /** The camera that shows the whole board in the room between what lies over the canvas. */
  private fitAll(): Cam {
    if (!this.board || !this.w) return this.cam;
    const tilt = 0.55;
    const top = this.spots[this.spots.length - 1]?.y ?? 0;
    const x = (this.board.cols - 1) / 2;
    const corners: Point[] = [
      { x: -0.95, y: -1.1 },
      { x: this.board.cols - 0.05, y: -1.1 },
      { x: this.board.cols - 0.05, y: top + 1 },
      { x: -0.95, y: top + 1 },
    ];
    const roomTop = this.insetTop + 8;
    const roomBottom = this.h - this.insetBottom - 8;
    const bounds = (cam: Cam) => {
      const v = this.view(cam);
      const ps = corners.map((c) => v.project(c.x, c.y));
      if (ps.some((p) => !p)) return null;
      const ys = ps.map((p) => p!.sy);
      const xs = ps.map((p) => p!.sx);
      return { top: Math.min(...ys), bottom: Math.max(...ys), left: Math.min(...xs), right: Math.max(...xs) };
    };
    /** Where to look so the board sits in the middle of the room, from this far up. */
    const centred = (dist: number): Cam => {
      let lo = -6;
      let hi = top + 6;
      for (let i = 0; i < 30; i++) {
        const y = (lo + hi) / 2;
        const b = bounds({ x, y, dist, tilt });
        // Looking further up the board moves it down the screen.
        if (!b || (b.top + b.bottom) / 2 < (roomTop + roomBottom) / 2) lo = y;
        else hi = y;
      }
      return { x, y: (lo + hi) / 2, dist, tilt };
    };
    let lo = MIN_DIST;
    let hi = 200;
    for (let i = 0; i < 30; i++) {
      const dist = (lo + hi) / 2;
      const b = bounds(centred(dist));
      if (b && b.bottom - b.top <= roomBottom - roomTop && b.right - b.left <= this.w - 16) hi = dist;
      else lo = dist;
    }
    return centred(hi);
  }

  /* ---------- Pictures drawn once ---------- */

  private buildTextures() {
    if (!this.board) return;
    const r = Math.min(this.ratio, 2);
    this.textures = this.board.fields.map((_, i) => {
      const c = document.createElement('canvas');
      c.width = Math.round(TEX * r);
      c.height = Math.round((TEX + EDGE) * r);
      const ctx = c.getContext('2d')!;
      ctx.scale(r, r);
      this.drawField(ctx, i);
      return c;
    });
  }

  private drawField(ctx: CanvasRenderingContext2D, i: number) {
    const f = this.board!.fields[i];
    const info = FIELDS[f.kind];
    const label = this.labels[i] ?? '';
    const m = 6;
    const size = TEX - m * 2;
    // The front side first, peeking out below the top.
    rounded(ctx, m, m + EDGE, size, size, 26);
    ctx.fillStyle = shade(info.color, -0.5);
    ctx.fill();
    ctx.save();
    rounded(ctx, m, m, size, size, 26);
    ctx.fillStyle = info.color;
    ctx.fill();
    ctx.clip();
    if (f.kind === 'goal') {
      // Chequered flag.
      const sq = size / 8;
      ctx.fillStyle = '#fff';
      ctx.fillRect(m, m, size, size);
      ctx.fillStyle = INK;
      for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) if ((a + b) % 2) ctx.fillRect(m + a * sq, m + b * sq, sq, sq);
      ctx.fillStyle = info.color;
      rounded(ctx, m + 26, m + 30, size - 52, size - 60, 22);
      ctx.fill();
    } else if (f.kind === 'bridge') {
      // Planks across the way over, rails along it.
      const across = this.spots[i]?.link;
      ctx.strokeStyle = shade(info.color, -0.35);
      ctx.lineWidth = 3;
      for (let k = m + 16; k < TEX; k += 22) {
        ctx.beginPath();
        if (across) {
          ctx.moveTo(m, k);
          ctx.lineTo(TEX - m, k);
        } else {
          ctx.moveTo(k, m);
          ctx.lineTo(k, TEX - m);
        }
        ctx.stroke();
      }
      ctx.fillStyle = shade(info.color, -0.45);
      if (across) {
        ctx.fillRect(m, m, 14, size);
        ctx.fillRect(TEX - m - 14, m, 14, size);
      } else {
        ctx.fillRect(m, m, size, 14);
        ctx.fillRect(m, TEX - m - 14, size, 14);
      }
    } else {
      // A little shine from the top left.
      const g = ctx.createLinearGradient(0, 0, TEX, TEX);
      g.addColorStop(0, 'rgba(255,255,255,0.35)');
      g.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TEX, TEX);
    }
    if (f.kind === 'mole') {
      // The mole's hole, dug into the field.
      ctx.fillStyle = '#3b2616';
      ctx.beginPath();
      ctx.ellipse(TEX / 2, TEX * 0.36, 48, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c120a';
      ctx.beginPath();
      ctx.ellipse(TEX / 2, TEX * 0.38, 34, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    rounded(ctx, m, m, size, size, 26);
    ctx.lineWidth = 7;
    ctx.strokeStyle = INK;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    if (f.kind === 'start' || f.kind === 'goal') {
      ctx.font = `64px ${EMOJI_FONT}`;
      ctx.fillText(info.emoji, TEX / 2, TEX / 2 - 18);
      const { lines } = fit(ctx, label.toUpperCase(), size - 30, 44, 24, (p) => `900 ${p}px ${DISPLAY}`);
      ctx.fillText(lines[0], TEX / 2, TEX / 2 + 50);
      return;
    }
    // The number in the corner; the name big across the front (the picture stands at the back).
    ctx.font = `700 22px ${BODY}`;
    ctx.fillStyle = 'rgba(29,27,22,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText(String(i), TEX - m - 14, m + 22);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    const { lines, px } = fit(ctx, label.toUpperCase(), size - 22, 44, 24, (p) => `900 ${p}px ${DISPLAY}`);
    const lh = px * 0.92;
    const y0 = TEX * 0.74 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, k) => ctx.fillText(l, TEX / 2, y0 + k * lh));
  }

  private emojiSprite(emoji: string): HTMLCanvasElement {
    let c = this.emojis.get(emoji);
    if (c) return c;
    c = document.createElement('canvas');
    const px = 96;
    const r = Math.min(this.ratio, 2);
    c.width = c.height = Math.round(px * 1.25 * r);
    const ctx = c.getContext('2d')!;
    ctx.scale(r, r);
    ctx.font = `${px}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(emoji, (px * 1.25) / 2, px * 1.25 - px * 0.2);
    this.emojis.set(emoji, c);
    return c;
  }

  /* ---------- Drawing ---------- */

  invalidate() {
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.max(0.001, Math.min(0.05, (now - this.last) / 1000));
    this.last = now;
    let busy = false;
    // Moving pawns.
    this.moving.clear();
    for (const a of [...this.anims]) {
      // (A frame's time can lie a moment before the animation was started.)
      const t = Math.max(0, Math.min(1, (now - a.start) / 1000 / a.duration));
      const at = a.at(t);
      this.moving.set(a.id, at);
      this.shown.set(a.id, at);
      if (a.steps && a.onStep && a.progress) {
        const reached = Math.floor(a.progress(t) + 1e-6);
        while (a.stepped < Math.min(a.steps, reached)) a.onStep(a.stepped++);
      }
      if (t >= 1) {
        this.anims = this.anims.filter((x) => x !== a);
        this.moving.delete(a.id);
        a.done();
      }
    }
    // Pawns standing still glide to their places (when another one arrives or leaves their field).
    const glide = 1 - Math.exp(-dt / 0.09);
    for (const p of this.pawns) {
      if (this.moving.has(p.id)) continue;
      const to = this.home(p);
      const at = this.shown.get(p.id) ?? to;
      const x = lerp(at.x, to.x, glide);
      const y = lerp(at.y, to.y, glide);
      if (Math.abs(to.x - x) + Math.abs(to.y - y) > 0.002) busy = true;
      this.shown.set(p.id, busy ? { x, y } : to);
    }
    // The camera eases after its goal (and after the pawn it follows).
    if (this.following && !this.away && this.moving.has(this.following)) this.aim(this.following);
    const k = 1 - Math.exp(-dt / (this.overview ? 0.28 : 0.18));
    const c = this.cam;
    const g = this.goal;
    if (c !== g) {
      c.x = lerp(c.x, g.x, k);
      c.y = lerp(c.y, g.y, k);
      c.dist = lerp(c.dist, g.dist, k);
      c.tilt = lerp(c.tilt, g.tilt, k);
      if (Math.abs(g.x - c.x) + Math.abs(g.y - c.y) + Math.abs(g.dist - c.dist) + Math.abs(g.tilt - c.tilt) < 0.002) this.cam = { ...g };
      else busy = true;
    }
    this.draw();
    if (busy || this.anims.length) this.invalidate();
  };

  private draw() {
    const { ctx, w, h, ratio, board } = this;
    if (!board || !w) return;
    const cam = this.cam;
    const { sin, cos, F, cy, project } = this.view(cam);
    /** Lay the next drawing flat at (x, y), `up` above the board: 1 unit = `unit` field widths. */
    const flat = (x: number, y: number, unit: number, up = 0) => {
      const p = project(x, y, up);
      if (!p) return null;
      const a = p.s * unit;
      const vx = ((F * p.dx * sin) / (p.z * p.z)) * unit;
      const vy = ((F * (cam.dist * cos - up)) / (p.z * p.z)) * unit;
      ctx.setTransform(a * ratio, 0, vx * ratio, vy * ratio, p.sx * ratio, p.sy * ratio);
      return p;
    };
    const squash = (p: Proj) => (cos * cam.dist) / p.z;
    const nearY = cam.y + (0.5 - cam.dist) / sin;
    const poly = (pts: Point[], up = 0) => {
      const ps = pts.map((q) => project(q.x, Math.max(nearY, q.y), up));
      if (ps.some((p) => !p)) return false;
      ctx.beginPath();
      ps.forEach((p, i) => (i ? ctx.lineTo(p!.sx, p!.sy) : ctx.moveTo(p!.sx, p!.sy)));
      ctx.closePath();
      return true;
    };

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = this.table;
    ctx.fillRect(0, 0, w, h);

    // The board itself.
    const top = this.spots[this.spots.length - 1]?.y ?? 0;
    const x0 = -0.95;
    const x1 = board.cols - 0.05;
    if (poly([{ x: x0, y: -1.6 }, { x: x1, y: -1.6 }, { x: x1, y: top + 1 }, { x: x0, y: top + 1 }])) {
      const near = project(0, Math.max(-1.6, nearY));
      const far = project(0, top + 1);
      const grad = ctx.createLinearGradient(0, near?.sy ?? h, 0, far?.sy ?? 0);
      grad.addColorStop(0, this.theme.near);
      grad.addColorStop(1, this.theme.far);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = shade(this.theme.far, -0.45);
      ctx.stroke();
    }

    // Water: rivers right across, streams under a bridge field, the water under a bridge back.
    const waves = (x0w: number, x1w: number, y0w: number, y1w: number) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      const rows = Math.max(1, Math.round((y1w - y0w) / 0.3));
      for (let k = 1; k <= rows; k++) {
        const yy = y0w + ((y1w - y0w) * k) / (rows + 1);
        let started = false;
        ctx.beginPath();
        for (let x = x0w + 0.08; x <= x1w - 0.05; x += 0.12) {
          const p = project(x, Math.max(nearY, yy + Math.sin(x * 5 + k * 2) * 0.04));
          if (!p) continue;
          if (started) ctx.lineTo(p.sx, p.sy);
          else ctx.moveTo(p.sx, p.sy);
          started = true;
        }
        ctx.stroke();
      }
    };
    for (const ry of this.rivers) {
      if (ry + 0.5 < nearY) continue;
      if (!poly([{ x: x0, y: ry - 0.48 }, { x: x1, y: ry - 0.48 }, { x: x1, y: ry + 0.48 }, { x: x0, y: ry + 0.48 }])) continue;
      ctx.fillStyle = this.theme.river;
      ctx.fill();
      waves(x0, x1, ry - 0.4, ry + 0.4);
    }
    for (const wt of this.water) {
      if (wt.y1 < nearY) continue;
      if (!poly([{ x: wt.x0, y: wt.y0 }, { x: wt.x1, y: wt.y0 }, { x: wt.x1, y: wt.y1 }, { x: wt.x0, y: wt.y1 }])) continue;
      ctx.fillStyle = this.theme.river;
      ctx.fill();
      ctx.strokeStyle = shade(this.theme.river, -0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      waves(wt.x0, wt.x1, wt.y0, wt.y1);
    }

    // The mole's tunnels run under the board: only the bits between fields show.
    for (const l of this.links) if (l.tunnel) this.drawTunnel(l, project);

    // Fields, the far ones first: a little block each, the picture on top.
    const order = this.spots.map((_, i) => i).sort((a, b) => this.spots[b].y - this.spots[a].y);
    const unit = TILE / TEX;
    for (const i of order) {
      const s = this.spots[i];
      if (s.y + 0.5 < nearY) continue;
      const face = flat(s.x, s.y, unit, SLAB);
      if (!face || face.sy < -face.s || face.sy > h + face.s) continue;
      ctx.drawImage(this.textures[i], -TEX / 2, -TEX / 2, TEX, TEX + EDGE);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Bridges back, over the water between two fields.
    for (const l of this.links) if (!l.tunnel) this.drawBridge(l, project);

    // The field whoever is on stands on: a ring round it.
    const on = this.current ? this.pawns.find((p) => p.id === this.current) : null;
    if (on && !this.moving.has(on.id)) {
      const s = this.spots[on.pos];
      if (s && flat(s.x, s.y, unit, SLAB)) {
        rounded(ctx, -TEX / 2 + 2, -TEX / 2 + 2, TEX - 4, TEX - 4, 26);
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#c5f235';
        ctx.stroke();
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    // Standing things, the far ones first: what's around, each field's picture, the pawns.
    type Item = { z: number; draw: () => void };
    const items: Item[] = [];
    const standing = (x: number, y: number, up: number, emoji: string, size: number, shadow: number) => {
      const p = project(x, y, up);
      if (!p || p.sy < -60 || p.sy > h + 120) return;
      items.push({
        z: p.z,
        draw: () => {
          const px = size * p.s;
          this.shadow(p.sx, p.sy, px * 0.34, squash(p), shadow);
          ctx.drawImage(this.emojiSprite(emoji), p.sx - px * 0.625, p.sy - px * 1.05, px * 1.25, px * 1.25);
        },
      });
    };
    for (const d of this.decor) standing(d.x, d.y, 0, d.emoji, d.size, 0.18);
    this.spots.forEach((s, i) => {
      const kind = board.fields[i].kind;
      if (kind === 'start' || kind === 'goal' || kind === 'mole' || s.y + 0.5 < nearY) return;
      standing(s.x + ICON_AT.x, s.y + ICON_AT.y, SLAB, FIELDS[kind].emoji, ICON_H, 0.25);
    });
    let tag: (() => void) | null = null;
    // Looking round the board, everyone's name shows: one sign per field for those standing together.
    const signs = new Map<number, { names: string[]; x: number; y: number; z: number }>();
    for (const pawn of this.pawns) {
      const m = this.moving.get(pawn.id);
      const at = m ?? { ...(this.shown.get(pawn.id) ?? this.home(pawn)), lift: 0, alpha: 1 };
      const p = project(at.x, at.y, SLAB);
      if (!p) continue;
      items.push({
        z: p.z,
        draw: () => {
          const hgt = PAWN_H * p.s;
          this.shadow(p.sx, p.sy, hgt * 0.32 * (1 - at.lift * 0.6), squash(p), 0.3 * at.alpha);
          ctx.globalAlpha = at.alpha;
          const sr = Math.min(ratio, 2.5);
          const sprite = pawnSprite(pawn.pawn, sr);
          const k = hgt / SPRITE_H;
          const sw = (sprite.width / sr) * k;
          const sh = (sprite.height / sr) * k;
          const base = p.sy - at.lift * p.s * sin;
          ctx.drawImage(sprite, p.sx - sw / 2, base - sh + 10 * k, sw, sh);
          ctx.globalAlpha = 1;
          if (pawn.id === this.current) tag = () => this.tag(pawn.name, p.sx, base - hgt * 1.05, true);
          else if (this.away && !m) {
            const sign = signs.get(pawn.pos) ?? { names: [], x: 0, y: Infinity, z: p.z };
            sign.names.push(pawn.name);
            sign.x = (sign.x * (sign.names.length - 1) + p.sx) / sign.names.length;
            sign.y = Math.min(sign.y, base - hgt * 1.05);
            signs.set(pawn.pos, sign);
          }
        },
      });
    }
    items.sort((a, b) => b.z - a.z).forEach((it) => it.draw());
    const onField = this.pawns.find((q) => q.id === this.current)?.pos;
    for (const [pos, sign] of signs) this.tag(sign.names.join(' · '), sign.x, sign.y - (pos === onField ? 26 : 0), false);
    (tag as (() => void) | null)?.();

    // Far away the board fades into the dark.
    const horizon = cy - (F * cos) / sin;
    if (horizon > -60) {
      const g = ctx.createLinearGradient(0, Math.max(0, horizon - 10), 0, horizon + 90);
      g.addColorStop(0, this.table);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, Math.max(0, horizon + 90));
    }
  }

  /** A soft shadow on the board. (Pictures drawn once are much quicker to lay down than shapes.) */
  private shadow(x: number, y: number, r: number, squash: number, alpha: number) {
    const { ctx } = this;
    if (!this.shadowPic) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.85)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      this.shadowPic = c;
    }
    const ry = Math.max(1, r * squash);
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.shadowPic, x - r * 1.15, y - ry * 1.15, r * 2.3, ry * 2.3);
    ctx.globalAlpha = 1;
  }


  /** A name (or a few) over the pawns. */
  private tag(text: string, x: number, y: number, on: boolean) {
    const { ctx } = this;
    ctx.font = `700 ${on ? 13 : 11}px ${BODY}`;
    const w = ctx.measureText(text).width + 16;
    const h = on ? 22 : 18;
    rounded(ctx, x - w / 2, y - h, w, h, h / 2);
    ctx.fillStyle = on ? '#c5f235' : 'rgba(255,255,255,0.88)';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - h / 2 + 1);
  }

  /** A short wooden bridge from a field over the water to the field across it. */
  private drawBridge(l: { from: number; to: number }, project: (x: number, y: number, up?: number) => Proj | null) {
    const { ctx } = this;
    const a = this.spot(l.from);
    const b = this.spot(l.to);
    const half = 0.17;
    const ya = a.y - 0.36;
    const yb = b.y + 0.36;
    const n = 8;
    const left: Proj[] = [];
    const right: Proj[] = [];
    for (let i = 0; i <= n; i++) {
      const y = lerp(ya, yb, i / n);
      // A slight arch over the water.
      const up = SLAB + Math.sin((Math.PI * i) / n) * 0.12;
      const pl = project(a.x - half, y, up);
      const pr = project(a.x + half, y, up);
      if (!pl || !pr) return;
      left.push(pl);
      right.push(pr);
    }
    ctx.beginPath();
    left.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].sx, right[i].sy);
    ctx.closePath();
    ctx.fillStyle = '#b07a45';
    ctx.fill();
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = Math.max(1, left[0].s * 0.02);
    for (let i = 1; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(left[i].sx, left[i].sy);
      ctx.lineTo(right[i].sx, right[i].sy);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1.5, left[0].s * 0.035);
    for (const side of [left, right]) {
      ctx.beginPath();
      side.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
      ctx.stroke();
    }
  }

  /** The mole's tunnel: dug-up earth between the fields, straight back under the board. */
  private drawTunnel(l: { from: number; to: number }, project: (x: number, y: number, up?: number) => Proj | null) {
    const { ctx } = this;
    const a = this.spot(l.from);
    const b = this.spot(l.to);
    const pa = project(a.x, a.y);
    const pb = project(b.x, b.y);
    if (!pa || !pb) return;
    ctx.setLineDash([Math.max(3, pa.s * 0.06), Math.max(3, pa.s * 0.05)]);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, ((pa.s + pb.s) / 2) * 0.09);
    ctx.strokeStyle = 'rgba(92,60,34,0.8)';
    ctx.beginPath();
    ctx.moveTo(pa.sx, pa.sy);
    ctx.lineTo(pb.sx, pb.sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
  }
}
