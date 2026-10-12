/**
 * Schweinerei (Pass the Pigs), as a drinking game: throw two little pigs, the way they land
 * scores. Keep throwing to add up the turn, or put the points in the pen. First to 100 wins.
 *
 * How a single pig can land (the names from the German box):
 *   Faule Sau – on its side, the dot up or down · Suhle – on its back (5) · Haxe – standing (5)
 *   Schnauze – on its snout (10) · Backe – on snout and ear (15)
 *
 * - Both on the same side: "Sau", 1 point. On different sides ("Faule Sau"): the turn's points
 *   are gone.
 * - Otherwise the two count together ("Gemischtes Doppel"), a pig on its side counting 0.
 *   Both the same is a double and counts four times: Volle Suhle 20, Doppelhaxe 20,
 *   Volle Schnauze 40, Doppelbacke 60.
 * - The pigs touch ("Sauhaufen", 1 throw in 100): every point the player ever collected is gone.
 *   One on top of the other ("Schweinerei"): the same, and drink up.
 * - Bonus throw: every turn has a target, e.g. 3 × Suhle. Reach it within the turn (counting
 *   pigs over all throws of the turn) and its bonus is added.
 * Drinks: a Faule Sau costs a sip, a Sauhaufen 2, a double gives sips out.
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

type Scoring = Exclude<Pose, 'side' | 'side-dot'>;
export const VALUE: Record<Scoring, number> = { back: 5, standing: 5, snout: 10, jowl: 15 };
/** Sips a double gives out. */
const DOUBLE_GIVES: Record<Scoring, number> = { back: 2, standing: 2, snout: 4, jowl: 6 };

export const isSide = (p: Pose) => p === 'side' || p === 'side-dot';
const value = (p: Pose) => (isSide(p) ? 0 : VALUE[p as Scoring]);

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
  if (a === b) return { kind: 'score', pigs: [a, b], points: value(a) * 4, double: true, gives: DOUBLE_GIVES[a as Scoring] };
  return { kind: 'score', pigs: [a, b], points: value(a) + value(b), double: false, gives: 0 };
}

export function throwPigs(rand: () => number = Math.random): Throw {
  const r = rand();
  if (r < PIGGYBACK_ODDS) return { kind: 'piggyback' };
  if (r < PIGGYBACK_ODDS + TOUCH_ODDS) return { kind: 'touch' };
  return score(rollPose(rand), rollPose(rand));
}

/** The bonus throw targets: so many pigs in these poses within one turn earn the bonus. */
export interface Bonus {
  count: number;
  poses: Pose[];
  points: number;
}

export const BONUSES: Bonus[] = [
  { count: 4, poses: ['side', 'side-dot'], points: 5 },
  { count: 3, poses: ['back'], points: 10 },
  { count: 3, poses: ['standing'], points: 10 },
  { count: 8, poses: ['side', 'side-dot'], points: 10 },
  { count: 4, poses: ['standing', 'back'], points: 15 },
  { count: 2, poses: ['snout'], points: 15 },
  { count: 3, poses: ['snout'], points: 25 },
  { count: 2, poses: ['jowl'], points: 25 },
];

export interface Game {
  scores: number[];
  turn: number;
  /** Points thrown this turn, not in the pen yet. */
  turnPts: number;
  /** The last throw of this turn (null before the first). */
  last: Throw | null;
  /** The turn is over (Faule Sau, Sauhaufen, Schweinerei): waiting for "next player". */
  ended: boolean;
  winner: number | null;
  /** This turn's bonus target (index into BONUSES), how many pigs count towards it, and whether it paid out. */
  bonus: { target: number; count: number; won: boolean };
  /** The last throw just reached the bonus. */
  bonusNow: boolean;
}

const newBonus = (rand: () => number = Math.random) => ({ target: Math.floor(rand() * BONUSES.length), count: 0, won: false });

export function newGame(players: number, starter: number, rand: () => number = Math.random): Game {
  return { scores: Array(players).fill(0), turn: starter, turnPts: 0, last: null, ended: false, winner: null, bonus: newBonus(rand), bonusNow: false };
}

/** Throw the pigs. */
export function play(g: Game, t: Throw): Game {
  if (g.ended || g.winner != null) return g;
  if (t.kind === 'score') {
    // Towards the bonus: every pig in one of its poses counts.
    const b = BONUSES[g.bonus.target];
    const count = g.bonus.count + t.pigs.filter((p) => b.poses.includes(p)).length;
    const bonusNow = !g.bonus.won && count >= b.count;
    const turnPts = g.turnPts + t.points + (bonusNow ? b.points : 0);
    const bonus = { ...g.bonus, count, won: g.bonus.won || bonusNow };
    // Reaching 100 wins right away.
    if (g.scores[g.turn] + turnPts >= TARGET) {
      const scores = g.scores.map((s, i) => (i === g.turn ? s + turnPts : s));
      return { ...g, scores, turnPts: 0, last: t, winner: g.turn, bonus, bonusNow };
    }
    return { ...g, turnPts, last: t, bonus, bonusNow };
  }
  if (t.kind === 'pig-out') return { ...g, turnPts: 0, last: t, ended: true, bonusNow: false };
  // Sauhaufen or Schweinerei: everything this player had is gone.
  const scores = g.scores.map((s, i) => (i === g.turn ? 0 : s));
  return { ...g, scores, turnPts: 0, last: t, ended: true, bonusNow: false };
}

/** Put the turn's points in the pen and hand on. */
export function bank(g: Game, rand: () => number = Math.random): Game {
  if (g.ended || g.winner != null || g.turnPts === 0) return g;
  const scores = g.scores.map((s, i) => (i === g.turn ? s + g.turnPts : s));
  return { ...g, scores, turnPts: 0, last: null, turn: (g.turn + 1) % g.scores.length, bonus: newBonus(rand), bonusNow: false };
}

/** After a turn that went wrong: the next player. */
export function nextPlayer(g: Game, rand: () => number = Math.random): Game {
  if (!g.ended) return g;
  return { ...g, turnPts: 0, last: null, ended: false, turn: (g.turn + 1) % g.scores.length, bonus: newBonus(rand), bonusNow: false };
}

/** At the end: everyone else drinks a sip for every 10 points they're short (at least 1). */
export const loserSips = (score: number) => Math.max(1, Math.ceil((TARGET - score) / 10));

export const randomStarter = (players: number) => randomInt(0, players - 1);
