/**
 * The two voting games (Princess/King Treatment, He's a 10/10 but…): everyone votes in secret on
 * one phone that goes round, then the phone shows who voted what and who drinks.
 */

/** The ones who vote against everyone else drink this much. */
export const MINORITY_SIPS = 2;
/** A tie: everyone drinks this much. */
export const TIE_SIPS = 1;
/** Furthest from the average (He's a 10 but…) drinks this much. */
export const FURTHEST_SIPS = 2;

export type Verdict =
  /** Everyone voted the same: nobody drinks. */
  | { kind: 'agreed' }
  /** As many on one side as on the other: everyone drinks. */
  | { kind: 'tie' }
  /** The smaller side drinks. */
  | { kind: 'minority'; losers: string[] };

/** Two options, a vote per player id: who's on the smaller side. */
export function minority<V extends string>(votes: Record<string, V>, options: readonly [V, V]): Verdict {
  const [a, b] = options.map((o) => Object.keys(votes).filter((id) => votes[id] === o));
  if (!a.length || !b.length) return { kind: 'agreed' };
  if (a.length === b.length) return { kind: 'tie' };
  return { kind: 'minority', losers: a.length < b.length ? a : b };
}

export interface Rating {
  average: number;
  /** Furthest from the average (everyone equally far, when it's a tie); empty when everyone agreed. */
  furthest: string[];
}

/** Numbers from 0 to 10 per player id: the average, and who's furthest from it. */
export function rating(scores: Record<string, number>): Rating {
  const ids = Object.keys(scores);
  if (!ids.length) return { average: 0, furthest: [] };
  const average = ids.reduce((sum, id) => sum + scores[id], 0) / ids.length;
  const off = (id: string) => Math.abs(scores[id] - average);
  const most = Math.max(...ids.map(off));
  // Everyone gave the same number: nobody is off.
  if (most < 1e-9) return { average, furthest: [] };
  return { average, furthest: ids.filter((id) => most - off(id) < 1e-9) };
}

/** Sips per player id for a verdict (for the tally at the end). */
export function sipsFor(verdict: Verdict, ids: string[]): Record<string, number> {
  if (verdict.kind === 'tie') return Object.fromEntries(ids.map((id) => [id, TIE_SIPS]));
  if (verdict.kind === 'minority') return Object.fromEntries(verdict.losers.map((id) => [id, MINORITY_SIPS]));
  return {};
}

/** Adds sips to a running tally. */
export function addSips(tally: Record<string, number>, sips: Record<string, number>): Record<string, number> {
  const out = { ...tally };
  for (const [id, n] of Object.entries(sips)) out[id] = (out[id] ?? 0) + n;
  return out;
}

/** The players in voting order: the one who read the card out first, then round the table. */
export function fromReader<T>(players: readonly T[], reader: number): T[] {
  const n = players.length;
  return players.map((_, i) => players[(reader + i) % n]);
}
