// German translations, one file per area. Keys are the exact English text.
import app from './app';
import busDriver from './busDriver';
import fiveThousand from './fiveThousand';
import fuckTheDealer from './fuckTheDealer';
import horseRace from './horseRace';
import kingsCup from './kingsCup';
import palace from './palace';
import pantsDown from './pantsDown';
import speed from './speed';
import trash from './trash';

const de: Record<string, string> = { ...app, ...busDriver, ...horseRace, ...kingsCup, ...fuckTheDealer, ...fiveThousand, ...pantsDown, ...palace, ...speed, ...trash };

export default de;
