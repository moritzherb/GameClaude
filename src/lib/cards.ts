// A standard 52-card deck, shared by all card games.

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs';
export type CardColor = 'red' | 'black';

export interface Card {
  /** 2–10, J = 11, Q = 12, K = 13, A = 14 (aces high). */
  value: number;
  suit: Suit;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];

// U+FE0E asks for the plain text glyph; without it iPhones draw the suits as big emoji.
export const SUIT_SYMBOL: Record<Suit, string> = { hearts: '♥\uFE0E', diamonds: '♦\uFE0E', spades: '♠\uFE0E', clubs: '♣\uFE0E' };
export const SUIT_NAME: Record<Suit, string> = { hearts: 'Hearts', diamonds: 'Diamonds', spades: 'Spades', clubs: 'Clubs' };

const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function rankLabel(value: number) {
  return RANK_LABEL[value] ?? String(value);
}

export function cardColor(card: Card): CardColor {
  return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black';
}

export function cardName(card: Card) {
  return `${rankLabel(card.value)}${SUIT_SYMBOL[card.suit]}`;
}

export function newDeck(): Card[] {
  return SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ value: i + 2, suit })));
}
