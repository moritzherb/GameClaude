import { tx } from '../../i18n';
import type { GameDefinition } from '../types';
import TenBut from './TenBut';

const tenBut: GameDefinition = {
  id: 'ten-but',
  name: tx('He’s a 10/10, but…'),
  emoji: '🔟',
  tagline: tx('Perfect. Except for one thing.'),
  color: 'var(--c-lilac)',
  categories: ['party', 'pregame', 'quick'],
  minPlayers: 3,
  intensity: 2,
  explains: true,
  rules: [
    tx('Pick at the start: the cards are about him, her, or both.'),
    tx('A card says: he’s a 10, but … The one whose turn it is reads it out.'),
    tx('Pass the phone round: everyone taps in secret where that drops him, from 0 to 10.'),
    tx('Then the phone shows everyone’s number and the average.'),
    tx('Whoever is furthest from the average drinks 2. Several equally far: all of them. Everyone the same: nobody.'),
    tx('Next card, next reader, until the cards run out.'),
  ],
  component: TenBut,
};

export default tenBut;
