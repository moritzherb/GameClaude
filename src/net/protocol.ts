// Messages between phones. The host phone is the boss: guests talk only to the host,
// the host keeps the truth (who's in, game state) and sends it out.

export interface Profile {
  /** Stable per phone, so a phone that drops out and reconnects keeps its seat. */
  clientId: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Member extends Omit<Profile, 'clientId'> {
  /** The member's clientId. */
  id: string;
  host: boolean;
  online: boolean;
}

/** Guest → host */
export type ToHost =
  | { t: 'hello'; profile: Profile }
  | { t: 'cheers' }
  /** Anything a game wants to tell the host (a move, an answer). */
  | { t: 'game'; data: unknown };

/** Host → guest */
export type ToGuest =
  /** `game`: id of the game the host has running in this room, or null in the lobby. */
  | { t: 'lobby'; code: string; members: Member[]; game: string | null }
  | { t: 'cheers'; from: string }
  /** Anything a game wants to tell one or all guests (state, a private hand). */
  | { t: 'game'; data: unknown }
  | { t: 'bye'; reason: 'closed' | 'removed' };

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I mix-ups

export function newRoomCode(length = 4) {
  return Array.from({ length }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');
}

/** Cleans up whatever someone typed: lowercase, spaces, dashes. */
export function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

export const peerIdFor = (code: string) => `prost-room-${code}`;
