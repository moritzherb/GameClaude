import { createContext, useContext, useEffect } from 'react';

/** Who's on, as the bar over a game shows them on a clean table. */
export interface TurnPlayer {
  name: string;
  avatar: string;
  color: string;
  photo?: string;
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
