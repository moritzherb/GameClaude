import type { Card } from '../../lib/cards';
import { tx } from '../../i18n';
import type { GlyphName } from '../../lib/glyphs';

export interface CardRule {
  /** Its picture (lib/glyphs.ts). */
  icon: GlyphName;
  /** English; translate with t() when rendering. */
  title: string;
  /** English; translate with t() when rendering. */
  text: string;
}

/** One rule per rank. Edit here for house rules. */
export const CARD_RULES: Record<number, CardRule> = {
  14: { icon: 'waterfall', title: tx('Waterfall'), text: tx('Everyone starts drinking, you first. Nobody may stop before the person before them.') },
  2: { icon: 'you', title: tx('You'), text: tx('Pick someone to drink.') },
  3: { icon: 'me', title: tx('Me'), text: tx('You drink.') },
  4: { icon: 'floor', title: tx('Floor'), text: tx('Everyone touches the floor. Last one drinks.') },
  5: { icon: 'guys', title: tx('Guys'), text: tx('All guys drink.') },
  6: { icon: 'girls', title: tx('Girls'), text: tx('All girls drink.') },
  7: { icon: 'heaven', title: tx('Heaven'), text: tx('Everyone puts both hands up to the sky. Last one drinks.') },
  8: { icon: 'mate', title: tx('Mate'), text: tx('Pick a mate. Every time you drink, they drink too. Until the next 8.') },
  9: { icon: 'rhyme', title: tx('Rhyme'), text: tx('Say a word. Go around rhyming on it. First one who can’t drinks.') },
  10: { icon: 'category', title: tx('Categories'), text: tx('Pick a category (car brands, beers…). Go around naming things. First one who can’t drinks.') },
  11: { icon: 'rule', title: tx('Make a rule'), text: tx('Invent a rule. It lasts until the next Jack. Anyone who breaks it drinks.') },
  12: { icon: 'question', title: tx('Question Master'), text: tx('Anyone who answers one of your questions drinks. Lasts until the next Queen.') },
  13: { icon: 'crown', title: tx('King’s Cup'), text: tx('Pour some of your drink into the King’s Cup.') },
};

export const LAST_KING_RULE: CardRule = {
  icon: 'trophy',
  title: tx('Drink the King’s Cup!'),
  text: tx('That was the 4th King. Down the whole cup!'),
};

export const KING = 13;

export function isKing(card: Card) {
  return card.value === KING;
}
