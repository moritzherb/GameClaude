import type { GameDefinition } from './types';
import busDriver from './bus-driver';
import kingsCup from './kings-cup';
import whoDrinks from './who-drinks';

/** Every game in the app. New games get imported and added here. */
export const GAMES: GameDefinition[] = [busDriver, kingsCup, whoDrinks];

export function findGame(id: string | undefined) {
  return GAMES.find((g) => g.id === id);
}

export const playableGames = () => GAMES.filter((g) => g.component);
