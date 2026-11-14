import { createContext, useContext, useEffect, useRef } from 'react';
import { buzz } from './fx';

/** Who's on, as the bar over a game shows them on a clean table. */
export interface TurnPlayer {
  name: string;
  avatar: string;
  color: string;
  photo?: string;
}

/**
 * Whether the game is being played (not its setup screen, where a clean table changes nothing, so
 * the bar has no switch for it). Set by the game; one that never says is always being played.
 */
export const PlayingContext = createContext<(on: boolean | null) => void>(() => {});

export function usePlaying(on: boolean) {
  const set = useContext(PlayingContext);
  useEffect(() => set(on), [set, on]);
  useEffect(() => () => set(null), [set]);
}

/**
 * The crew button in the bar: only on a game's setup menu (who deals, the stakes, the mode …), to
 * add someone before it starts; never while it's being played. 'crew': the players on this phone;
 * 'room': a room game whose players are the phones in the room (its code to join).
 */
export type CrewButton = 'crew' | 'room' | null;
export const CrewButtonContext = createContext<(kind: CrewButton) => void>(() => {});

export function useCrewButton(kind: CrewButton) {
  const set = useContext(CrewButtonContext);
  useEffect(() => set(kind), [set, kind]);
  useEffect(() => () => set(null), [set]);
}

/** Set by the game, shown by the bar around it (see GameBar). */
export const TurnContext = createContext<(p: TurnPlayer | null) => void>(() => {});

/**
 * A game names who's on (null: nobody in particular, e.g. between rounds). With a clean table the
 * game's own line saying so is hidden, so the bar over it shows a small bubble instead.
 */
export function useTurnBubble(p: TurnPlayer | null | undefined) {
  const set = useContext(TurnContext);
  const { name, avatar, color, photo } = p ?? {};
  useEffect(() => {
    set(name != null && avatar != null && color != null ? { name, avatar, color, photo } : null);
  }, [set, name, avatar, color, photo]);
  // Leaving the game (or a part of it that names someone): nobody.
  useEffect(() => () => set(null), [set]);
}

/**
 * On your own phone (a game played on everyone's): the moment it becomes your turn, the phone
 * vibrates, so you notice with it lying on the table. Not again while it stays yours.
 */
export function useYourTurn(mine: boolean) {
  const was = useRef(false);
  useEffect(() => {
    if (mine && !was.current) buzz([30, 70, 30]);
    was.current = mine;
  }, [mine]);
}
