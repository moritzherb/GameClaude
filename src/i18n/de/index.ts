// German translations, one file per area. Keys are the exact English text.
import app from './app';
import busDriver from './busDriver';
import fiveThousand from './fiveThousand';
import fuckTheDealer from './fuckTheDealer';
import horseRace from './horseRace';
import kingsCup from './kingsCup';
import klatschen from './klatschen';
import maexchen from './maexchen';
import palace from './palace';
import schweinerei from './schweinerei';
import pantsDown from './pantsDown';
import speed from './speed';
import trash from './trash';
import whoDrinks from './whoDrinks';

const de: Record<string, string> = { ...app, ...busDriver, ...horseRace, ...kingsCup, ...klatschen, ...maexchen, ...fuckTheDealer, ...fiveThousand, ...pantsDown, ...palace, ...schweinerei, ...speed, ...trash, ...whoDrinks };

export default de;
