import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Klatschen from './Klatschen';

const klatschen: GameDefinition = {
  id: 'klatschen',
  name: tx('Klatschen'),
  emoji: '👏',
  tagline: tx('Never say drink. Clap.'),
  color: 'var(--c-orange)',
  categories: ['cards', 'party', 'pregame'],
  minPlayers: 2,
  intensity: 3,
  explains: true,
  rules: [
    tx('60 task cards lie face down in a circle round an empty glass. Draw one each, round the table, and do what it says.'),
    tx('Three rules hold all game long: never say “drink” (say “clap” instead), only hold your glass in your left hand, no swearing. Whoever breaks one claps 1.'),
    tx('“Clap” means drink: “clap 2” is two sips.'),
    tx('There are 4 clap glass cards. Each one: pour a splash from your glass into the one in the middle.'),
    tx('Whoever draws the 4th clap glass claps the whole glass in the middle, and the game is over.'),
  ],
  component: Klatschen,
};

export default klatschen;
