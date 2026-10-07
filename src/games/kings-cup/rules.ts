import type { Card } from '../../lib/cards';

export interface CardRule {
  emoji: string;
  title: string;
  text: string;
}

/** One rule per rank. Edit here for house rules. */
export const CARD_RULES: Record<number, CardRule> = {
  14: { emoji: '🌊', title: 'Waterfall', text: 'Everyone starts drinking, you first. Nobody may stop before the person before them.' },
  2: { emoji: '👉', title: 'You', text: 'Pick someone to drink.' },
  3: { emoji: '🙋', title: 'Me', text: 'You drink.' },
  4: { emoji: '👇', title: 'Floor', text: 'Everyone touches the floor. Last one drinks.' },
  5: { emoji: '🧔', title: 'Guys', text: 'All guys drink.' },
  6: { emoji: '💃', title: 'Girls', text: 'All girls drink.' },
  7: { emoji: '☝️', title: 'Heaven', text: 'Everyone points to the sky. Last one drinks.' },
  8: { emoji: '🤝', title: 'Mate', text: 'Pick a mate. Every time you drink, they drink too. For the rest of the game.' },
  9: { emoji: '🎤', title: 'Rhyme', text: 'Say a word. Go around rhyming on it. First one who can’t drinks.' },
  10: { emoji: '📋', title: 'Categories', text: 'Pick a category (car brands, beers…). Go around naming things. First one who can’t drinks.' },
  11: { emoji: '📜', title: 'Make a rule', text: 'Invent a rule that lasts the whole game. Anyone who breaks it drinks.' },
  12: { emoji: '❓', title: 'Question Master', text: 'Anyone who answers one of your questions drinks. Lasts until the next Queen.' },
  13: { emoji: '👑', title: 'King’s Cup', text: 'Pour some of your drink into the King’s Cup.' },
};

export const LAST_KING_RULE: CardRule = {
  emoji: '🏆',
  title: 'Drink the King’s Cup!',
  text: 'That was the 4th King. Down the whole cup. Game over!',
};

export const KING = 13;

export function isKing(card: Card) {
  return card.value === KING;
}
