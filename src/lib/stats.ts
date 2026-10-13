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

/**
 * A game was played to its end on this phone (or, in a game without an end, a first round was).
 * `crew`: who played it, when it was a one-phone game (their keys, see crewKey): it counts for them too.
 */
export function recordFinished(id: string, now = Date.now(), crew: string[] = []) {
  let counted = false;
  update((s) => {
    // The end screen shown again a moment later (a reload): the same game.
    if (s.last?.id === id && now - s.last.at < SAME_GAME_MS) return s;
    counted = true;
    return { ...s, played: { ...s.played, [id]: (s.played[id] ?? 0) + 1 }, last: { id, at: now } };
  });
  if (counted && crew.length) {
    const all = loadCrewStats();
    for (const key of new Set(crew)) {
      const c = all[key] ?? { played: {} };
      all[key] = { played: { ...c.played, [id]: (c.played[id] ?? 0) + 1 } };
    }
    save(CREW_KEY, all);
  }
}

/* ---- The crew's numbers: everyone who played the one-phone games on this phone. ---- */

export interface CrewStats {
  /** Games played to the end, by game id. */
  played: Record<string, number>;
}

const CREW_KEY = 'crew-stats';

/** Whose numbers these are: the person's id (someone from a room), else the crew player's own id. */
export const crewKey = (p: { id: string; personId?: string }) => p.personId ?? `player:${p.id}`;

export function loadCrewStats(): Record<string, CrewStats> {
  const raw = load<unknown>(CREW_KEY, {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, CrewStats> = {};
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    const played = (v as CrewStats | null)?.played;
    if (!played || typeof played !== 'object') continue;
    out[key] = { played: Object.fromEntries(Object.entries(played).filter(([, n]) => typeof n === 'number' && n > 0)) };
  }
  return out;
}

/** How many games, and the one played most. */
export function summary(played: Record<string, number>) {
  const list = Object.entries(played).sort((a, b) => b[1] - a[1]);
  return { total: list.reduce((sum, [, n]) => sum + n, 0), favourite: list[0]?.[0] ?? null };
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
