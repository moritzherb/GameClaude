import { load, save } from './storage';

/*
 * This phone's own numbers, for the profile: which games were played how often, and the
 * Arschloch rounds with their ranks and sips. Kept on the phone only.
 */

export interface Stats {
  /** Games played to the end, by game id. */
  played: Record<string, number>;
  /** Arschloch rounds finished, by rank. */
  ranks: Record<string, number>;
  /** Games lost, by game id (Arschloch: holding the four Jacks). */
  lost: Record<string, number>;
  /** Sips drunk and handed out (counted in the games that know who drinks). */
  sips: { drunk: number; given: number };
  /** The last game counted, and when: its end shown again right after (a reload) counts once. */
  last?: { id: string; at: number };
  /** 2: `played` counts finished games (before, it counted games started). */
  v?: number;
}

const KEY = 'stats';
/** The same game's end shown again within this long (a reload) counts once. */
const SAME_GAME_MS = 15_000;

const empty = (): Stats => ({ played: {}, ranks: {}, lost: {}, sips: { drunk: 0, given: 0 }, v: 2 });

export function loadStats(): Stats {
  const s = load<Partial<Stats> | null>(KEY, null);
  if (!s || typeof s !== 'object') return empty();
  return {
    // Counted from before, when every game started counted: started over.
    played: s.v === 2 && s.played && typeof s.played === 'object' ? s.played : {},
    ranks: s.ranks && typeof s.ranks === 'object' ? s.ranks : {},
    lost: s.lost && typeof s.lost === 'object' ? s.lost : {},
    sips: { drunk: Number(s.sips?.drunk) || 0, given: Number(s.sips?.given) || 0 },
    last: s.last,
    v: 2,
  };
}

const update = (fn: (s: Stats) => Stats) => save(KEY, fn(loadStats()));

/** A game was played to its end on this phone (or, in a game without an end, a first round was). */
export function recordFinished(id: string, now = Date.now()) {
  update((s) => {
    // The end screen shown again a moment later (a reload): the same game.
    if (s.last?.id === id && now - s.last.at < SAME_GAME_MS) return s;
    return { ...s, played: { ...s.played, [id]: (s.played[id] ?? 0) + 1 }, last: { id, at: now } };
  });
}

export function recordSips(drunk: number, given: number) {
  if (!drunk && !given) return;
  update((s) => ({ ...s, sips: { drunk: s.sips.drunk + drunk, given: s.sips.given + given } }));
}

/** A game lost on this phone. */
export function recordLoss(id: string) {
  update((s) => ({ ...s, lost: { ...s.lost, [id]: (s.lost[id] ?? 0) + 1 } }));
}

/** A President round finished with this rank. */
export function recordRank(rank: string) {
  update((s) => ({ ...s, ranks: { ...s.ranks, [rank]: (s.ranks[rank] ?? 0) + 1 } }));
}

export function resetStats() {
  save(KEY, empty());
}
