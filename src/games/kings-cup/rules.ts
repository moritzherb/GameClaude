import type { Card } from '../../lib/cards';
import { tx } from '../../i18n';

export interface CardRule {
  emoji: string;
  /** English; translate with t() when rendering. */
  title: string;
  /** English; translate with t() when rendering. */
  text: string;
}

/** One rule per rank. Edit here for house rules. */
export const CARD_RULES: Record<number, CardRule> = {
  14: { emoji: '🌊', title: tx('Waterfall'), text: tx('Everyone starts drinking, you first. Nobody may stop before the person before them.') },
  2: { emoji: '👉', title: tx('You'), text: tx('Pick someone to drink.') },
  3: { emoji: '🙋', title: tx('Me'), text: tx('You drink.') },
  4: { emoji: '👇', title: tx('Floor'), text: tx('Everyone touches the floor. Last one drinks.') },
  5: { emoji: '🧔', title: tx('Guys'), text: tx('All guys drink.') },
  6: { emoji: '💃', title: tx('Girls'), text: tx('All girls drink.') },
  7: { emoji: '🙌', title: tx('Heaven'), text: tx('Everyone puts both hands up to the sky. Last one drinks.') },
  8: { emoji: '🤝', title: tx('Mate'), text: tx('Pick a mate. Every time you drink, they drink too. For the rest of the game.') },
  9: { emoji: '🎤', title: tx('Rhyme'), text: tx('Say a word. Go around rhyming on it. First one who can’t drinks.') },
  10: { emoji: '📋', title: tx('Categories'), text: tx('Pick a category (car brands, beers…). Go around naming things. First one who can’t drinks.') },
  11: { emoji: '📜', title: tx('Make a rule'), text: tx('Invent a rule that lasts the whole game. Anyone who breaks it drinks.') },
  12: { emoji: '❓', title: tx('Question Master'), text: tx('Anyone who answers one of your questions drinks. Lasts until the next Queen.') },
  13: { emoji: '👑', title: tx('King’s Cup'), text: tx('Pour some of your drink into the King’s Cup.') },
};

export const LAST_KING_RULE: CardRule = {
  emoji: '🏆',
  title: tx('Drink the King’s Cup!'),
  text: tx('That was the 4th King. Down the whole cup. Game over!'),
};

export const KING = 13;

export function isKing(card: Card) {
  return card.value === KING;
}
