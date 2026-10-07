import type { GameDefinition } from '../types';
import WhoDrinks from './WhoDrinks';

const whoDrinks: GameDefinition = {
  id: 'who-drinks',
  name: 'Who Drinks?',
  emoji: '🎰',
  tagline: 'Spin it. Someone’s getting wrecked.',
  color: 'var(--yellow)',
  categories: ['quick', 'pregame', 'party'],
  minPlayers: 2,
  intensity: 2,
  rules: [
    'Hit SPIN.',
    'The wheel lands on someone.',
    'That person does whatever the screen says.',
    'No arguing with the machine. 🤖',
  ],
  component: WhoDrinks,
};

export default whoDrinks;
