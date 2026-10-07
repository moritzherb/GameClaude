import type { GameDefinition } from './types';
import whoDrinks from './who-drinks';

/** Every game in the app. New games get imported and added here. */
export const GAMES: GameDefinition[] = [whoDrinks];

export function findGame(id: string | undefined) {
  return GAMES.find((g) => g.id === id);
}

export const playableGames = () => GAMES.filter((g) => g.component);
