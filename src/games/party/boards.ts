import { tx } from '../../i18n';
import { load, save } from '../../lib/storage';
import { field, FIELDS, type Field, type FieldKind } from './fields';

/** A cell of the board's map: x across, y away from the start (in field widths). */
export interface Cell {
  x: number;
  y: number;
}

export const cellKey = (c: Cell) => `${c.x},${c.y}`;

/** Where a field lies in the snake below, and whether it's the one field between two rows. */
export interface Spot extends Cell {
  link: boolean;
}

/**
 * The path as a snake: a row across, one field up at its end, the next row back the other way, and
 * so on, away from the start. (How the board the game comes with is laid out.)
 */
export function layout(count: number, cols: number): Spot[] {
  const out: Spot[] = [];
  let x = 0;
  let y = 0;
  let dir = 1;
  let link = false;
  while (out.length < count) {
    out.push({ x, y, link });
    if (link) {
      y += 1;
      dir = -dir;
      link = false;
    } else if (x + dir >= 0 && x + dir < cols) {
      x += dir;
    } else {
      y += 1;
      link = true;
    }
  }
  return out;
}

export type ThemeId = 'classic';

export interface Theme {
  /** The board's colour near the start and far away at the finish. */
  near: string;
  far: string;
  /** Things standing around on the board. */
  decor: string[];
  water: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  classic: { near: '#f1ebdf', far: '#d9cdf2', decor: ['🎲', '🍾', '🥂', '🎉', '🍻', '🪩'], water: '#5aa7e6' },
};

/**
 * A board: a map of cells. The fields lie on a path through it (start to finish, each next to the
 * one before), water lies on some cells (a field on water is a bridge over it), and the mole's
 * tunnels run under others.
 */
export interface Board {
  id: string;
  /** English for the board the game comes with (render with t()); a custom board's own name. */
  name: string;
  theme: ThemeId;
  /** The map's size in cells. */
  cols: number;
  rows: number;
  fields: Field[];
  /** Where each field lies, in the order they're walked. */
  spots: Cell[];
  water: Cell[];
  tunnels: Cell[];
  /** Made in the editor. */
  custom?: boolean;
}

/** What a jump needs to know about a board. */
export type Geometry = Pick<Board, 'spots' | 'water' | 'tunnels'>;

const STEPS: Cell[] = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];

/**
 * Where a bridge back or the mole's tunnel on field `i` takes you, or null if there's nowhere to go
 * from there. A bridge crosses the water next to the field, straight over it, to a field before
 * this one on the other side. A tunnel starts next to the field and leads, cell by cell (round
 * corners too), to the field furthest back that it touches.
 */
export function jumpTarget(board: Geometry, i: number, kind: FieldKind): number | null {
  const s = board.spots[i];
  if (!s) return null;
  const at = new Map(board.spots.map((c, k) => [cellKey(c), k]));
  if (kind === 'back-bridge') {
    const wet = new Set(board.water.map(cellKey));
    for (const d of STEPS) {
      let k = 1;
      while (wet.has(cellKey({ x: s.x + d.x * k, y: s.y + d.y * k })) && k < 30) k++;
      if (k === 1) continue;
      const j = at.get(cellKey({ x: s.x + d.x * k, y: s.y + d.y * k }));
      if (j != null && j < i) return j;
    }
    return null;
  }
  if (kind === 'mole') {
    const tunnel = new Set(board.tunnels.map(cellKey));
    const seen = new Set<string>();
    const queue = STEPS.map((d) => ({ x: s.x + d.x, y: s.y + d.y })).filter((c) => tunnel.has(cellKey(c)));
    let best: number | null = null;
    while (queue.length) {
      const c = queue.shift()!;
      const k = cellKey(c);
      if (seen.has(k)) continue;
      seen.add(k);
      for (const d of STEPS) {
        const n = { x: c.x + d.x, y: c.y + d.y };
        const j = at.get(cellKey(n));
        if (j != null && j < i && (best == null || j < best)) best = j;
        if (tunnel.has(cellKey(n)) && !seen.has(cellKey(n))) queue.push(n);
      }
    }
    return best;
  }
  return null;
}

/** Every bridge back and tunnel on a board: field → where it takes you. */
export function jumps(board: Geometry & Pick<Board, 'fields'>): Record<number, number> {
  const out: Record<number, number> = {};
  board.fields.forEach((f, i) => {
    const to = jumpTarget(board, i, f.kind);
    if (to != null) out[i] = to;
  });
  return out;
}

const F = (kind: FieldKind, n?: number) => field(kind, n);

/** The board the game comes with: a snake of 48 fields with every kind on it, two rivers, a tunnel. */
function classic(): Board {
  const fields = [
    F('start'), F('shots', 1), F('shots', 2), F('rule'), F('ex'), F('bridge', 0),
    F('give', 2), F('rps'), F('ace'), F('clock', 0), F('waterfall'), F('safe'),
    F('twins'), F('mystery'), F('leader'), F('snus'), F('seats'), F('bridge', 1),
    F('chance'), F('reverse'), F('double'), F('back-bridge'), F('choose'), F('tschick'),
    F('three-six-nine'), F('age', 1), F('duel'), F('silence'), F('mole'), F('roll-again'),
    F('shop'), F('prison'), F('cheek'), F('toilet'), F('give', 5), F('shots', 3),
    F('snail'), F('roll-back'), F('girls'), F('boys'), F('swap-drink'), F('mate'),
    F('hands'), F('clock', 1), F('age', 0), F('ex'), F('tschick'), F('goal'),
  ];
  const cols = 7;
  // The snake five wide, with a free column on either side.
  const spots = layout(fields.length, 5).map((s) => ({ x: s.x + 1, y: s.y }));
  const water: Cell[] = [];
  // A river right across under each bridge.
  for (const y of [1, 5]) for (let x = 0; x < cols; x++) water.push({ x, y });
  // The mole's tunnel: down the right-hand side from field 28 to field 16.
  const tunnels = [8, 7, 6, 5, 4].map((y) => ({ x: 6, y }));
  return { id: 'classic', name: tx('Classic'), theme: 'classic', cols, rows: spots[spots.length - 1].y + 2, fields, spots, water, tunnels };
}

export const BOARDS: Board[] = [classic()];

/** Room for a board of your own. */
export const MAX_COLS = 7;
export const MAX_ROWS = 30;
/** Start, finish and at least this many fields between them. */
export const MIN_FIELDS = 8;

/* ---------- Boards made in the editor ---------- */

const KEY = 'party-boards';

interface Stored {
  id: string;
  name: string;
  cols: number;
  rows: number;
  path: { x: number; y: number; kind: FieldKind; n?: number }[];
  water: [number, number][];
  tunnels: [number, number][];
}

/** Boards saved before they had their own map: the fields of the board the game came with. */
interface StoredOld {
  id: string;
  name: string;
  base: string;
  fields: Field[];
}

const inside = (c: Cell, cols: number, rows: number) => Number.isInteger(c.x) && Number.isInteger(c.y) && c.x >= 0 && c.y >= 0 && c.x < cols && c.y < rows;

/** A board to play as it was saved, or null if it's damaged: its path broken, off the map, too short. */
export function fromStored(raw: unknown): Board | null {
  const s = raw as Partial<Stored & StoredOld> | null;
  if (!s || typeof s.id !== 'string') return null;
  const name = String(s.name || '').slice(0, 40);
  const base = BOARDS[0];
  // Old: the board the game came with, its fields changed.
  if (Array.isArray(s.fields) && !Array.isArray(s.path)) {
    if (s.fields.length !== base.fields.length) return null;
    return check({ ...base, id: s.id, name, custom: true, fields: s.fields });
  }
  const cols = Math.min(MAX_COLS, Math.max(3, Number(s.cols) || 0));
  const rows = Math.min(MAX_ROWS, Math.max(4, Number(s.rows) || 0));
  if (!Array.isArray(s.path)) return null;
  const spots = s.path.map((p) => ({ x: p?.x, y: p?.y }));
  const cells = (list: unknown) => (Array.isArray(list) ? list : []).map((c) => ({ x: (c as number[])[0], y: (c as number[])[1] })).filter((c) => inside(c, cols, rows));
  const fields = s.path.map((p) => ({ kind: p?.kind, n: p?.n }) as Field);
  return check({ id: s.id, name, theme: 'classic', cols, rows, spots, fields, water: cells(s.water), tunnels: cells(s.tunnels), custom: true });
}

/** A board made sound: its path whole, start and finish at its ends, no jump that leads nowhere. */
function check(b: Board): Board | null {
  const seen = new Set<string>();
  for (let i = 0; i < b.spots.length; i++) {
    const c = b.spots[i];
    if (!inside(c, b.cols, b.rows) || seen.has(cellKey(c))) return null;
    seen.add(cellKey(c));
    const p = b.spots[i - 1];
    if (p && Math.abs(p.x - c.x) + Math.abs(p.y - c.y) !== 1) return null;
  }
  if (b.spots.length < MIN_FIELDS || b.fields.length !== b.spots.length) return null;
  const last = b.spots.length - 1;
  const fields = b.fields.map((f, i) => {
    if (i === 0) return field('start');
    if (i === last) return field('goal');
    if (!f || !(f.kind in FIELDS) || f.kind === 'start' || f.kind === 'goal') return field('safe');
    return field(f.kind, f.n);
  });
  // Tunnels run beside the path, not under it.
  const tunnels = b.tunnels.filter((c) => !seen.has(cellKey(c)));
  const board = { ...b, fields, tunnels };
  board.fields = fields.map((f, i) => ((f.kind === 'back-bridge' || f.kind === 'mole') && jumpTarget(board, i, f.kind) == null ? field('safe') : f));
  return board;
}

export function customBoards(): Board[] {
  const raw = load<unknown>(KEY, []);
  return Array.isArray(raw) ? raw.map(fromStored).filter((b): b is Board => !!b) : [];
}

export const toStored = (b: Board): Stored => ({
  id: b.id,
  name: b.name,
  cols: b.cols,
  rows: b.rows,
  path: b.spots.map((c, i) => ({ x: c.x, y: c.y, kind: b.fields[i].kind, ...(b.fields[i].n != null ? { n: b.fields[i].n } : {}) })),
  water: b.water.map((c) => [c.x, c.y]),
  tunnels: b.tunnels.map((c) => [c.x, c.y]),
});

export function saveBoard(b: Board) {
  save(KEY, [...customBoards().filter((x) => x.id !== b.id), b].map(toStored));
}

export function deleteBoard(id: string) {
  save(KEY, customBoards().filter((b) => b.id !== id).map(toStored));
}

export const allBoards = () => [...BOARDS, ...customBoards()];
