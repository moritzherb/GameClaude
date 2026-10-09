import { t, tx } from '../../i18n';
import { rankLabel } from '../../lib/cards';
import type { GameDefinition } from '../types';
import KingsCup from './KingsCup';
import { CARD_RULES } from './rules';

const RANK_ORDER = [14, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const kingsCup: GameDefinition = {
  id: 'kings-cup',
  name: tx('Kings Cup'),
  emoji: '👑',
  tagline: tx('Every card is a rule. Don’t draw the last King.'),
  color: 'var(--c-lilac)',
  categories: ['cards', 'party', 'pregame'],
  minPlayers: 2,
  intensity: 2,
  explains: true,
  needs: [tx('An empty cup in the middle')],
  // A getter, so the per-card lines (built from CARD_RULES) are translated when the rules are shown,
  // not at import time. The fixed lines stay English here and are translated by the screen with t().
  get rules() {
    return [
      tx('Put an empty cup in the middle: the King’s Cup.'),
      tx('Take turns drawing a card. Each card has a rule:'),
      ...RANK_ORDER.map((v) => `${rankLabel(v)} · ${CARD_RULES[v].emoji} ${t(CARD_RULES[v].title)}: ${t(CARD_RULES[v].text)}`),
      tx('Whoever draws the 4th King drinks the King’s Cup. The game ends when all cards are drawn.'),
    ];
  },
  component: KingsCup,
};

export default kingsCup;
