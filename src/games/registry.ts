import type { GameDefinition } from './types';
import busDriver from './bus-driver';
import fiveThousand from './five-thousand';
import fuckTheDealer from './fuck-the-dealer';
import horseRace from './horse-race';
import hoseRunter from './hose-runter';
import kingsCup from './kings-cup';
import speed from './speed';
import whoDrinks from './who-drinks';

/** Every game in the app. New games get imported and added here. */
export const GAMES: GameDefinition[] = [busDriver, hoseRunter, kingsCup, fuckTheDealer, fiveThousand, speed, horseRace, whoDrinks];

export function findGame(id: string | undefined) {
  return GAMES.find((g) => g.id === id);
}

/** Games for one phone (the random pick only chooses from these). */
export const playableGames = () => GAMES.filter((g) => g.component);

/** Games where every player uses their own phone. */
export const onlineGames = () => GAMES.filter((g) => g.online);
