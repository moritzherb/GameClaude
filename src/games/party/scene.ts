import { cellKey, jumps, THEMES, type Board, type Cell, type Theme } from './boards';
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
  /** Over the bridge: at its far end. */
  crossed?: boolean;
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
/** A board this many fields wide fills the screen's width (at the zoom above, a little less). */
const SCREEN_COLS = 5.6;
/** Round the map, the board reaches this far beyond its cells. */
const MARGIN = 0.25;
const FOLLOW_TILT = 1.0;
const MIN_DIST = 4.6;
/** The camera looks this far ahead of the pawn, so you see where it's going. */
const AHEAD = 1.3;
/** Seconds per field a pawn hops. */
const STEP = 0.3;
/** A bridge: half its length (it reaches a little onto the fields either side), half its width, how high it arches. */
const BRIDGE_L = 0.56;
const BRIDGE_W = 0.34;
const BRIDGE_H = 0.2;
/** Where on a bridge a pawn waits, and where it stands once over (along the bridge from its middle). */
const BRIDGE_END = 0.42;
const deckAt = (t: number) => SLAB + BRIDGE_H * (1 - (t / BRIDGE_L) ** 2);

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
  private spots: Cell[] = [];
  private board: Board | null = null;
  private theme: Theme = THEMES.classic;
  private labels: string[] = [];
  private textures: HTMLCanvasElement[] = [];
  private decor: { x: number; y: number; emoji: string; size: number }[] = [];
  /** Cells with water, and with the mole's tunnels; bridges back (field to field, over water). */
  private water = new Set<string>();
  private tunnels = new Set<string>();
  private bridges: { from: number; to: number }[] = [];
  /** Fields a tunnel leads from or to: the tunnel runs right up to them. */
  private tunnelEnds = new Set<string>();
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
    this.spots = board.spots;
    this.labels = labels;
    this.water = new Set(board.water.map(cellKey));
    this.tunnels = new Set(board.tunnels.map(cellKey));
    const to = jumps(board);
    this.bridges = Object.entries(to)
      .filter(([from]) => board.fields[+from].kind === 'back-bridge')
      .map(([from, j]) => ({ from: +from, to: j }));
    this.tunnelEnds = new Set();
    for (const [from, j] of Object.entries(to)) {
      if (board.fields[+from].kind !== 'mole') continue;
      this.tunnelEnds.add(cellKey(board.spots[+from]));
      this.tunnelEnds.add(cellKey(board.spots[j]));
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
  private place(id: string, pos: number, crossed = false): Point {
    const here = this.pawns.filter((q) => q.id === id || (q.pos === pos && !this.moving.has(q.id)));
    const k = Math.max(0, here.findIndex((q) => q.id === id));
    const base = this.spot(pos);
    const kind = this.board?.fields[pos]?.kind;
    if (kind === 'bridge') {
      // On a bridge: waiting at its near end, or over at its far end; side by side across it.
      const { d, n } = this.axis(pos);
      const t = crossed ? BRIDGE_END : -BRIDGE_END;
      const side = [0, 0.17, -0.17, 0.08, -0.08][k % 5];
      return { x: base.x + d.x * t + n.x * side, y: base.y + d.y * t + n.y * side };
    }
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
    return { x: base.x + off.x, y: base.y + off.y };
  }

  private home(p: PawnView): Point {
    return this.place(p.id, p.pos, p.crossed);
  }

  /** Which way a bridge runs: from the field before it (d), and across it (n). */
  private axis(pos: number) {
    const c = this.spot(pos);
    const prev = this.spots[pos - 1];
    const next = this.spots[pos + 1];
    let d = prev ? { x: c.x - prev.x, y: c.y - prev.y } : next ? { x: next.x - c.x, y: next.y - c.y } : { x: 0, y: 1 };
    if (!d.x && !d.y) d = { x: 0, y: 1 };
    return { d, n: { x: -d.y, y: d.x } };
  }

  /** Over the bridge: from its near end, up over the arch, to its far end. */
  cross(id: string): Promise<void> {
    const pawn = this.pawns.find((p) => p.id === id);
    if (!pawn) return Promise.resolve();
    const a = this.shown.get(id) ?? this.place(id, pawn.pos);
    const b = this.place(id, pawn.pos, true);
    return new Promise((done) => {
      this.anims.push({
        id,
        duration: 1.2,
        start: performance.now(),
        stepped: 0,
        done,
        at: (t) => {
          const k = easeInOut(t);
          const along = -BRIDGE_END + 2 * BRIDGE_END * k;
          // Little steps, over the arch.
          return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), lift: deckAt(along) - SLAB + Math.abs(Math.sin(t * Math.PI * 6)) * 0.05, alpha: 1 };
        },
      });
      this.invalidate();
    });
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
    // The middle of the pawn's field (not its own place on it): the camera doesn't drift once it lands.
    const p = this.moving.get(id) ?? (() => {
      const v = this.pawns.find((q) => q.id === id);
      return v ? this.spot(v.pos) : this.where(id);
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
    const b = this.board!;
    const taken = new Set([...this.spots.map(cellKey), ...this.water, ...this.tunnels]);
    this.decor = [];
    let seed = b.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 10000) / 10000;
    for (let y = 0; y < b.rows; y++) {
      for (let x = 0; x < b.cols; x++) {
        if (taken.has(cellKey({ x, y })) || rnd() < 0.72) continue;
        this.decor.push({ x: x + (rnd() - 0.5) * 0.4, y: y + (rnd() - 0.5) * 0.3, emoji: this.theme.decor[Math.floor(rnd() * this.theme.decor.length)], size: 0.3 + rnd() * 0.12 });
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
    c.x = Math.max(-1, Math.min(this.board.cols, c.x - (dx * c.dist) / F));
    c.y = Math.max(-1, Math.min(this.board.rows, c.y + (dy * c.dist) / (F * Math.cos(c.tilt))));
    this.invalidate();
  }

  private zoom(f: number) {
    if (!this.board) return;
    this.takeOver();
    this.cam.dist = Math.max(MIN_DIST, Math.min(Math.max(20, this.board.rows * 2.2), this.cam.dist * f));
    this.invalidate();
  }

  /* ---------- The camera ---------- */

  private focal() {
    return ((FOLLOW_DIST * this.w) / SCREEN_COLS) * ZOOM;
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

  /** The board's edges, round its cells. */
  private mat() {
    const b = this.board!;
    return { x0: -0.5 - MARGIN, x1: b.cols - 0.5 + MARGIN, y0: -0.5 - MARGIN - 0.5, y1: b.rows - 0.5 + MARGIN };
  }

  /** The camera that shows the whole board in the room between what lies over the canvas. */
  private fitAll(): Cam {
    if (!this.board || !this.w) return this.cam;
    const tilt = 0.55;
    const top = this.board.rows;
    const x = (this.board.cols - 1) / 2;
    const m = this.mat();
    const corners: Point[] = [
      { x: m.x0, y: m.y0 },
      { x: m.x1, y: m.y0 },
      { x: m.x1, y: m.y1 },
      { x: m.x0, y: m.y1 },
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
      // Planks across the way over: the way runs up the board when the fields before and after lie above or below.
      const here = this.spots[i];
      const near = [this.spots[i - 1], this.spots[i + 1]].filter(Boolean);
      const across = !!here && near.some((n) => n.x === here.x);
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
    const m = this.mat();
    if (poly([{ x: m.x0, y: m.y0 }, { x: m.x1, y: m.y0 }, { x: m.x1, y: m.y1 }, { x: m.x0, y: m.y1 }])) {
      const near = project(0, Math.max(m.y0, nearY));
      const far = project(0, m.y1);
      const grad = ctx.createLinearGradient(0, near?.sy ?? h, 0, far?.sy ?? 0);
      grad.addColorStop(0, this.theme.near);
      grad.addColorStop(1, this.theme.far);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = shade(this.theme.far, -0.45);
      ctx.stroke();
    }

    // Water, cell by cell: neighbouring cells run into one another, round corners where it ends.
    const wet = [...this.water].map((k) => k.split(',').map(Number) as [number, number]).filter(([, y]) => y + 0.6 >= nearY);
    const isWet = (x: number, y: number) => this.water.has(`${x},${y}`);
    const pond = (x: number, y: number, grow: number) => {
      const r = 0.34;
      const pts: Point[] = [];
      // Corners in turn (near left, near right, far right, far left), rounded where nothing wet meets them.
      const corners = [
        { cx: -1, cy: -1, a: Math.PI },
        { cx: 1, cy: -1, a: Math.PI * 1.5 },
        { cx: 1, cy: 1, a: 0 },
        { cx: -1, cy: 1, a: Math.PI / 2 },
      ];
      for (const c of corners) {
        const px = x + c.cx * (0.5 + grow);
        const py = y + c.cy * (0.5 + grow);
        if (!isWet(x + c.cx, y) && !isWet(x, y + c.cy)) {
          for (let k = 0; k <= 3; k++) {
            const ang = c.a + (k / 3) * (Math.PI / 2);
            pts.push({ x: px - c.cx * r + Math.cos(ang) * r, y: py - c.cy * r + Math.sin(ang) * r });
          }
        } else pts.push({ x: px, y: py });
      }
      return poly(pts);
    };
    ctx.fillStyle = shade(this.theme.water, -0.25);
    for (const [x, y] of wet) if (pond(x, y, 0.06)) ctx.fill();
    ctx.fillStyle = this.theme.water;
    for (const [x, y] of wet) if (pond(x, y, 0.004)) ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    for (const [x, y] of wet) {
      // Waves along the way the water runs.
      const along = isWet(x, y - 1) || isWet(x, y + 1) ? !(isWet(x - 1, y) || isWet(x + 1, y)) : false;
      for (const k of [-0.2, 0.18]) {
        ctx.beginPath();
        let started = false;
        for (let t = -0.4; t <= 0.41; t += 0.1) {
          const wx = along ? x + k + Math.sin((y + t) * 6) * 0.04 : x + t;
          const wy = along ? y + t : y + k + Math.sin((x + t) * 6) * 0.04;
          const p = project(wx, Math.max(nearY, wy));
          if (!p) continue;
          if (started) ctx.lineTo(p.sx, p.sy);
          else ctx.moveTo(p.sx, p.sy);
          started = true;
        }
        ctx.stroke();
      }
    }

    // The mole's tunnels: a trail of dug-up earth from cell to cell (round corners too), right up to the fields it joins.
    this.drawTunnels(project, nearY);

    // Fields, the far ones first: a little block each, the picture on top.
    const order = this.spots.map((_, i) => i).sort((a, b) => this.spots[b].y - this.spots[a].y);
    const unit = TILE / TEX;
    for (const i of order) {
      const s = this.spots[i];
      if (s.y + 0.5 < nearY || board.fields[i].kind === 'bridge') continue;
      const face = flat(s.x, s.y, unit, SLAB);
      if (!face || face.sy < -face.s || face.sy > h + face.s) continue;
      ctx.drawImage(this.textures[i], -TEX / 2, -TEX / 2, TEX, TEX + EDGE);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Bridges back, over the water between two fields; bridge fields, a bridge of their own.
    for (const l of this.bridges) this.drawBridge(l, project);
    this.spots.forEach((s, i) => {
      if (board.fields[i].kind === 'bridge' && s.y + 1 >= nearY) this.drawGateBridge(i, project);
    });

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
      if (kind === 'bridge') {
        // A sign at the near end: what you need to roll to get over.
        const { d, n } = this.axis(i);
        const p = project(s.x - d.x * (BRIDGE_L + 0.05) + n.x * (BRIDGE_W + 0.14), s.y - d.y * (BRIDGE_L + 0.05) + n.y * (BRIDGE_W + 0.14), SLAB);
        if (p) items.push({ z: p.z, draw: () => this.sign(p, board.fields[i].n ? '1–2' : '5–6') });
        return;
      }
      standing(s.x + ICON_AT.x, s.y + ICON_AT.y, SLAB, FIELDS[kind].emoji, ICON_H, 0.25);
    });
    let tag: (() => void) | null = null;
    // Looking round the board, everyone's name shows: one sign per field for those standing together.
    const signs = new Map<number, { names: string[]; x: number; y: number; z: number }>();
    for (const pawn of this.pawns) {
      const m = this.moving.get(pawn.id);
      const onBridge = board.fields[pawn.pos]?.kind === 'bridge';
      const at = m ?? { ...(this.shown.get(pawn.id) ?? this.home(pawn)), lift: onBridge ? deckAt(BRIDGE_END) - SLAB : 0, alpha: 1 };
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

  /** A little wooden sign on a post. */
  private sign(p: Proj, text: string) {
    const { ctx } = this;
    const s = p.s;
    const post = s * 0.32;
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(p.sx - s * 0.015, p.sy - post, s * 0.03, post);
    ctx.font = `900 ${Math.max(8, s * 0.13)}px ${DISPLAY}`;
    const w = ctx.measureText(text).width + s * 0.1;
    const h = s * 0.17;
    rounded(ctx, p.sx - w / 2, p.sy - post - h, w, h, s * 0.03);
    ctx.fillStyle = '#c8935a';
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.strokeStyle = '#6b4423';
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, p.sx, p.sy - post - h / 2 + 1);
  }

  /** A bridge field: a wooden bridge arching over the water, with railings on both sides. */
  private drawGateBridge(i: number, project: (x: number, y: number, up?: number) => Proj | null) {
    const { ctx } = this;
    const c = this.spot(i);
    const { d, n } = this.axis(i);
    const steps = 10;
    const edge = (side: number, t: number, up: number) => project(c.x + d.x * t + n.x * side, c.y + d.y * t + n.y * side, up);
    const ts = Array.from({ length: steps + 1 }, (_, k) => -BRIDGE_L + (2 * BRIDGE_L * k) / steps);
    const line = (pts: (Proj | null)[]) => {
      ctx.beginPath();
      let started = false;
      for (const p of pts) {
        if (!p) continue;
        if (started) ctx.lineTo(p.sx, p.sy);
        else ctx.moveTo(p.sx, p.sy);
        started = true;
      }
    };
    const s0 = project(c.x, c.y, SLAB)?.s ?? 40;
    // The side nearer the camera (lower on the screen) shows its edge; railings: the far one first.
    const sides = [BRIDGE_W, -BRIDGE_W].sort((a, b) => (edge(b, 0, SLAB)?.sy ?? 0) - (edge(a, 0, SLAB)?.sy ?? 0));
    const rail = (side: number) => {
      ctx.strokeStyle = '#5a3a1f';
      ctx.lineWidth = Math.max(1.5, s0 * 0.03);
      for (const t of [-0.5, -0.25, 0, 0.25, 0.5]) {
        const a = edge(side, t, deckAt(t));
        const b = edge(side, t, deckAt(t) + 0.2);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
      ctx.lineWidth = Math.max(2, s0 * 0.04);
      line(ts.filter((t) => Math.abs(t) <= 0.52).map((t) => edge(side, t, deckAt(t) + 0.2)));
      ctx.stroke();
    };
    rail(sides[0]);
    // The near edge of the deck, then the deck: planks across it.
    const near = sides[1];
    const top = ts.map((t) => edge(near, t, deckAt(t)));
    const under = ts.map((t) => edge(near, t, deckAt(t) - 0.07));
    if ([...top, ...under].every(Boolean)) {
      ctx.beginPath();
      top.forEach((p, k) => (k ? ctx.lineTo(p!.sx, p!.sy) : ctx.moveTo(p!.sx, p!.sy)));
      for (let k = under.length - 1; k >= 0; k--) ctx.lineTo(under[k]!.sx, under[k]!.sy);
      ctx.closePath();
      ctx.fillStyle = '#7a4e2a';
      ctx.fill();
    }
    const left = ts.map((t) => edge(BRIDGE_W, t, deckAt(t)));
    const right = ts.map((t) => edge(-BRIDGE_W, t, deckAt(t)));
    if (![...left, ...right].every(Boolean)) return;
    ctx.beginPath();
    left.forEach((p, k) => (k ? ctx.lineTo(p!.sx, p!.sy) : ctx.moveTo(p!.sx, p!.sy)));
    for (let k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k]!.sx, right[k]!.sy);
    ctx.closePath();
    ctx.fillStyle = '#b9824b';
    ctx.fill();
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = Math.max(1, s0 * 0.018);
    for (let k = 1; k < steps; k++) {
      ctx.beginPath();
      ctx.moveTo(left[k]!.sx, left[k]!.sy);
      ctx.lineTo(right[k]!.sx, right[k]!.sy);
      ctx.stroke();
    }
    ctx.stroke();
    rail(sides[0] === BRIDGE_W ? -BRIDGE_W : BRIDGE_W);
  }

  /** A wooden bridge from a field straight over the water to the field across it. */
  private drawBridge(l: { from: number; to: number }, project: (x: number, y: number, up?: number) => Proj | null) {
    const { ctx } = this;
    const a = this.spot(l.from);
    const b = this.spot(l.to);
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    const half = 0.17;
    const from = { x: a.x + dx * 0.36, y: a.y + dy * 0.36 };
    const to = { x: b.x - dx * 0.36, y: b.y - dy * 0.36 };
    const n = Math.max(4, Math.round(Math.hypot(to.x - from.x, to.y - from.y) * 5));
    const left: Proj[] = [];
    const right: Proj[] = [];
    for (let i = 0; i <= n; i++) {
      const x = lerp(from.x, to.x, i / n);
      const y = lerp(from.y, to.y, i / n);
      // A slight arch over the water.
      const up = SLAB + Math.sin((Math.PI * i) / n) * 0.12;
      const pl = project(x - dy * half, y + dx * half, up);
      const pr = project(x + dy * half, y - dx * half, up);
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

  /** The mole's tunnels: from each tunnel cell, a band of earth towards each neighbour it joins. */
  private drawTunnels(project: (x: number, y: number, up?: number) => Proj | null, nearY: number) {
    const { ctx } = this;
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    ctx.lineCap = 'round';
    for (const k of this.tunnels) {
      const [x, y] = k.split(',').map(Number);
      if (y + 0.6 < nearY) continue;
      const c = project(x, y);
      if (!c) continue;
      const ends: Proj[] = [];
      for (const d of dirs) {
        const n = `${x + d.x},${y + d.y}`;
        const reach = this.tunnels.has(n) ? 0.5 : this.tunnelEnds.has(n) ? 0.62 : 0;
        if (!reach) continue;
        const p = project(x + d.x * reach, y + d.y * reach);
        if (p) ends.push(p);
      }
      for (const [color, width] of [
        ['#8a5a34', 0.3],
        ['#5c3a1f', 0.12],
      ] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, c.s * width);
        ctx.beginPath();
        if (!ends.length) {
          ctx.moveTo(c.sx - 0.5, c.sy);
          ctx.lineTo(c.sx + 0.5, c.sy);
        }
        for (const e of ends) {
          ctx.moveTo(c.sx, c.sy);
          ctx.lineTo(e.sx, e.sy);
        }
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  }
}
