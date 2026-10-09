/** A die face: 9, 10, J (11), Q (12), K (13), A (14). */
export type Face = 9 | 10 | 11 | 12 | 13 | 14;

export const FACES: Face[] = [9, 10, 11, 12, 13, 14];
export const DICE = 5;
/** You win with exactly this many points; going over loses the turn. */
export const TARGET = 5000;
/** Your first points must come in one turn of at least this much. */
export const ENTRY = 500;
/** A first roll without points costs this much (once you're in). */
export const PENALTY = 300;

/** Only Kings and Aces count on their own. */
const SINGLE: Partial<Record<Face, number>> = { 13: 50, 14: 100 };
/** Three of a kind in one roll. */
export const TRIPLE: Record<Face, number> = { 9: 100, 10: 200, 11: 300, 12: 400, 13: 500, 14: 1000 };

/**
 * Points for dice set aside together from one roll, or null if one of them doesn't score.
 * Three of a kind counts as a triple, Kings and Aces beyond that count on their own.
 */
export function score(faces: Face[]): number | null {
  let total = 0;
  for (const f of FACES) {
    let n = faces.filter((x) => x === f).length;
    if (n >= 3) {
      total += TRIPLE[f];
      n -= 3;
    }
    if (n > 0) {
      const single = SINGLE[f];
      if (!single) return null;
      total += n * single;
    }
  }
  return total;
}

/** Faces in a roll that make up a triple. */
export const triples = (roll: Face[]) => FACES.filter((f) => roll.filter((x) => x === f).length >= 3);

/** Does anything in this roll score (a King, an Ace or three of a kind)? */
export const scores = (roll: Face[]) => roll.some((f) => SINGLE[f]) || triples(roll).length > 0;

/** The least you could set aside from this roll (a single King, Ace or a triple). */
export function minGain(roll: Face[]) {
  const options = [...roll.filter((f) => SINGLE[f]).map((f) => SINGLE[f]!), ...triples(roll).map((f) => TRIPLE[f])];
  return options.length ? Math.min(...options) : 0;
}

export interface Turn {
  /** Dice in the cup, ready for the next roll. */
  cup: number;
  /** The dice on the table from the last roll. */
  roll: Face[];
  /** Dice set aside since the cup was last full. */
  aside: Face[];
  /** Points collected this turn. */
  points: number;
  rolls: number;
}

export type Phase = 'roll' | 'choose' | 'over';

export type TurnEnd =
  | { kind: 'nothing'; lost: number; penalty: number }
  | { kind: 'too-much'; lost: number }
  | { kind: 'banked'; gained: number }
  | { kind: 'won' };

export interface Game {
  scores: number[];
  /** Has made the 500 to get in. */
  opened: boolean[];
  current: number;
  turn: Turn;
  phase: Phase;
  /** How the turn ended (phase 'over'). */
  end: TurnEnd | null;
}

const freshTurn = (): Turn => ({ cup: DICE, roll: [], aside: [], points: 0, rolls: 0 });

export function newGame(players: number, starter: number): Game {
  return {
    scores: Array<number>(players).fill(0),
    opened: Array<boolean>(players).fill(false),
    current: starter,
    turn: freshTurn(),
    phase: 'roll',
    end: null,
  };
}

const randomFace = (rand: () => number) => FACES[Math.floor(rand() * FACES.length)];

/** Shake the cup and roll whatever is in it. */
export function roll(g: Game, rand: () => number = Math.random): Game {
  if (g.phase !== 'roll') return g;
  const faces = Array.from({ length: g.turn.cup }, () => randomFace(rand));
  const turn = { ...g.turn, roll: faces, cup: 0, rolls: g.turn.rolls + 1 };
  const me = g.current;
  if (!scores(faces)) {
    // Nothing: the turn's points are gone. On the very first roll it also costs 300, once you're in.
    const penalty = turn.rolls === 1 && g.opened[me] ? Math.min(PENALTY, g.scores[me]) : 0;
    return {
      ...g,
      turn,
      phase: 'over',
      scores: g.scores.map((s, i) => (i === me ? s - penalty : s)),
      end: { kind: 'nothing', lost: g.turn.points, penalty },
    };
  }
  // Even the smallest thing to set aside would go past 5000.
  if (g.scores[me] + g.turn.points + minGain(faces) > TARGET) {
    return { ...g, turn, phase: 'over', end: { kind: 'too-much', lost: g.turn.points } };
  }
  return { ...g, turn, phase: 'choose' };
}

/** Points for setting aside these dice (indexes into the roll), or null if that isn't allowed. */
export function gainFor(g: Game, picked: number[]): number | null {
  if (g.phase !== 'choose' || !picked.length) return null;
  const gain = score(picked.map((i) => g.turn.roll[i]));
  return gain ? gain : null;
}

/** Would setting these aside go past 5000? */
export const tooMuch = (g: Game, gain: number) => g.scores[g.current] + g.turn.points + gain > TARGET;

/** You can only bank once you're in, or with at least 500 in this turn. */
export const canStop = (g: Game, points: number) => g.opened[g.current] || points >= ENTRY;

/**
 * Sets the picked dice aside, then rolls the rest (or all five again, if every die scored)
 * or banks the turn. Hitting exactly 5000 wins right away.
 */
export function setAside(g: Game, picked: number[], then: 'roll' | 'stop', rand: () => number = Math.random): Game {
  const gain = gainFor(g, picked);
  if (gain == null || tooMuch(g, gain)) return g;
  const me = g.current;
  const points = g.turn.points + gain;
  const left = g.turn.roll.filter((_, i) => !picked.includes(i)).length;
  const aside = [...g.turn.aside, ...picked.map((i) => g.turn.roll[i])];
  const hot = left === 0;
  const turn: Turn = { ...g.turn, points, cup: hot ? DICE : left, aside: hot ? [] : aside, roll: hot ? [] : g.turn.roll };

  if (g.scores[me] + points === TARGET) {
    return { ...g, turn: { ...turn, aside }, phase: 'over', scores: g.scores.map((s, i) => (i === me ? TARGET : s)), end: { kind: 'won' } };
  }
  if (then === 'stop') {
    if (!canStop(g, points)) return g;
    return {
      ...g,
      turn: { ...turn, aside },
      phase: 'over',
      scores: g.scores.map((s, i) => (i === me ? s + points : s)),
      opened: g.opened.map((o, i) => o || i === me),
      end: { kind: 'banked', gained: points },
    };
  }
  return roll({ ...g, turn, phase: 'roll' }, rand);
}

/** On to the next player on the left. */
export function nextTurn(g: Game): Game {
  if (g.phase !== 'over' || g.end?.kind === 'won') return g;
  return { ...g, current: (g.current + 1) % g.scores.length, turn: freshTurn(), phase: 'roll', end: null };
}
