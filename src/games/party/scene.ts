import { layout, THEMES, type Board, type Spot, type Theme } from './boards';
import { FIELDS, param } from './fields';
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
/** Field pictures are drawn once at this size (CSS px) and then laid onto the board. */
const TEX = 200;
/** A pawn's height, in field widths. */
const PAWN_H = 0.62;
/** How far the camera stands from the point it looks at, following a pawn. */
const FOLLOW_DIST = 7.5;
const FOLLOW_TILT = 1.0;
/** The camera looks this far ahead of the pawn, so you see where it's going. */
const AHEAD = 1.3;
const HOP = 0.24;

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

/** A pawn on its way: where it is right now (not on a field). */
interface Moving extends Point {
  lift: number;
  alpha: number;
}

interface Anim {
  id: string;
  /** World position and lift at time t (0 to 1), in seconds overall. */
  at: (t: number) => Moving;
  duration: number;
  start: number;
  /** Called with the step number whenever one is done (hops only). */
  steps?: number;
  onStep?: (i: number) => void;
  done: () => void;
  stepped: number;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

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
 * canvas (no layers for the phone to juggle), and only while something moves.
 */
export class Scene {
  private ctx: CanvasRenderingContext2D;
  private ratio = 1;
  private w = 0;
  private h = 0;
  private insetTop = 0;
  private insetBottom = 0;
  private spots: Spot[] = [];
  private board: Board | null = null;
  private theme: Theme = THEMES.classic;
  private textures: HTMLCanvasElement[] = [];
  private decor: { x: number; y: number; emoji: string; size: number }[] = [];
  private rivers: number[] = [];
  private links: { from: number; to: number; tunnel: boolean }[] = [];
  private pawns: PawnView[] = [];
  private current: string | null = null;
  private moving = new Map<string, Moving>();
  private anims: Anim[] = [];
  private cam: Cam = { x: 0, y: 0, dist: FOLLOW_DIST, tilt: FOLLOW_TILT };
  private goal: Cam = { ...this.cam };
  private following: string | null = null;
  private overview = false;
  private raf = 0;
  private last = 0;
  private table = '#10110e';
  private emojis = new Map<string, HTMLCanvasElement>();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.anims.forEach((a) => a.done());
    this.anims = [];
  }

  /** The canvas changed size (or the phone's pixel ratio). */
  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
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
    this.invalidate();
  }

  /** Room taken by things over the canvas at its top and bottom: the pawn stays in view between. */
  setInsets(top: number, bottom: number) {
    if (top === this.insetTop && bottom === this.insetBottom) return;
    this.insetTop = top;
    this.insetBottom = bottom;
    this.invalidate();
  }

  /** `labels`: each field's name as it reads on the board (translated). */
  setBoard(board: Board, labels: string[]) {
    this.board = board;
    this.theme = THEMES[board.theme];
    this.spots = layout(board.fields.length, board.cols);
    this.labels = labels;
    this.rivers = this.spots.filter((s, i) => s.link && board.fields[i].kind === 'bridge').map((s) => s.y);
    this.links = [];
    board.fields.forEach((f, i) => {
      if (f.kind === 'back-bridge' || f.kind === 'mole') this.links.push({ from: i, to: Math.max(0, i - param(f)), tunnel: f.kind === 'mole' });
    });
    this.placeDecor();
    this.buildTextures();
    this.invalidate();
  }

  private labels: string[] = [];

  setPawns(pawns: PawnView[], current: string | null) {
    this.pawns = pawns;
    this.current = current;
    if (this.following && !this.overview) this.aim(this.following);
    this.invalidate();
  }

  /** The camera goes to this pawn (and stays with it as it moves). */
  follow(id: string, instant = false) {
    this.following = id;
    this.overview = false;
    this.aim(id);
    if (instant) this.cam = { ...this.goal };
    this.invalidate();
  }

  /** The whole board from further up, or back to the pawn. */
  setOverview(on: boolean) {
    this.overview = on;
    if (on && this.board) {
      // Far enough up that the whole board fits between what lies over the canvas.
      const top = this.spots[this.spots.length - 1]?.y ?? 0;
      const tilt = 0.5;
      const F = (FOLLOW_DIST * this.w) / (this.board.cols + 0.6);
      const room = Math.max(200, this.h - this.insetTop - this.insetBottom);
      const dist = Math.max(FOLLOW_DIST, (F * (top + 2.4) * Math.cos(tilt)) / (room * 0.9));
      this.goal = { x: (this.board.cols - 1) / 2, y: top / 2 + 0.3, dist, tilt };
    } else if (this.following) this.aim(this.following);
    this.invalidate();
  }

  get isOverview() {
    return this.overview;
  }

  /** Hop along these fields one by one. `onStep` hears each landing. */
  hop(id: string, path: number[], onStep?: (i: number) => void): Promise<void> {
    const pawn = this.pawns.find((p) => p.id === id);
    if (!pawn || !path.length) return Promise.resolve();
    const points = [this.home(pawn), ...path.map((pos) => this.spot(pos))];
    return new Promise((done) => {
      this.anims.push({
        id,
        duration: HOP * path.length,
        start: performance.now(),
        steps: path.length,
        stepped: 0,
        onStep,
        done,
        at: (t) => {
          const f = Math.min(path.length - 1e-6, t * path.length);
          const i = Math.floor(f);
          const k = easeInOut(f - i);
          const a = points[i];
          const b = points[i + 1];
          return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, lift: Math.sin(Math.PI * (f - i)) * 0.32, alpha: 1 };
        },
      });
      this.invalidate();
    });
  }

  /** Over a bridge or through a tunnel, from one field to another. */
  travel(id: string, from: number, to: number, tunnel: boolean): Promise<void> {
    const a = this.spot(from);
    const b = this.spot(to);
    const c = this.bend(a, b);
    return new Promise((done) => {
      this.anims.push({
        id,
        duration: 1.5,
        start: performance.now(),
        stepped: 0,
        done,
        at: (t) => {
          const k = easeInOut(t);
          const x = (1 - k) ** 2 * a.x + 2 * (1 - k) * k * c.x + k * k * b.x;
          const y = (1 - k) ** 2 * a.y + 2 * (1 - k) * k * c.y + k * k * b.y;
          // Into the tunnel and out again; over a bridge with little steps.
          const alpha = tunnel ? Math.min(1, Math.abs(t - 0.5) * 6 - 1.2) : 1;
          return { x, y, lift: tunnel ? 0 : Math.abs(Math.sin(t * Math.PI * 7)) * 0.12, alpha: Math.max(0, alpha) };
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

  /** A pawn's place: its field, moved aside when it shares it with others. */
  private home(p: PawnView): Point {
    const base = this.spot(p.pos);
    const here = this.pawns.filter((q) => q.pos === p.pos && !this.moving.has(q.id));
    const n = here.length;
    const i = here.findIndex((q) => q.id === p.id);
    let off = { x: 0, y: 0 };
    if (n === 2) off = { x: i ? 0.2 : -0.2, y: 0 };
    else if (n > 2) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2;
      off = { x: Math.cos(a) * 0.24, y: Math.sin(a) * 0.2 };
    }
    if (p.gate) off = { x: off.x, y: off.y - 0.28 };
    return { x: base.x + off.x, y: base.y + off.y };
  }

  private where(id: string): Point {
    const m = this.moving.get(id);
    if (m) return m;
    const p = this.pawns.find((q) => q.id === id);
    return p ? this.home(p) : { x: 0, y: 0 };
  }

  private aim(id: string) {
    const p = this.where(id);
    // Across, the camera only goes half way to the pawn: the board stays more or less in the middle.
    const mid = ((this.board?.cols ?? 5) - 1) / 2;
    this.goal = { x: mid + (p.x - mid) * 0.55, y: p.y + AHEAD, dist: FOLLOW_DIST, tilt: FOLLOW_TILT };
  }

  /** The curve a bridge back or a tunnel takes: out to the side of the board. */
  private bend(a: Point, b: Point): Point {
    const cols = this.board?.cols ?? 5;
    const mid = (a.x + b.x) / 2;
    const side = mid < (cols - 1) / 2 ? -1.2 : 1.2;
    return { x: mid + side, y: (a.y + b.y) / 2 };
  }

  private placeDecor() {
    const taken = new Set(this.spots.map((s) => `${s.x},${s.y}`));
    const top = this.spots[this.spots.length - 1]?.y ?? 0;
    const cols = this.board?.cols ?? 5;
    this.decor = [];
    let seed = this.board!.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 10000) / 10000;
    for (let y = 1; y <= top; y += 2) {
      if (this.rivers.includes(y)) continue;
      for (let x = 0; x < cols; x++) {
        if (taken.has(`${x},${y}`) || rnd() < 0.35) continue;
        this.decor.push({
          x: x + (rnd() - 0.5) * 0.4,
          y: y + (rnd() - 0.5) * 0.3,
          emoji: this.theme.decor[Math.floor(rnd() * this.theme.decor.length)],
          size: 0.42 + rnd() * 0.18,
        });
      }
    }
  }

  /* ---------- Pictures drawn once ---------- */

  private buildTextures() {
    if (!this.board) return;
    // Twice the size is sharp enough for a field (and keeps the pictures' memory small on phones).
    const r = Math.min(this.ratio, 2);
    this.textures = this.board.fields.map((_, i) => {
      const c = document.createElement('canvas');
      c.width = c.height = Math.round(TEX * r);
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
    ctx.restore();
    rounded(ctx, m, m, size, size, 26);
    ctx.lineWidth = 7;
    ctx.strokeStyle = INK;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (f.kind === 'start' || f.kind === 'goal') {
      ctx.font = `64px ${EMOJI_FONT}`;
      ctx.fillText(info.emoji, TEX / 2, TEX / 2 - 18);
      const { lines, px } = fit(ctx, label.toUpperCase(), size - 30, 44, 24, (p) => `900 ${p}px ${DISPLAY}`);
      ctx.fillStyle = INK;
      ctx.fillText(lines[0], TEX / 2, TEX / 2 + 50 + (px - 44) / 3);
      return;
    }
    // Number in the corner.
    ctx.font = `700 22px ${BODY}`;
    ctx.fillStyle = 'rgba(29,27,22,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText(String(i), m + 14, m + 22);
    ctx.textAlign = 'center';
    ctx.font = `58px ${EMOJI_FONT}`;
    ctx.fillStyle = INK;
    ctx.fillText(info.emoji, TEX / 2, TEX / 2 - 22);
    const { lines, px } = fit(ctx, label.toUpperCase(), size - 26, 36, 20, (p) => `800 ${p}px ${DISPLAY}`);
    ctx.fillStyle = INK;
    const lh = px * 0.95;
    const y0 = TEX / 2 + 48 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, k) => ctx.fillText(l, TEX / 2, y0 + k * lh));
  }

  private emojiSprite(emoji: string): HTMLCanvasElement {
    let c = this.emojis.get(emoji);
    if (c) return c;
    c = document.createElement('canvas');
    const px = 96;
    const r = Math.min(this.ratio, 2.5);
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
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    // Moving pawns.
    this.moving.clear();
    for (const a of [...this.anims]) {
      // (A frame's time can lie a moment before the animation was started.)
      const t = Math.max(0, Math.min(1, (now - a.start) / 1000 / a.duration));
      this.moving.set(a.id, a.at(t));
      if (a.steps && a.onStep) {
        const reached = Math.floor(t * a.steps + 1e-6);
        while (a.stepped < reached) a.onStep(a.stepped++);
      }
      if (t >= 1) {
        this.anims = this.anims.filter((x) => x !== a);
        this.moving.delete(a.id);
        a.done();
      }
    }
    // The camera eases after its goal (and after the pawn it follows).
    if (this.following && !this.overview && this.moving.has(this.following)) this.aim(this.following);
    const k = 1 - Math.exp(-dt / (this.overview ? 0.28 : 0.2));
    const c = this.cam;
    const g = this.goal;
    c.x += (g.x - c.x) * k;
    c.y += (g.y - c.y) * k;
    c.dist += (g.dist - c.dist) * k;
    c.tilt += (g.tilt - c.tilt) * k;
    const settled = Math.abs(g.x - c.x) + Math.abs(g.y - c.y) + Math.abs(g.dist - c.dist) + Math.abs(g.tilt - c.tilt) < 0.002;
    if (settled) this.cam = { ...g };
    this.draw();
    if (!settled || this.anims.length) this.invalidate();
  };

  private draw() {
    const { ctx, w, h, ratio, board } = this;
    if (!board || !w) return;
    const cam = this.cam;
    const sin = Math.sin(cam.tilt);
    const cos = Math.cos(cam.tilt);
    const F = (FOLLOW_DIST * w) / (board.cols + 0.6);
    const cx = w / 2;
    const cy = this.insetTop + (h - this.insetTop - this.insetBottom) * 0.54;
    const project = (x: number, y: number) => {
      const dx = x - cam.x;
      const dy = y - cam.y;
      const z = cam.dist + dy * sin;
      if (z < 0.35) return null;
      return { sx: cx + (F * dx) / z, sy: cy - (F * dy * cos) / z, z, s: F / z, dx };
    };
    /** Lay the next drawing flat on the board at (x, y): 1 unit = `unit` field widths. */
    const flat = (x: number, y: number, unit: number) => {
      const p = project(x, y);
      if (!p) return null;
      const a = p.s * unit;
      const vx = ((F * p.dx * sin) / (p.z * p.z)) * unit;
      const vy = ((F * cos * cam.dist) / (p.z * p.z)) * unit;
      ctx.setTransform(a * ratio, 0, vx * ratio, vy * ratio, p.sx * ratio, p.sy * ratio);
      return p;
    };
    const nearY = cam.y + (0.5 - cam.dist) / sin;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = this.table;
    ctx.fillRect(0, 0, w, h);

    // The board itself.
    const top = this.spots[this.spots.length - 1]?.y ?? 0;
    const x0 = -0.95;
    const x1 = board.cols - 0.05;
    const y0 = Math.max(-1.6, nearY);
    const y1 = top + 1;
    const corners = [project(x0, y0), project(x1, y0), project(x1, y1), project(x0, y1)];
    if (corners.every(Boolean)) {
      const [a, b, c2, d] = corners as NonNullable<ReturnType<typeof project>>[];
      const grad = ctx.createLinearGradient(0, project(0, -1)?.sy ?? a.sy, 0, d.sy);
      grad.addColorStop(0, this.theme.near);
      grad.addColorStop(1, this.theme.far);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.lineTo(c2.sx, c2.sy);
      ctx.lineTo(d.sx, d.sy);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, a.s * 0.05);
      ctx.strokeStyle = shade(this.theme.far, -0.45);
      ctx.stroke();
    }

    // Rivers, where a bridge crosses between two rows.
    for (const ry of this.rivers) {
      if (ry + 0.5 < nearY) continue;
      const q = [project(x0, Math.max(nearY, ry - 0.45)), project(x1, Math.max(nearY, ry - 0.45)), project(x1, ry + 0.45), project(x0, ry + 0.45)];
      if (!q.every(Boolean)) continue;
      const pts = q as NonNullable<ReturnType<typeof project>>[];
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
      ctx.closePath();
      ctx.fillStyle = this.theme.river;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1, pts[0].s * 0.025);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let x = x0 + 0.1; x <= x1; x += 0.25) {
          const p = project(x, ry - 0.25 + k * 0.25 + Math.sin(x * 4 + k) * 0.05);
          if (p) (x === x0 + 0.1 ? ctx.moveTo : ctx.lineTo).call(ctx, p.sx, p.sy);
        }
        ctx.stroke();
      }
    }

    // Fields, the far ones first.
    const order = this.spots.map((_, i) => i).sort((a, b) => this.spots[b].y - this.spots[a].y);
    const unit = TILE / TEX;
    for (const i of order) {
      const s = this.spots[i];
      if (s.y + 0.5 < nearY) continue;
      const p = flat(s.x, s.y, unit);
      if (!p || p.sy < -p.s || p.sy > h + p.s) continue;
      ctx.drawImage(this.textures[i], -TEX / 2, -TEX / 2, TEX, TEX);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Bridges back and the mole's tunnels.
    for (const l of this.links) this.drawLink(l, project);

    // The ring under whoever is on.
    const on = this.current ? this.where(this.current) : null;
    if (on && !this.moving.has(this.current!)) {
      const p = project(on.x, on.y);
      if (p) {
        ctx.beginPath();
        ctx.ellipse(p.sx, p.sy, p.s * 0.36, p.s * 0.36 * ((cos * cam.dist) / p.z), 0, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(2, p.s * 0.05);
        ctx.strokeStyle = '#c5f235';
        ctx.stroke();
      }
    }

    // Standing things, the far ones first: what's around, and the pawns.
    type Item = { z: number; draw: () => void };
    const items: Item[] = [];
    for (const d of this.decor) {
      const p = project(d.x, d.y);
      if (!p || p.sy < -40 || p.sy > h + 80) continue;
      items.push({
        z: p.z,
        draw: () => {
          const sprite = this.emojiSprite(d.emoji);
          const size = d.size * p.s;
          this.shadow(p.sx, p.sy, size * 0.32, (cos * cam.dist) / p.z, 0.18);
          ctx.drawImage(sprite, p.sx - size * 0.625, p.sy - size * 1.05, size * 1.25, size * 1.25);
        },
      });
    }
    for (const pawn of this.pawns) {
      const at = this.moving.get(pawn.id) ?? { ...this.home(pawn), lift: 0, alpha: 1 };
      const p = project(at.x, at.y);
      if (!p) continue;
      items.push({
        z: p.z,
        draw: () => {
          const hgt = PAWN_H * p.s;
          ctx.globalAlpha = at.alpha;
          this.shadow(p.sx, p.sy, hgt * 0.32 * (1 - at.lift * 0.6), (cos * cam.dist) / p.z, 0.3);
          const sprite = pawnSprite(pawn.pawn, Math.min(ratio, 2.5));
          const sr = Math.min(ratio, 2.5);
          const m = hgt / SPRITE_H;
          const sw = (sprite.width / sr) * m;
          const sh = (sprite.height / sr) * m;
          const base = p.sy - at.lift * p.s;
          ctx.drawImage(sprite, p.sx - sw / 2, base - sh + 10 * m, sw, sh);
          ctx.globalAlpha = 1;
          if (pawn.id === this.current || this.overview) this.tag(pawn, p.sx, base - hgt * 1.05, pawn.id === this.current);
        },
      });
    }
    items.sort((a, b) => b.z - a.z).forEach((it) => it.draw());

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

  private shadow(x: number, y: number, r: number, squash: number, alpha: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(x, y, r, Math.max(1, r * squash), 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fill();
  }

  /** A name over a pawn. */
  private tag(pawn: PawnView, x: number, y: number, on: boolean) {
    const { ctx } = this;
    ctx.font = `700 ${on ? 13 : 11}px ${BODY}`;
    const w = ctx.measureText(pawn.name).width + 16;
    const h = on ? 22 : 18;
    rounded(ctx, x - w / 2, y - h, w, h, h / 2);
    ctx.fillStyle = on ? '#c5f235' : 'rgba(255,255,255,0.88)';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pawn.name, x, y - h / 2 + 1);
  }

  private drawLink(l: { from: number; to: number; tunnel: boolean }, project: (x: number, y: number) => { sx: number; sy: number; s: number } | null) {
    const { ctx } = this;
    const a = this.spot(l.from);
    const b = this.spot(l.to);
    const c = this.bend(a, b);
    const n = 28;
    const left: { sx: number; sy: number }[] = [];
    const right: { sx: number; sy: number }[] = [];
    const mid: { sx: number; sy: number; s: number }[] = [];
    const half = l.tunnel ? 0.09 : 0.14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x;
      const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y;
      const tx = 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x);
      const ty = 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y);
      const len = Math.hypot(tx, ty) || 1;
      const nx = (-ty / len) * half;
      const ny = (tx / len) * half;
      const pl = project(x + nx, y + ny);
      const pr = project(x - nx, y - ny);
      const pm = project(x, y);
      if (!pl || !pr || !pm) return;
      left.push(pl);
      right.push(pr);
      mid.push(pm);
    }
    ctx.beginPath();
    left.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].sx, right[i].sy);
    ctx.closePath();
    if (l.tunnel) {
      // Under the board: a dark trail of dug-up earth.
      ctx.fillStyle = 'rgba(92,60,34,0.55)';
      ctx.fill();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(60,38,20,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      for (const end of [mid[0], mid[mid.length - 1]]) {
        ctx.beginPath();
        ctx.ellipse(end.sx, end.sy, end.s * 0.16, end.s * 0.09, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#3b2616';
        ctx.fill();
      }
      return;
    }
    // A rope bridge: planks across, ropes along both sides.
    ctx.fillStyle = '#b07a45';
    ctx.fill();
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = Math.max(1, mid[0].s * 0.02);
    for (let i = 1; i < n; i += 2) {
      ctx.beginPath();
      ctx.moveTo(left[i].sx, left[i].sy);
      ctx.lineTo(right[i].sx, right[i].sy);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1.2, mid[0].s * 0.03);
    for (const side of [left, right]) {
      ctx.beginPath();
      side.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
      ctx.stroke();
    }
  }
}
