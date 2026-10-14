import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Treatment from './Treatment';

const princessTreatment: GameDefinition = {
  id: 'princess-treatment',
  name: tx('Princess/King Treatment'),
  emoji: '👸',
  tagline: tx('Royal treatment, or just the bare minimum?'),
  color: 'var(--c-pink)',
  categories: ['party', 'pregame', 'quick'],
  minPlayers: 3,
  intensity: 2,
  explains: true,
  rules: [
    tx('Pick at the start: Princess, King, or both.'),
    tx('A card shows something someone does for you. The one whose turn it is reads it out.'),
    tx('Pass the phone round: everyone taps in secret, Treatment or Bare Minimum.'),
    tx('Then the phone shows who voted what. The minority drinks 2.'),
    tx('A tie: everyone drinks 1. All agreed: nobody drinks.'),
    tx('Next card, next reader, until the cards run out.'),
  ],
  component: Treatment,
};

export default princessTreatment;
