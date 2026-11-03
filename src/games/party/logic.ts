import type { Field } from './fields';

/** A player's pawn on the board. */
export interface Pawn {
  /** The field it stands on (0 = start). */
  pos: number;
  /** In prison: only a 6 gets it out. */
  jailed: boolean;
  /** At a bridge, waiting to cross it. */
  gate: boolean;
  /** Over the bridge it stands on (at its far end, about to roll on). */
  crossed?: boolean;
  /** Aces up the sleeve, each good for skipping one field. */
  aces: number;
}

export interface Game {
  fields: Field[];
  /** Player ids in seating order: the next one sits on your right. */
  order: string[];
  /** Which way play goes round the table (a Reverse field turns it). */
  dir: 1 | -1;
  /** Whose turn it is: an index into `order`. */
  turn: number;
  pawns: Record<string, Pawn>;
  /** Rules set on the way (in play for the rest of the game). */
  rules: string[];
  mates: [string, string][];
  /** Silence, called by this player: nobody talks until it's their turn again. */
  silence: string | null;
  winner: string | null;
}

export function newGame(fields: Field[], ids: string[]): Game {
  return {
    fields,
    order: [...ids],
    dir: 1,
    turn: 0,
    pawns: Object.fromEntries(ids.map((id) => [id, { pos: 0, jailed: false, gate: false, aces: 0 }])),
    rules: [],
    mates: [],
    silence: null,
    winner: null,
  };
}

export const finish = (g: Pick<Game, 'fields'>) => g.fields.length - 1;
export const current = (g: Game) => g.order[g.turn];

/**
 * Forward by a roll, as the fields the pawn steps on one by one. A bridge stops it (it has to be
 * crossed first). Only the exact number gets it into the finish: past it, the pawn walks the rest
 * back.
 */
export function walk(fields: Field[], from: number, steps: number): number[] {
  const last = fields.length - 1;
  const out: number[] = [];
  let pos = from;
  let dir = 1;
  for (let i = 0; i < steps; i++) {
    if (pos === last) dir = -1;
    pos += dir;
    out.push(pos);
    if (dir === 1 && fields[pos].kind === 'bridge') break;
  }
  return out;
}

/** Back by a roll, field by field, no further than the start. */
export function walkBack(from: number, steps: number): number[] {
  const out: number[] = [];
  for (let pos = from - 1; pos >= Math.max(0, from - steps); pos--) out.push(pos);
  return out;
}

export function setPawn(g: Game, id: string, pawn: Partial<Pawn>): Game {
  return { ...g, pawns: { ...g.pawns, [id]: { ...g.pawns[id], ...pawn } } };
}

/** The player on someone's right: the next seat round the table (whichever way play goes). */
export function rightOf(g: Game, id: string) {
  return g.order[(g.order.indexOf(id) + 1) % g.order.length];
}

/** Everyone in turn order, starting with `from`. */
export function inTurnOrder(g: Game, from: string): string[] {
  const n = g.order.length;
  const i = g.order.indexOf(from);
  return Array.from({ length: n }, (_, k) => g.order[(((i + k * g.dir) % n) + n) % n]);
}

/** On to the next player. Silence ends when its caller is on again. */
export function nextTurn(g: Game): Game {
  const n = g.order.length;
  const turn = (((g.turn + g.dir) % n) + n) % n;
  return { ...g, turn, silence: g.silence === g.order[turn] ? null : g.silence };
}

export const reverse = (g: Game): Game => ({ ...g, dir: g.dir === 1 ? -1 : 1 });

/**
 * Swap seats with the player on the right: the order of play changes with it. Play goes on from the
 * lander's new seat, so the one they swapped with has had their turn this round.
 */
export function swapSeats(g: Game, id: string): Game {
  const i = g.order.indexOf(id);
  const j = (i + 1) % g.order.length;
  const order = [...g.order];
  [order[i], order[j]] = [order[j], order[i]];
  return { ...g, order, turn: j };
}

/** Whoever is furthest along (all of them if several are level). */
export function leaders(g: Game): string[] {
  const top = Math.max(...g.order.map((id) => g.pawns[id].pos));
  return g.order.filter((id) => g.pawns[id].pos === top);
}

/** Whoever is furthest behind. */
export function trailers(g: Game): string[] {
  const low = Math.min(...g.order.map((id) => g.pawns[id].pos));
  return g.order.filter((id) => g.pawns[id].pos === low);
}

export const rollDie = (rand = Math.random) => 1 + Math.floor(rand() * 6);

/* ---------- Tschick flip ---------- */

/** How the pack lands: flat (1 sip), on its side (2), upright (3). */
export type Toss = 1 | 2 | 3;

export function tossPack(rand = Math.random): Toss {
  const r = rand();
  return r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
}

/** A throw keeps up when it's as good as the one before or better. */
export const keepsUp = (before: Toss | null, toss: Toss) => before == null || toss >= before;

/* ---------- Dice duel ---------- */

/** Two rolls: the lower one drinks both added up; the same rolls again (and doesn't count). */
export function duel(a: number, b: number): { loser: 0 | 1; sips: number } | null {
  if (a === b) return null;
  return { loser: a < b ? 0 : 1, sips: a + b };
}

/** The clock: an odd number of minutes right now? */
export const oddMinutes = (now: Date) => now.getMinutes() % 2 === 1;
