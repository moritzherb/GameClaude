/**
 * Schweinerei (Pass the Pigs), as a drinking game: throw two little pigs, the way they land
 * scores. Keep throwing to add up the turn, or put the points in the pen. First to 100 wins.
 *
 * - Both on the same side: 1 point. On different sides ("Pig out"): the turn's points are gone.
 * - One pig on its side counts the other one: on its back 5, standing 5, on its snout 10,
 *   on snout and ear 15. Both the same: a double (20, 20, 40, 60). Two different ones: added up.
 * - The pigs touch in any way (1 throw in 100): every point you ever collected is gone. One on top of the other (piggyback): all points gone, drink up.
 * Drinks: a pig out costs a sip, touching pigs 2, a double gives sips out.
 */
import { randomInt } from '../../lib/random';

export type Pose = 'side-dot' | 'side' | 'back' | 'standing' | 'snout' | 'jowl';

/** How often a single pig lands each way (measured with real pigs, about 11,000 throws). */
export const POSE_ODDS: [Pose, number][] = [
  ['side', 0.349],
  ['side-dot', 0.302],
  ['back', 0.224],
  ['standing', 0.088],
  ['snout', 0.03],
  ['jowl', 0.0061],
];

/** Both pigs touching (1 in 100 throws), and one on top of the other, per throw. */
export const TOUCH_ODDS = 0.01;
export const PIGGYBACK_ODDS = 0.002;

export const TARGET = 100;

const VALUE: Record<Exclude<Pose, 'side' | 'side-dot'>, number> = { back: 5, standing: 5, snout: 10, jowl: 15 };
/** Sips a double gives out. */
const DOUBLE_GIVES: Record<keyof typeof VALUE, number> = { back: 2, standing: 2, snout: 4, jowl: 6 };

export const isSide = (p: Pose) => p === 'side' || p === 'side-dot';

export type Throw =
  | { kind: 'score'; pigs: [Pose, Pose]; points: number; double: boolean; gives: number }
  | { kind: 'pig-out'; pigs: [Pose, Pose] }
  | { kind: 'touch' }
  | { kind: 'piggyback' };

export function rollPose(rand: () => number = Math.random): Pose {
  const total = POSE_ODDS.reduce((a, [, p]) => a + p, 0);
  let x = rand() * total;
  for (const [pose, p] of POSE_ODDS) {
    if ((x -= p) < 0) return pose;
  }
  return 'side';
}

/** What two pigs score. */
export function score(a: Pose, b: Pose): Throw {
  if (isSide(a) && isSide(b)) return a === b ? { kind: 'score', pigs: [a, b], points: 1, double: false, gives: 0 } : { kind: 'pig-out', pigs: [a, b] };
  if (isSide(a)) return { kind: 'score', pigs: [a, b], points: VALUE[b as keyof typeof VALUE], double: false, gives: 0 };
  if (isSide(b)) return { kind: 'score', pigs: [a, b], points: VALUE[a as keyof typeof VALUE], double: false, gives: 0 };
  const va = a as keyof typeof VALUE;
  const vb = b as keyof typeof VALUE;
  if (va === vb) return { kind: 'score', pigs: [a, b], points: VALUE[va] * 4, double: true, gives: DOUBLE_GIVES[va] };
  return { kind: 'score', pigs: [a, b], points: VALUE[va] + VALUE[vb], double: false, gives: 0 };
}

export function throwPigs(rand: () => number = Math.random): Throw {
  const r = rand();
  if (r < PIGGYBACK_ODDS) return { kind: 'piggyback' };
  if (r < PIGGYBACK_ODDS + TOUCH_ODDS) return { kind: 'touch' };
  return score(rollPose(rand), rollPose(rand));
}

export interface Game {
  scores: number[];
  turn: number;
  /** Points thrown this turn, not in the pen yet. */
  turnPts: number;
  /** The last throw of this turn (null before the first). */
  last: Throw | null;
  /** The turn is over (pig out, touching, piggyback): waiting for "next player". */
  ended: boolean;
  winner: number | null;
}

export function newGame(players: number, starter: number): Game {
  return { scores: Array(players).fill(0), turn: starter, turnPts: 0, last: null, ended: false, winner: null };
}

/** Throw the pigs. */
export function play(g: Game, t: Throw): Game {
  if (g.ended || g.winner != null) return g;
  if (t.kind === 'score') {
    const turnPts = g.turnPts + t.points;
    // Reaching 100 wins right away.
    if (g.scores[g.turn] + turnPts >= TARGET) {
      const scores = g.scores.map((s, i) => (i === g.turn ? s + turnPts : s));
      return { ...g, scores, turnPts: 0, last: t, winner: g.turn };
    }
    return { ...g, turnPts, last: t };
  }
  if (t.kind === 'pig-out') return { ...g, turnPts: 0, last: t, ended: true };
  // Touching or piggyback: everything this player had is gone.
  const scores = g.scores.map((s, i) => (i === g.turn ? 0 : s));
  return { ...g, scores, turnPts: 0, last: t, ended: true };
}

/** Put the turn's points in the pen and hand on. */
export function bank(g: Game): Game {
  if (g.ended || g.winner != null || g.turnPts === 0) return g;
  const scores = g.scores.map((s, i) => (i === g.turn ? s + g.turnPts : s));
  return { ...g, scores, turnPts: 0, last: null, turn: (g.turn + 1) % g.scores.length };
}

/** After a turn that went wrong: the next player. */
export function nextPlayer(g: Game): Game {
  if (!g.ended) return g;
  return { ...g, turnPts: 0, last: null, ended: false, turn: (g.turn + 1) % g.scores.length };
}

/** At the end: everyone else drinks a sip for every 10 points they're short (at least 1). */
export const loserSips = (score: number) => Math.max(1, Math.ceil((TARGET - score) / 10));

export const randomStarter = (players: number) => randomInt(0, players - 1);
