import { STORE_EMOJI } from '../i18n/store';
import { storeSafe } from '../lib/native';
import type { GameDefinition } from './types';
import arschloch from './arschloch';
import president from './president';
import busDriver from './bus-driver';
import fiveThousand from './five-thousand';
import fuckTheDealer from './fuck-the-dealer';
import horseRace from './horse-race';
import hoseRunter from './hose-runter';
import kingsCup from './kings-cup';
import klatschen from './klatschen';
import maexchen from './maexchen';
import palace from './palace';
import party from './party';
import princessTreatment from './princess-treatment';
import schweinerei from './schweinerei';
import speed from './speed';
import tenBut from './ten-but';
import trash from './trash';
import whoDrinks from './who-drinks';
import ratScrew from './rat-screw';
import colorClash from './color-clash';

/** Every game in the app. New games get imported and added here. */
export const GAMES: GameDefinition[] = [busDriver, hoseRunter, kingsCup, klatschen, fuckTheDealer, fiveThousand, maexchen, schweinerei, speed, palace, president, arschloch, horseRace, trash, whoDrinks, princessTreatment, tenBut, party, ratScrew, colorClash].map(
  // The store app: no swearing or pants in the icons (names: i18n/store.ts).
  (g) => (storeSafe && STORE_EMOJI[g.emoji] ? { ...g, emoji: STORE_EMOJI[g.emoji] } : g),
);

export function findGame(id: string | undefined) {
  return GAMES.find((g) => g.id === id);
}

/** Games for one phone (the random pick only chooses from these). */
export const playableGames = () => GAMES.filter((g) => g.component);

/** Games where every player uses their own phone. */
export const onlineGames = () => GAMES.filter((g) => g.online);
