// German translations, one file per area. Keys are the exact English text.
import app from './app';
import busDriver from './busDriver';
import fuckTheDealer from './fuckTheDealer';
import kingsCup from './kingsCup';
import pantsDown from './pantsDown';

const de: Record<string, string> = { ...app, ...busDriver, ...kingsCup, ...fuckTheDealer, ...pantsDown };

export default de;
