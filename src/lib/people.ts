import { load, save } from './storage';

/*
 * Everyone this phone has met in a room: name, emoji, colour and photo, so they can be added to
 * the crew for the one-phone games later (and their numbers kept). Kept on the phone only.
 */

export interface Person {
  /** Their phone's id (the room's clientId): the same person stays the same entry. */
  id: string;
  name: string;
  avatar: string;
  color: string;
  photo?: string;
  /** Last met (ms). */
  seen: number;
}

interface Seen {
  id: string;
  name: string;
  avatar: string;
  color: string;
  photo?: string;
}

const KEY = 'people';
/** The most recent ones are kept. */
export const MAX_PEOPLE = 40;
/** Seen again within this long: no need to write it down again. */
const SEEN_AGAIN_MS = 60 * 60_000;

const okPhoto = (p: unknown): p is string => typeof p === 'string' && p.startsWith('data:image/') && p.length < 20_000;

/** Stored people, keeping only complete entries (damaged storage must never break the app). */
export function cleanPeople(raw: unknown): Person[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is Person =>
        !!p &&
        typeof p === 'object' &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        !!p.name.trim() &&
        typeof p.avatar === 'string' &&
        typeof p.color === 'string',
    )
    .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, photo: okPhoto(p.photo) ? p.photo : undefined, seen: Number(p.seen) || 0 }));
}

export const loadPeople = () => cleanPeople(load<unknown>(KEY, []));

/** Most recently met first. */
export function mergePeople(known: Person[], met: Seen[], selfId: string | undefined, now = Date.now()): Person[] {
  const byId = new Map(known.map((p) => [p.id, p]));
  for (const m of met) {
    if (!m.id || m.id === selfId || !m.name?.trim()) continue;
    // As they are now (a photo they removed is gone here too).
    byId.set(m.id, { id: m.id, name: m.name.trim(), avatar: m.avatar, color: m.color, photo: okPhoto(m.photo) ? m.photo : undefined, seen: now });
  }
  return [...byId.values()].sort((a, b) => b.seen - a.seen).slice(0, MAX_PEOPLE);
}

/** The people in a room right now (everyone but this phone). Written down only when something changed. */
export function rememberPeople(met: Seen[], selfId: string | undefined, now = Date.now()) {
  const known = loadPeople();
  const changed = met.some((m) => {
    if (!m.id || m.id === selfId || !m.name?.trim()) return false;
    const old = known.find((p) => p.id === m.id);
    return (
      !old ||
      old.name !== m.name.trim() ||
      old.avatar !== m.avatar ||
      old.color !== m.color ||
      (old.photo ?? '') !== (okPhoto(m.photo) ? m.photo : '') ||
      now - old.seen > SEEN_AGAIN_MS
    );
  });
  if (changed) save(KEY, mergePeople(known, met, selfId, now));
}

export function forgetPerson(id: string) {
  save(KEY, loadPeople().filter((p) => p.id !== id));
}
