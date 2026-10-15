import { newDeck, SUITS, type Card, type Suit } from '../../lib/cards';
import { shuffle } from '../../lib/random';

/*
 * Horse race – rules
 * - The four Aces are the horses, side by side at the start.
 * - Next to the track lies one face-down card per row.
 * - Everyone bets on a suit. Then the rest of the deck is turned over, card by card:
 *   the Ace of that suit moves up one row.
 * - The first Ace to reach a row whose side card is still face down turns it over, and the
 *   Ace of that card's suit moves up too (before the next card from the deck). Whoever bet on
 *   the Ace that reached the row gives out sips: as many as the row number.
 * - The first Ace past the top row wins. Its backers give out twice the sips they staked;
 *   everyone who bet on another suit drinks their stake.
 * - An Ace nobody bet on doesn't win: it's through, and the race goes on until an Ace
 *   somebody bet on crosses the line. Its cards from then on move nothing.
 */

export const ROW_OPTIONS = [5, 6, 7, 8];
export const DEFAULT_ROWS = 6;

export type Step =
  | { kind: 'draw'; card: Card }
  /** A side card turned over because `by` reached its row. */
  | { kind: 'side'; card: Card; row: number; by: Suit };

export interface Race {
  rows: number;
  /** How far each Ace is: 0 = start, 1…rows = the rows, rows + 1 = past the finish line. */
  pos: Record<Suit, number>;
  /** One face-down card per row, side[0] next to row 1. */
  side: { card: Card; open: boolean }[];
  deck: Card[];
  /** Side cards waiting to be turned over, with the Ace that reached them. */
  queue: { row: number; by: Suit }[];
  last: Step | null;
  winner: Suit | null;
  /** The suits somebody bet on: only those can win. */
  backed: Suit[];
  /** Aces nobody bet on that are past the finish line, first one first. */
  through: Suit[];
  /** What the last card did besides moving an Ace up: took an Ace nobody bet on through, or moved nothing (its Ace was through already). */
  note: 'through' | 'done' | null;
  /** Every card turned over so far (newest last), for the history strip. */
  log: Step[];
}

const ACE = 14;

export function newRace(rows = DEFAULT_ROWS, deck: Card[] = shuffle(newDeck()), backed: Suit[] = [...SUITS]): Race {
  const rest = deck.filter((c) => c.value !== ACE);
  return {
    rows,
    pos: { hearts: 0, diamonds: 0, spades: 0, clubs: 0 },
    side: rest.slice(0, rows).map((card) => ({ card, open: false })),
    deck: rest.slice(rows),
    queue: [],
    last: null,
    winner: null,
    backed,
    through: [],
    note: null,
    log: [],
  };
}

/** Move an Ace up one row; queue the side card if it's the first to get there. */
function advance(r: Race, suit: Suit): Race {
  // Through already: it stays past the line.
  if (r.pos[suit] > r.rows) return { ...r, note: 'done' };
  const at = r.pos[suit] + 1;
  const pos = { ...r.pos, [suit]: at };
  if (at > r.rows) {
    if (r.backed.includes(suit)) return { ...r, pos, winner: suit, queue: [] };
    // Nobody bet on it: it's through, and the race goes on.
    return { ...r, pos, through: [...r.through, suit], note: 'through' };
  }
  const side = r.side[at - 1];
  const queued = r.queue.some((q) => q.row === at);
  return { ...r, pos, queue: !side.open && !queued ? [...r.queue, { row: at, by: suit }] : r.queue };
}

/** One thing happens: a waiting side card is turned over, or else the next card from the deck. */
export function step(r: Race): Race {
  if (r.winner) return r;
  const [next, ...queue] = r.queue;
  if (next) {
    const card = r.side[next.row - 1].card;
    const s: Step = { kind: 'side', card, row: next.row, by: next.by };
    const opened: Race = { ...r, note: null, queue, side: r.side.map((x, i) => (i === next.row - 1 ? { ...x, open: true } : x)), last: s, log: [...r.log, s] };
    return advance(opened, card.suit);
  }
  const [card, ...deck] = r.deck;
  if (!card) return r;
  const s: Step = { kind: 'draw', card };
  return advance({ ...r, note: null, deck, last: s, log: [...r.log, s] }, card.suit);
}

/** Sips the backers of an Ace give out when it turns over the side card in this row. */
export const sipsForRow = (row: number) => row;

/** Everyone stakes sips on their horse before the race. */
export const STAKE_MIN = 1;
export const STAKE_MAX = 10;
export const DEFAULT_STAKE = 1;

/** A winning bet gives out twice its stake (a losing one drinks the stake). */
export const winnings = (stake: number) => stake * 2;

/** The leading Aces, for the commentary. */
export const leaders = (r: Race) => {
  const best = Math.max(...SUITS.map((s) => r.pos[s]));
  return SUITS.filter((s) => r.pos[s] === best);
};
