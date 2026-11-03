import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import Treatment from './Treatment';

const princessTreatment: GameDefinition = {
  id: 'princess-treatment',
  name: tx('Princess/King Treatment'),
  emoji: '👸',
  tagline: tx('Bare Minimum or Princess Treatment? One tap settles it.'),
  color: 'var(--c-pink)',
  categories: ['party', 'pregame', 'quick'],
  minPlayers: 3,
  intensity: 1,
  explains: true,
  rules: [
    tx('A card shows something someone does for you. The one whose turn it is reads it out.'),
    tx('Talk it over, then tap once for the whole table: just the Bare Minimum, or real Princess (or King) Treatment?'),
    tx('Next card, next reader, until the cards run out.'),
  ],
  component: Treatment,
};

export default princessTreatment;
