import { cardColor, newDeck, type Card } from '../../lib/cards';
import { shuffle } from '../../lib/random';
import type { Outcome } from './logic';

/*
 * Bus ride on a board of face-down cards, driven from the bottom row to the top.
 *
 * Diamond (1-2-3-2-1): bottom card = Red or black?, every row after that = Higher or lower than
 *   the card just turned. The driver follows the road: each pick must touch the card picked in
 *   the row below (left pair card → left or middle; left card in the 3-row → left only; middle →
 *   either), then the top.
 * Zigzag (1-2-1-2-1): single cards = Red or black?, 2-rows = Higher or lower (pick either card).
 *
 * A wrong answer costs the row number in sips (same value: double), every turned card gets
 * covered by a new face-down card from the deck, and the driver starts again at the bottom.
 */

export type BoardMode = 'diamond' | 'zigzag';
export type BoardQuestion = 'color' | 'higher-lower';

export const BOARD_ROWS: Record<BoardMode, number[]> = {
  diamond: [1, 2, 3, 2, 1],
  zigzag: [1, 2, 1, 2, 1],
};

export const BOARD_QUESTIONS: Record<BoardMode, BoardQuestion[]> = {
  diamond: ['color', 'higher-lower', 'higher-lower', 'higher-lower', 'higher-lower'],
  zigzag: ['color', 'higher-lower', 'color', 'higher-lower', 'color'],
};

export type BoardGuess = { q: 'color'; color: 'red' | 'black' } | { q: 'higher-lower'; dir: 'higher' | 'lower' };

export interface BoardState {
  mode: BoardMode;
  /** cards[row][slot]: the card currently lying there (row 0 = bottom). */
  cards: Card[][];
  /** Turned face up in the current attempt. */
  up: boolean[][];
  /** Slot picked in each row so far this attempt. */
  path: number[];
  deck: Card[];
  attempt: number;
  drunk: number;
  drawn: number;
  done: boolean;
}

const key = (c: Card) => `${c.value}${c.suit}`;

export function startBoard(mode: BoardMode, deck: Card[] = shuffle(newDeck())): BoardState {
  const rest = [...deck];
  const cards = BOARD_ROWS[mode].map((n) => rest.splice(0, n));
  return { mode, cards, up: cards.map((r) => r.map(() => false)), path: [], deck: rest, attempt: 1, drunk: 0, drawn: 0, done: false };
}

/** Slots the driver may pick in the next row. */
export function allowedSlots(s: BoardState): number[] {
  const row = s.path.length;
  if (row >= BOARD_ROWS[s.mode].length) return [];
  const size = BOARD_ROWS[s.mode][row];
  if (size === 1) return [0];
  if (s.mode === 'zigzag') return [0, 1];
  // Diamond: follow the road, only the cards touching the one picked below.
  if (row === 1) return [0, 1];
  if (row === 2) return [s.path[1], s.path[1] + 1]; // 3-row: the two above the pick
  if (row === 3) return [s.path[2] - 1, s.path[2]].filter((i) => i === 0 || i === 1); // 2-row above the 3-row
  return [0];
}

export interface BoardStep {
  state: BoardState;
  card: Card;
  outcome: Outcome;
  sips: number;
  /** The board as it looked with this card turned, before a miss covers the cards again. */
  shown: { cards: Card[][]; up: boolean[][]; path: number[] };
  reshuffled: boolean;
}

export function answerBoard(s: BoardState, slot: number, guess: BoardGuess, freshDeck: () => Card[] = () => shuffle(newDeck())): BoardStep | null {
  if (s.done || !allowedSlots(s).includes(slot)) return null;
  const row = s.path.length;
  if (BOARD_QUESTIONS[s.mode][row] !== guess.q) return null;
  const card = s.cards[row][slot];

  let outcome: Outcome;
  if (guess.q === 'color') outcome = cardColor(card) === guess.color ? 'correct' : 'wrong';
  else {
    const prev = s.cards[row - 1][s.path[row - 1]];
    if (card.value === prev.value) outcome = 'same';
    else outcome = (guess.dir === 'higher') === card.value > prev.value ? 'correct' : 'wrong';
  }
  const sips = outcome === 'same' ? (row + 1) * 2 : row + 1;

  const up = s.up.map((r) => [...r]);
  up[row][slot] = true;
  const path = [...s.path, slot];
  const shown = { cards: s.cards, up, path };

  if (outcome === 'correct') {
    const done = path.length === BOARD_ROWS[s.mode].length;
    return { state: { ...s, up, path, drawn: s.drawn + 1, done }, card, outcome, sips: 0, shown, reshuffled: false };
  }

  // Miss: cover every turned card with a new one from the deck and start over.
  let deck = [...s.deck];
  let reshuffled = false;
  const cards = s.cards.map((r) => [...r]);
  up.forEach((r, ri) =>
    r.forEach((isUp, si) => {
      if (!isUp) return;
      if (!deck.length) {
        const onBoard = new Set(cards.flat().map(key));
        deck = freshDeck().filter((c) => !onBoard.has(key(c)));
        reshuffled = true;
      }
      cards[ri][si] = deck.shift()!;
    }),
  );
  return {
    state: { ...s, cards, up: cards.map((r) => r.map(() => false)), path: [], deck, attempt: s.attempt + 1, drunk: s.drunk + sips, drawn: s.drawn + 1 },
    card,
    outcome,
    sips,
    shown,
    reshuffled,
  };
}
