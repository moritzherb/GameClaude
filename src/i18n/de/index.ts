// German translations, one file per area. Keys are the exact English text.
import app from './app';
import busDriver from './busDriver';
import fiveThousand from './fiveThousand';
import fuckTheDealer from './fuckTheDealer';
import kingsCup from './kingsCup';
import pantsDown from './pantsDown';
import speed from './speed';

const de: Record<string, string> = { ...app, ...busDriver, ...kingsCup, ...fuckTheDealer, ...fiveThousand, ...pantsDown, ...speed };

export default de;
