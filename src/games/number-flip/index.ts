import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import NumberFlip from './NumberFlip';

const numberFlip: GameDefinition = {
  id: 'number-flip',
  table: 'clean',
  name: tx('Number Flip'),
  emoji: '🔢',
  tagline: tx('Roll two dice, flip the flaps that add up. Shut the box.'),
  color: 'var(--c-teal)',
  categories: ['dice', 'quick'],
  minPlayers: 1,
  intensity: 1,
  explains: true,
  rules: [
    tx('A wooden box with flaps 1 to 9 (or 1 to 12). The phone goes round: one box per player and round.'),
    tx('Roll two dice, then flip down open flaps that add up to the roll: a 7 can be 7, 6 + 1, 5 + 2, 4 + 3 or 4 + 2 + 1.'),
    tx('Hard: only the total’s flap, or the two dice’s own flaps (3 and 4 for a 7). A double only gives its total.'),
    tx('Once every flap above 6 is down, you may roll one die instead of two.'),
    tx('No open flaps make the roll: your box is done. What’s still open adds up to your score. Lowest wins; all flaps down is perfect.'),
    tx('Classic: highest score drinks 2. Shut the box, and everyone else drinks 2.'),
    tx('Tournament (5 or 10 rounds): scores add up, highest total drinks 3. Survival: 3 lives, the round’s highest loses one. Daily challenge: the same dice for everyone today. Time attack: 45 seconds per box.'),
  ],
  component: NumberFlip,
};

export default numberFlip;
