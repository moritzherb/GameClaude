import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Maexchen from './Maexchen';

const maexchen: GameDefinition = {
  id: 'maexchen',
  name: tx('Mäxchen'),
  emoji: '🤥',
  tagline: tx('Two dice, one cup, a lot of lying.'),
  color: 'var(--c-yellow)',
  categories: ['dice', 'party', 'pregame'],
  minPlayers: 2,
  intensity: 2,
  explains: true,
  rules: [
    tx('Two dice under a cup on a beer mat. The phone is the cup: it goes round to the left.'),
    tx('The higher die counts first: 6 and 3 is 63. From low to high: 31, 32, 41 … 65, then the doubles 11 … 66, and the Mäxchen (2 and 1) beats everything.'),
    tx('Shake, look under the cup (or don’t) and announce a value. It has to beat the one before, and it may be a lie.'),
    tx('Once you’ve looked, you may shake one more time, blind: then no more looking, you have to announce something anyway.'),
    tx('The next player believes it and shakes again (and has to announce even higher), or lifts the cup.'),
    tx('Lifted: if the dice show at least what was announced, the one who lifted drinks. If not, the liar drinks.'),
    tx('A Mäxchen can’t be beaten: believe it and drink 1, or lift the cup and whoever is wrong drinks 2.'),
    tx('Whoever drank starts the next round.'),
  ],
  component: Maexchen,
};

export default maexchen;
