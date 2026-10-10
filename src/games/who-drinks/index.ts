import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import WhoDrinks from './WhoDrinks';

const whoDrinks: GameDefinition = {
  id: 'who-drinks',
  name: tx('Who Drinks?'),
  emoji: '🎰',
  tagline: tx('Spin it. Someone’s getting wrecked.'),
  color: 'var(--c-orange)',
  categories: ['quick', 'pregame', 'party'],
  minPlayers: 2,
  intensity: 2,
  rules: [
    tx('Hit SPIN.'),
    tx('The wheel lands on someone.'),
    tx('That person does whatever the screen says.'),
    tx('Tap a name to count a sip for the ones the wheel can’t know (handed out, lost a little game).'),
    tx('No arguing with the machine.'),
  ],
  component: WhoDrinks,
};

export default whoDrinks;
