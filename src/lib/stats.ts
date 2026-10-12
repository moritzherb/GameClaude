import { load, save } from './storage';

/*
 * This phone's own numbers, for the profile: which games were played how often, and the
 * Arschloch rounds with their ranks and sips. Kept on the phone only.
 */

export interface Stats {
  /** Games started, by game id. */
  played: Record<string, number>;
  /** Arschloch rounds finished, by rank. */
  ranks: Record<string, number>;
  /** Games lost, by game id (Arschloch: holding the four Jacks). */
  lost: Record<string, number>;
  /** Sips drunk and handed out (counted in the games that know who drinks). */
  sips: { drunk: number; given: number };
  /** The last game counted, and when: the same game opened again soon after is the same game. */
  last?: { id: string; at: number };
}

const KEY = 'stats';
/** Opening the same game again within this long (a reload, back from the rules) counts once. */
const SAME_GAME_MS = 30 * 60_000;

const empty = (): Stats => ({ played: {}, ranks: {}, lost: {}, sips: { drunk: 0, given: 0 } });

export function loadStats(): Stats {
  const s = load<Partial<Stats> | null>(KEY, null);
  if (!s || typeof s !== 'object') return empty();
  return {
    played: s.played && typeof s.played === 'object' ? s.played : {},
    ranks: s.ranks && typeof s.ranks === 'object' ? s.ranks : {},
    lost: s.lost && typeof s.lost === 'object' ? s.lost : {},
    sips: { drunk: Number(s.sips?.drunk) || 0, given: Number(s.sips?.given) || 0 },
    last: s.last,
  };
}

const update = (fn: (s: Stats) => Stats) => save(KEY, fn(loadStats()));

/** A game was started on this phone. */
export function recordPlay(id: string, now = Date.now()) {
  update((s) => {
    if (s.last?.id === id && now - s.last.at < SAME_GAME_MS) return { ...s, last: { id, at: now } };
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
