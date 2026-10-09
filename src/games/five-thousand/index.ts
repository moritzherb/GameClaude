import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import FiveThousand from './FiveThousand';

const fiveThousand: GameDefinition = {
  id: 'five-thousand',
  name: tx('5000'),
  emoji: '🎲',
  tagline: tx('Kings and Aces. Hit exactly 5000.'),
  color: 'var(--c-mint)',
  categories: ['dice', 'pregame'],
  minPlayers: 2,
  intensity: 1,
  explains: true,
  rules: [
    tx('Five dice with 9, 10, J, Q, K and A, rolled from a cup. Pick who starts, then the cup goes round to the left.'),
    tx('Kings are worth 50, Aces 100. Three of a kind in one roll: 9s 100, 10s 200, Jacks 300, Queens 400, Kings 500, Aces 1000.'),
    tx('After every roll, set aside at least one King, Ace or triple. Then roll the rest again, or stop and bank this turn’s points.'),
    tx('A roll with no King, no Ace and no triple ends your turn, and all of this turn’s points are gone.'),
    tx('If every die has scored, put all five back in the cup and keep going. The points keep adding up.'),
    tx('To get in, you need at least 500 in one turn. Until then you can’t stop below 500.'),
    tx('Once you’re in, a first roll with nothing to set aside costs 300 points (you can’t go below 0).'),
    tx('First to exactly 5000 wins. Go over and that turn’s points are gone.'),
  ],
  component: FiveThousand,
};

export default fiveThousand;
