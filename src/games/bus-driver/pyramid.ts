import { newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';

export const PYRAMID_SIZES = [3, 4, 5, 6];
export const DEFAULT_PYRAMID_SIZE = 5;

/** Number of cards in a pyramid with `rows` rows (5 → 5+4+3+2+1 = 15). */
export function pyramidCardCount(rows: number) {
  return (rows * (rows + 1)) / 2;
}

/** Cards per row, bottom row first: 5 → [5, 4, 3, 2, 1]. */
export function pyramidRows(rows: number) {
  return Array.from({ length: rows }, (_, i) => rows - i);
}

/**
 * Sips a card in this row is worth (row 0 = bottom).
 * Normal: 1-2-3-4-5. Tipsy doubles every row: 1-2-4-8-16.
 */
export function rowSips(row: number, tipsy: boolean) {
  return tipsy ? 2 ** row : row + 1;
}

/** Which row (0 = bottom) the n-th flipped card belongs to. */
export function rowOfFlip(flipIndex: number, rows: number) {
  let start = 0;
  for (const [row, size] of pyramidRows(rows).entries()) {
    if (flipIndex < start + size) return row;
    start += size;
  }
  return rows - 1;
}

/**
 * Takes the pyramid cards off the top of the leftover deck. The rest is put aside.
 * If the leftover deck is too small (lots of players) a fresh deck is added underneath.
 */
export function buildPyramid(deck: Card[], rows: number, extraDeck: () => Card[] = () => shuffle(newDeck())) {
  const needed = pyramidCardCount(rows);
  const toppedUp = deck.length < needed;
  const source = toppedUp ? [...deck, ...extraDeck()] : deck;
  return { cards: source.slice(0, needed), toppedUp };
}

/** Every card in every hand that matches the flipped value is laid down. */
export function layMatches(hands: Card[][], flipped: Card) {
  const laid = hands.map((hand) => hand.filter((c) => c.value === flipped.value));
  const left = hands.map((hand) => hand.filter((c) => c.value !== flipped.value));
  return { laid, left };
}

/** Seats holding the most cards. One seat = the bus driver, more = tiebreaker. */
export function mostCards(hands: Card[][]) {
  const max = Math.max(...hands.map((h) => h.length));
  return hands.flatMap((h, i) => (h.length === max ? [i] : []));
}

export interface TiebreakState {
  /** Seat ids still in the tiebreaker. */
  remaining: string[];
  /** Each tied player's card for this attempt. */
  cards: Record<string, Card>;
  deck: Card[];
  flipped: Card[];
}

export function dealTiebreak(ids: string[], deck: Card[] = shuffle(newDeck())): TiebreakState {
  const cards: Record<string, Card> = {};
  ids.forEach((id, i) => (cards[id] = deck[i]));
  return { remaining: ids, cards, deck: deck.slice(ids.length), flipped: [] };
}

export type TiebreakOutcome =
  | { kind: 'continue' }
  /** Exactly one player left: they drive the bus. */
  | { kind: 'driver'; id: string }
  /** Everyone left was cleared at once, or the deck ran dry: these players go again. */
  | { kind: 'redo'; ids: string[] };

/** Flips the next card; players whose value shows up are safe. */
export function flipTiebreak(s: TiebreakState): { state: TiebreakState; safe: string[]; outcome: TiebreakOutcome } {
  const [card, ...deck] = s.deck;
  const safe = s.remaining.filter((id) => s.cards[id].value === card.value);
  const remaining = s.remaining.filter((id) => !safe.includes(id));
  const state = { ...s, deck, remaining, flipped: [...s.flipped, card] };

  if (remaining.length === 1) return { state, safe, outcome: { kind: 'driver', id: remaining[0] } };
  if (remaining.length === 0) return { state, safe, outcome: { kind: 'redo', ids: s.remaining } };
  if (deck.length === 0) return { state, safe, outcome: { kind: 'redo', ids: remaining } };
  return { state, safe, outcome: { kind: 'continue' } };
}
