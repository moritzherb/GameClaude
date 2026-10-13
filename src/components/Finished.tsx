import { createContext, useContext, useEffect, useRef } from 'react';
import { load } from '../lib/storage';
import { crewKey, recordFinished } from '../lib/stats';
import type { Profile } from '../net/protocol';
import type { Player } from '../state/AppState';

/** The crew playing a one-phone game on this phone (none in a room game, where each phone counts itself). */
export const CrewContext = createContext<Player[] | null>(null);

/**
 * Put this on a game's end screen: once it shows, the game counts as played in the profile's
 * stats, and in a one-phone game for everyone in the crew too. (Games without an end show it from
 * their first finished round on, for as long as the game stays open.) `players`: who actually
 * played, when the game picks some of the crew.
 */
export default function Finished({ game, players }: { game: string; players?: Player[] }) {
  const crew = useContext(CrewContext);
  const who = players ?? crew;
  // Who it was when the end showed (someone leaving the room afterwards doesn't count it again).
  const keys = useRef<string[]>([]);
  keys.current = (who ?? [])
    .map(crewKey)
    // This phone's owner, in the crew: their profile's numbers already count it.
    .filter((k) => k !== load<Profile | null>('me', null)?.clientId);
  useEffect(() => recordFinished(game, Date.now(), keys.current), [game]);
  return null;
}
