/**
 * Number Flip (shut the box): a row of numbered flaps. Roll two dice, then flip down open flaps
 * that add up to the roll. When no open flaps make the roll, the turn is over and the open flaps
 * add up to your score: lowest wins, all shut (0) is perfect.
 */

export type BoardSize = 9 | 12;
/** Normal: any open flaps that add up. Hard: the total's flap, or the two dice's own flaps. */
export type Level = 'normal' | 'hard';
export type Mode = 'classic' | 'tournament' | 'survival' | 'daily' | 'time';

export const MODES: Mode[] = ['classic', 'tournament', 'survival', 'daily', 'time'];
export const LIVES = 3;
/** Time attack: seconds for a whole turn. */
export const TIME_LIMIT = 45;

export const flaps = (size: BoardSize) => Array.from({ length: size }, (_, i) => i + 1);
export const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
export const score = (open: number[]) => sum(open);

/** Every set of open flaps (smallest first) that may be flipped for these dice. */
export function moves(open: number[], dice: number[], level: Level): number[][] {
  const total = sum(dice);
  if (level === 'hard') {
    const out: number[][] = [];
    if (open.includes(total)) out.push([total]);
    // The dice's own flaps: two different numbers, both still open (a double only gives its total).
    if (dice.length === 2 && dice[0] !== dice[1] && open.includes(dice[0]) && open.includes(dice[1])) out.push([...dice].sort((a, b) => a - b));
    return out;
  }
  const sorted = [...open].sort((a, b) => a - b);
  const out: number[][] = [];
  const walk = (from: number, left: number, picked: number[]) => {
    if (left === 0) {
      out.push([...picked]);
      return;
    }
    for (let i = from; i < sorted.length && sorted[i] <= left; i++) {
      picked.push(sorted[i]);
      walk(i + 1, left - sorted[i], picked);
      picked.pop();
    }
  };
  walk(0, total, []);
  return out;
}

export const canMove = (open: number[], dice: number[], level: Level) => moves(open, dice, level).length > 0;

/** Is this pick one of the moves? */
export function isMove(open: number[], dice: number[], level: Level, pick: number[]) {
  const key = [...pick].sort((a, b) => a - b).join(',');
  return moves(open, dice, level).some((m) => m.join(',') === key);
}

/**
 * Could these picked flaps still become a move (some more open flaps would complete one)? Picks that
 * can't are refused at once.
 */
export function canGrow(open: number[], dice: number[], level: Level, pick: number[]) {
  return moves(open, dice, level).some((m) => pick.every((n) => m.includes(n)));
}

/** One die may be rolled once every flap above 6 is down. */
export const oneDieAllowed = (open: number[]) => open.length > 0 && open.every((n) => n <= 6);

/* ---------- Dice: random, or the day's sequence ---------- */

/** A small seeded random (mulberry32): the same seed, the same numbers. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Today as the daily challenge knows it: the phone's own date. */
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The day's dice: everyone playing the daily challenge on this date (and board) gets the same rolls
 * in the same order. Roll `k` is always the same pair; rolling one die takes its first.
 */
export function dailyRolls(date: string, size: BoardSize, count = 40): [number, number][] {
  const rand = seeded(hashString(`${date}:${size}`));
  const die = () => 1 + Math.floor(rand() * 6);
  return Array.from({ length: count }, () => [die(), die()] as [number, number]);
}

export const rollDie = (rand = Math.random) => 1 + Math.floor(rand() * 6);

/* ---------- Rounds and results ---------- */

/** The lowest score(s) win; the highest drink. Everyone level: nobody drinks. */
export function ranking(scores: Record<string, number>) {
  const ids = Object.keys(scores);
  const values = ids.map((id) => scores[id]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  return {
    best: ids.filter((id) => scores[id] === low),
    worst: low === high ? [] : ids.filter((id) => scores[id] === high),
  };
}

/** Survival: after a round, the highest score(s) lose a life (all level: nobody). */
export function loseLives(lives: Record<string, number>, scores: Record<string, number>) {
  const { worst } = ranking(scores);
  return Object.fromEntries(Object.entries(lives).map(([id, n]) => [id, worst.includes(id) ? Math.max(0, n - 1) : n]));
}
