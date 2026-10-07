import { rankLabel } from '../../lib/cards';
import type { GameDefinition } from '../types';
import KingsCup from './KingsCup';
import { CARD_RULES } from './rules';

const RANK_ORDER = [14, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const kingsCup: GameDefinition = {
  id: 'kings-cup',
  name: 'Kings Cup',
  emoji: '👑',
  tagline: 'Every card is a rule. Don’t draw the last King.',
  color: 'var(--g-violet)',
  categories: ['cards', 'party', 'pregame'],
  minPlayers: 2,
  intensity: 2,
  needs: ['An empty cup in the middle'],
  rules: [
    'Put an empty cup in the middle: the King’s Cup.',
    'Take turns drawing a card. Each card has a rule:',
    ...RANK_ORDER.map((v) => `${rankLabel(v)} · ${CARD_RULES[v].emoji} ${CARD_RULES[v].title}: ${CARD_RULES[v].text}`),
    'Whoever draws the 4th King drinks the King’s Cup. Game over.',
  ],
  component: KingsCup,
};

export default kingsCup;
