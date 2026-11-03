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
  intensity: 1,
  explains: true,
  rules: [
    tx('Pick at the start: the cards are about him, her, or both.'),
    tx('A card says: he’s a 10, but … The one whose turn it is reads it out.'),
    tx('Then talk about it: still a 10, or not any more? Nothing to vote, nothing to count.'),
    tx('Next card, next reader, until the cards run out.'),
  ],
  component: TenBut,
};

export default tenBut;
