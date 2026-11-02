import { tx } from '../../i18n';
import { load, save } from '../../lib/storage';
import { field, FIELDS, type Field, type FieldKind } from './fields';

/** Where a field lies on the board, in field widths: x across, y away from the start. */
export interface Spot {
  x: number;
  y: number;
  /** The one field between two rows (where a river can run). */
  link: boolean;
}

/**
 * The path as a snake: a row across, one field up at its end, the next row back the other way, and
 * so on, away from the start.
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

/**
 * Where a bridge back or the mole's tunnel on field `i` takes you, or null if there's nowhere to go
 * from there. A bridge crosses the water to the field right across it in the row before (with
 * nothing but water between them); the tunnel goes under the board to the field straight back
 * a few rows (the nearest at least three rows back, else two).
 */
export function jumpTarget(spots: Spot[], i: number, kind: FieldKind): number | null {
  const s = spots[i];
  if (!s) return null;
  const at = (x: number, y: number) => spots.findIndex((p) => p.x === x && p.y === y);
  if (kind === 'back-bridge') {
    if (s.link || at(s.x, s.y - 1) >= 0) return null;
    const j = at(s.x, s.y - 2);
    return j >= 0 ? j : null;
  }
  if (kind === 'mole') {
    for (let y = s.y - 3; y >= 0; y--) {
      const j = at(s.x, y);
      if (j >= 0) return j;
    }
    const j = at(s.x, s.y - 2);
    return j >= 0 && j < i - 1 ? j : null;
  }
  return null;
}

/** Every bridge back and tunnel on a board: field → where it takes you. */
export function jumps(fields: Field[], cols: number): Record<number, number> {
  const spots = layout(fields.length, cols);
  const out: Record<number, number> = {};
  fields.forEach((f, i) => {
    const to = jumpTarget(spots, i, f.kind);
    if (to != null) out[i] = to;
  });
  return out;
}

export type ThemeId = 'west' | 'beach' | 'classic';

export interface Theme {
  /** The board's colour near the start and far away at the finish. */
  near: string;
  far: string;
  /** Things standing around on the board. */
  decor: string[];
  river: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  west: { near: '#f3cf8a', far: '#e58f52', decor: ['🌵', '🌵', '💀', '🐎', '🪨', '🌵', '🦂', '🤠'], river: '#4aa3d8' },
  beach: { near: '#f7e2a6', far: '#8fd3ef', decor: ['🌴', '🍹', '🐚', '⛱️', '🦀', '🌴', '🏐', '🍉'], river: '#3fb7e0' },
  classic: { near: '#f1ebdf', far: '#d9cdf2', decor: ['🎲', '🍾', '🥂', '🎉', '🍻', '🪩'], river: '#5aa7e6' },
};

export interface Board {
  id: string;
  /** English for the boards that come with the app (render with t()); a custom board's own name. */
  name: string;
  theme: ThemeId;
  cols: number;
  fields: Field[];
  /** Made in the editor (from the board `base`). */
  custom?: boolean;
  base?: string;
}

const F = (kind: FieldKind, n?: number) => field(kind, n);

export const BOARDS: Board[] = [
  {
    id: 'west',
    name: tx('Wild West'),
    theme: 'west',
    cols: 5,
    fields: [
      F('start'), F('shots', 1), F('shots', 2), F('rule'), F('ex'), F('bridge', 0),
      F('give', 2), F('rps'), F('ace'), F('clock', 0), F('waterfall'), F('safe'),
      F('twins'), F('mystery'), F('leader'), F('snus'), F('seats'), F('bridge', 1),
      F('chance'), F('reverse'), F('double'), F('back-bridge'), F('choose'), F('tschick'),
      F('three-six-nine'), F('age', 1), F('duel'), F('mole'), F('silence'), F('roll-again'),
      F('shop'), F('prison'), F('cheek'), F('toilet'), F('give', 5), F('shots', 3),
      F('snail'), F('roll-back'), F('girls'), F('boys'), F('swap-drink'), F('mate'),
      F('hands'), F('clock', 1), F('age', 0), F('ex'), F('tschick'), F('goal'),
    ],
  },
  {
    id: 'beach',
    name: tx('Beach Party'),
    theme: 'beach',
    cols: 5,
    fields: [
      F('start'), F('shots', 1), F('shots', 2), F('give', 2), F('rule'), F('ex'),
      F('boys'), F('mate'), F('waterfall'), F('swap-drink'), F('choose'), F('bridge', 1),
      F('girls'), F('chance'), F('tschick'), F('leader'), F('mole'), F('safe'),
      F('snus'), F('shots', 3), F('three-six-nine'), F('twins'), F('back-bridge'), F('ace'),
      F('mystery'), F('hands'), F('silence'), F('duel'), F('roll-again'), F('prison'),
      F('shop'), F('clock', 1), F('seats'), F('give', 5), F('snail'), F('bridge', 0),
      F('double'), F('toilet'), F('cheek'), F('roll-back'), F('shots', 2), F('goal'),
    ],
  },
  {
    id: 'classic',
    name: tx('Classic'),
    theme: 'classic',
    cols: 4,
    fields: [
      F('start'), F('give', 2), F('rps'), F('shots', 1), F('safe'),
      F('toilet'), F('clock', 0), F('ace'), F('girls'), F('roll-again'),
      F('boys'), F('rule'), F('age', 0), F('back-bridge'), F('snail'),
      F('mate'), F('leader'), F('waterfall'), F('three-six-nine'), F('prison'),
      F('give', 5), F('reverse'), F('ex'), F('hands'), F('bridge', 0),
      F('shots', 2), F('duel'), F('silence'), F('roll-back'), F('safe'),
      F('mystery'), F('age', 1), F('chance'), F('swap-drink'), F('shots', 1), F('goal'),
    ],
  },
];

/* ---------- Boards made in the editor ---------- */

const KEY = 'party-boards';

interface Stored {
  id: string;
  name: string;
  base: string;
  fields: Field[];
}

/** A stored board as it can be played: on its base board's path, start and finish where they belong. */
function fromStored(s: Stored): Board | null {
  const base = BOARDS.find((b) => b.id === s.base);
  if (!base || typeof s.id !== 'string' || !Array.isArray(s.fields) || s.fields.length !== base.fields.length) return null;
  const spots = layout(base.fields.length, base.cols);
  const fields = s.fields.map((f, i) => {
    if (i === 0) return field('start');
    if (i === base.fields.length - 1) return field('goal');
    if (!f || !(f.kind in FIELDS) || f.kind === 'start' || f.kind === 'goal') return field('safe');
    // A bridge back or a tunnel where there's nowhere to go (boards saved before they had to lead somewhere).
    if ((f.kind === 'back-bridge' || f.kind === 'mole') && jumpTarget(spots, i, f.kind) == null) return field('safe');
    return field(f.kind, f.n);
  });
  return { id: s.id, name: String(s.name || '').slice(0, 40), theme: base.theme, cols: base.cols, fields, custom: true, base: base.id };
}

export function customBoards(): Board[] {
  const raw = load<unknown>(KEY, []);
  return Array.isArray(raw) ? raw.map((s) => fromStored(s as Stored)).filter((b): b is Board => !!b) : [];
}

const toStored = (b: Board): Stored => ({ id: b.id, name: b.name, base: b.base ?? b.id, fields: b.fields });

export function saveBoard(b: Board) {
  save(KEY, [...customBoards().filter((x) => x.id !== b.id), b].map(toStored));
}

export function deleteBoard(id: string) {
  save(KEY, customBoards().filter((b) => b.id !== id).map(toStored));
}

export const allBoards = () => [...BOARDS, ...customBoards()];
