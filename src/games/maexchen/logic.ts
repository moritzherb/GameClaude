/**
 * Mäxchen: two dice under a cup, read with the higher die first (6 and 3 → 63).
 *
 * - From low to high: 31, 32, 41 … 65, then the doubles 11 … 66, and the Mäxchen (21) beats everything.
 * - Shake, look under the cup (or not) and announce a value: it has to beat the one before,
 *   and it may be a lie. Then the cup goes to the next player.
 * - They believe it (and shake again, announcing higher still) or lift the cup:
 *   at least what was announced → the one who lifted drinks; less → the liar drinks.
 * - House rule: once you've looked you may shake one more time, blind: no more looking then.
 * - A Mäxchen can't be beaten: the next player has to lift the cup (2 sips for whoever is wrong).
 */
import { randomInt } from '../../lib/random';

export type Dice = [number, number];

/** Every value, from lowest to highest. */
export const VALUES = [31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65, 11, 22, 33, 44, 55, 66, 21] as const;
export type Value = (typeof VALUES)[number];
export const MAEXCHEN: Value = 21;

/** The value two dice show: the higher die first. */
export function valueOf([a, b]: Dice): Value {
  return (Math.max(a, b) * 10 + Math.min(a, b)) as Value;
}

/** Position from low (0) to high: compare values with this, not with < on the numbers. */
export const rank = (v: Value) => VALUES.indexOf(v);

export const beats = (a: Value, b: Value) => rank(a) > rank(b);

export const isDouble = (v: Value) => v % 11 === 0;

/** The values you may announce after this one (everything above it). */
export const allowedAfter = (prev: Value | null): Value[] => (prev == null ? [...VALUES] : VALUES.filter((v) => beats(v, prev)));

export const rollDice = (rand: () => number = Math.random): Dice => [1 + Math.floor(rand() * 6), 1 + Math.floor(rand() * 6)];

export interface Round {
  /** Whose turn it is (index into the players). */
  turn: number;
  dice: Dice;
  /** What the player before announced (what has to be beaten), null at the start of a round. */
  claim: { by: number; value: Value } | null;
  phase: 'shake' | 'look' | 'pass' | 'reveal';
  /** Looked under the cup this turn. */
  peeked: boolean;
  /** Shook once more after looking: blind now. */
  blind: boolean;
  /** Set once the cup was lifted. */
  verdict: Verdict | null;
}

export interface Verdict {
  /** The dice really showed at least the announced value. */
  truth: boolean;
  loser: number;
  sips: number;
}

export function newRound(starter: number): Round {
  return { turn: starter, dice: [1, 1], claim: null, phase: 'shake', peeked: false, blind: false, verdict: null };
}

/** Shake the cup (at the start of a turn, or once more blind after looking). */
export function shake(r: Round, rand: () => number = Math.random): Round {
  if (r.phase === 'shake') return { ...r, dice: rollDice(rand), phase: 'look', peeked: false, blind: false };
  if (r.phase === 'look' && r.peeked && !r.blind) return { ...r, dice: rollDice(rand), blind: true };
  return r;
}

export function peek(r: Round): Round {
  return r.phase === 'look' && !r.blind && !r.peeked ? { ...r, peeked: true } : r;
}

/** Announce a value (higher than the last one) and pass the cup on. */
export function announce(r: Round, value: Value): Round {
  if (r.phase !== 'look' || (r.claim && !beats(value, r.claim.value))) return r;
  return { ...r, claim: { by: r.turn, value }, phase: 'pass' };
}

/** The next player believes it: their turn to shake (not after a Mäxchen: that has to be lifted). */
export function believe(r: Round, players: number): Round {
  if (r.phase !== 'pass' || !r.claim) return r;
  // Nothing beats a Mäxchen: it has to be lifted.
  if (r.claim.value === MAEXCHEN) return r;
  return { ...r, turn: (r.turn + 1) % players, phase: 'shake', peeked: false, blind: false };
}

/** The next player lifts the cup. */
export function reveal(r: Round, players: number): Round {
  if (r.phase !== 'pass' || !r.claim) return r;
  const lifter = (r.turn + 1) % players;
  const truth = !beats(r.claim.value, valueOf(r.dice));
  const sips = r.claim.value === MAEXCHEN ? 2 : 1;
  return { ...r, turn: lifter, phase: 'reveal', verdict: { truth, loser: truth ? lifter : r.claim.by, sips } };
}

/** Pick a random starter. */
export const randomStarter = (players: number) => randomInt(0, players - 1);
